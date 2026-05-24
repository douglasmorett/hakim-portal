/**
 * API temporária para corrigir cobranças Asaas do pedido #FTZE1X
 * 
 * AÇÃO: Deleta as cobranças antigas com valor errado e cria uma nova com R$ 7.902,44
 * 
 * SEGURANÇA: Requer autenticação de ADMIN
 * REMOVER APÓS USO!
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const CORRECT_VALUE = 7902.44;
const ORDER_ID = "cmpfuky0d0001kt0bqdftze1x";
const CUSTOMER_CPFCNPJ = "65703775000179";

export async function POST(req: Request) {
  // Verificar autenticação ADMIN
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session || role !== "ADMIN") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const asaasKey = process.env.ASAAS_API_KEY;
  if (!asaasKey) {
    return NextResponse.json({ error: "ASAAS_API_KEY não configurada" }, { status: 500 });
  }

  const BASE = asaasKey.startsWith("$aact_prod")
    ? "https://api.asaas.com/v3"
    : "https://sandbox.asaas.com/v3";

  const headers = {
    "access_token": asaasKey,
    "Content-Type": "application/json",
  };

  const log: string[] = [];

  try {
    // 1. Buscar o cliente no Asaas pelo CPF/CNPJ
    log.push("🔍 Buscando cliente no Asaas...");
    const custRes = await fetch(
      `${BASE}/customers?cpfCnpj=${CUSTOMER_CPFCNPJ}`,
      { headers }
    );
    const custData = await custRes.json();

    if (!custRes.ok || !custData.data?.length) {
      return NextResponse.json({ error: "Cliente não encontrado no Asaas", custData, log }, { status: 404 });
    }

    const customerId = custData.data[0].id;
    const customerName = custData.data[0].name;
    log.push(`✅ Cliente: ${customerName} (${customerId})`);

    // 2. Listar todas as cobranças desse cliente
    log.push("🔍 Listando cobranças do cliente...");
    const payRes = await fetch(
      `${BASE}/payments?customer=${customerId}&limit=50`,
      { headers }
    );
    const payData = await payRes.json();

    if (!payRes.ok) {
      return NextResponse.json({ error: "Erro ao listar cobranças", payData, log }, { status: 500 });
    }

    // 3. Identificar cobranças relacionadas ao pedido #FTZE1X
    // Procura por cobranças com valor R$ 6.078,80 ou que mencionem FTZ na descrição
    const ftzePayments = payData.data.filter((p: any) =>
      (Math.abs(p.value - 6078.80) < 0.01) ||
      (p.description?.includes("FTZ")) ||
      (p.externalReference === ORDER_ID) ||
      (p.externalReference?.includes("ftze1x"))
    );

    log.push(`📋 Total cobranças do cliente: ${payData.data.length}`);
    log.push(`🔴 Cobranças relacionadas ao #FTZE1X: ${ftzePayments.length}`);

    for (const p of ftzePayments) {
      log.push(`   → ${p.id} | R$ ${p.value} | ${p.status} | ${p.description}`);
    }

    // 4. Deletar as cobranças erradas (somente PENDING ou OVERDUE)
    const deletedIds: string[] = [];
    for (const p of ftzePayments) {
      if (["PENDING", "OVERDUE", "CONFIRMED"].includes(p.status)) {
        log.push(`🗑️ Deletando cobrança ${p.id} (R$ ${p.value})...`);
        const delRes = await fetch(`${BASE}/payments/${p.id}`, {
          method: "DELETE",
          headers,
        });
        if (delRes.ok) {
          log.push(`   ✅ Deletada com sucesso`);
          deletedIds.push(p.id);
        } else {
          const delData = await delRes.json();
          log.push(`   ❌ Erro ao deletar: ${JSON.stringify(delData)}`);
        }
      } else {
        log.push(`   ⚠️ Cobrança ${p.id} com status ${p.status} - não pode ser deletada`);
      }
    }

    // 5. Criar nova cobrança com valor correto
    log.push(`\n💰 Criando nova cobrança com R$ ${CORRECT_VALUE}...`);

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 10);

    const newPayRes = await fetch(`${BASE}/payments`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        customer: customerId,
        billingType: "BOLETO",
        value: CORRECT_VALUE,
        dueDate: dueDate.toISOString().split("T")[0],
        description: `Pedido de Emergência #FTZE1X — Hakim Congelados (taxa de emergência 30% inclusa)`,
        externalReference: ORDER_ID,
      }),
    });

    const newPayData = await newPayRes.json();

    if (!newPayRes.ok) {
      return NextResponse.json({ error: "Erro ao criar nova cobrança", newPayData, log }, { status: 500 });
    }

    const newPaymentId = newPayData.id;
    const newBoletoUrl = newPayData.invoiceUrl || newPayData.bankSlipUrl || null;
    log.push(`✅ Nova cobrança criada: ${newPaymentId}`);
    log.push(`   URL: ${newBoletoUrl}`);

    // 6. Atualizar o pedido no banco de dados com a nova cobrança
    log.push("📝 Atualizando pedido no banco de dados...");
    await prisma.order.update({
      where: { id: ORDER_ID },
      data: {
        asaasPaymentId: newPaymentId,
        boletoUrl: newBoletoUrl,
      },
    });
    log.push("✅ Pedido atualizado no banco!");

    return NextResponse.json({
      success: true,
      deletedPayments: deletedIds,
      newPayment: {
        id: newPaymentId,
        value: CORRECT_VALUE,
        boletoUrl: newBoletoUrl,
      },
      log,
    });
  } catch (error: any) {
    log.push(`❌ Erro: ${error.message}`);
    return NextResponse.json({ error: error.message, log }, { status: 500 });
  }
}
