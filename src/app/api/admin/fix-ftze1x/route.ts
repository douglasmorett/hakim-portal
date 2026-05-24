/**
 * API temporária para corrigir cobranças Asaas do pedido #FTZE1X
 * 
 * AÇÃO: Deleta as cobranças antigas com valor errado e cria uma nova com R$ 7.902,44
 * 
 * REMOVER APÓS USO!
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const CORRECT_VALUE = 7902.44;
const ORDER_ID = "cmpfuky0d0001kt0bqdftze1x";
const CUSTOMER_CPFCNPJ = "65703775000179";
const FIX_TOKEN = "hakim-fix-ftze1x-2026";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  
  if (token !== FIX_TOKEN) {
    return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  }

  const asaasKey = process.env.ASAAS_API_KEY;
  if (!asaasKey) {
    return NextResponse.json({ error: "ASAAS_API_KEY não configurada" }, { status: 500 });
  }

  const BASE = asaasKey.startsWith("$aact_prod")
    ? "https://api.asaas.com/v3"
    : "https://sandbox.asaas.com/v3";

  const headers: Record<string, string> = {
    "access_token": asaasKey,
    "Content-Type": "application/json",
  };

  const log: string[] = [];

  try {
    // 1. Buscar o cliente no Asaas pelo CPF/CNPJ
    log.push("Buscando cliente no Asaas...");
    const custRes = await fetch(
      `${BASE}/customers?cpfCnpj=${CUSTOMER_CPFCNPJ}`,
      { headers }
    );
    const custData = await custRes.json();

    if (!custRes.ok || !custData.data?.length) {
      return NextResponse.json({ error: "Cliente nao encontrado no Asaas", details: custData, log }, { status: 404 });
    }

    const customerId = custData.data[0].id;
    const customerName = custData.data[0].name;
    log.push(`Cliente: ${customerName} (${customerId})`);

    // 2. Listar todas as cobranças desse cliente
    log.push("Listando cobrancas do cliente...");
    const payRes = await fetch(
      `${BASE}/payments?customer=${customerId}&limit=50`,
      { headers }
    );
    const payData = await payRes.json();

    if (!payRes.ok) {
      return NextResponse.json({ error: "Erro ao listar cobrancas", details: payData, log }, { status: 500 });
    }

    log.push(`Total cobrancas do cliente: ${payData.data?.length || 0}`);

    // Listar todas para debug
    for (const p of (payData.data || [])) {
      log.push(`  ${p.id} | R$ ${p.value} | ${p.status} | ${p.description?.substring(0, 60) || 'N/A'} | Venc: ${p.dueDate}`);
    }

    // 3. Identificar cobranças com valor R$ 6.078,80 ou referência FTZE1X
    const targetPayments = (payData.data || []).filter((p: any) =>
      (Math.abs(p.value - 6078.80) < 0.01) ||
      (p.description?.toUpperCase()?.includes("FTZ")) ||
      (p.externalReference === ORDER_ID) ||
      (p.externalReference?.includes("ftze1x"))
    );

    log.push(`Cobrancas para deletar: ${targetPayments.length}`);

    // 4. Deletar as cobranças erradas
    const deletedIds: string[] = [];
    const failedDeletes: string[] = [];
    
    for (const p of targetPayments) {
      log.push(`Deletando ${p.id} (R$ ${p.value}, status: ${p.status})...`);
      const delRes = await fetch(`${BASE}/payments/${p.id}`, {
        method: "DELETE",
        headers,
      });
      
      if (delRes.ok) {
        log.push(`  OK - Deletada`);
        deletedIds.push(p.id);
      } else {
        const delData = await delRes.json().catch(() => ({}));
        log.push(`  ERRO: ${JSON.stringify(delData)}`);
        failedDeletes.push(p.id);
      }
    }

    // 5. Criar nova cobrança com valor correto R$ 7.902,44
    log.push(`Criando nova cobranca com R$ ${CORRECT_VALUE}...`);

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
        description: `Pedido de Emergência #FTZE1X — Hakim Congelados (taxa emergência 30% inclusa)`,
        externalReference: ORDER_ID,
      }),
    });

    const newPayData = await newPayRes.json();

    if (!newPayRes.ok) {
      return NextResponse.json({ error: "Erro ao criar nova cobranca", details: newPayData, log }, { status: 500 });
    }

    const newPaymentId = newPayData.id;
    const newBoletoUrl = newPayData.invoiceUrl || newPayData.bankSlipUrl || null;
    log.push(`Nova cobranca criada: ${newPaymentId}`);
    log.push(`URL boleto: ${newBoletoUrl}`);

    // 6. Atualizar o pedido no banco de dados
    log.push("Atualizando pedido no banco...");
    await prisma.order.update({
      where: { id: ORDER_ID },
      data: {
        asaasPaymentId: newPaymentId,
        boletoUrl: newBoletoUrl,
      },
    });
    log.push("Pedido atualizado!");

    return NextResponse.json({
      success: true,
      deletedPayments: deletedIds,
      failedDeletes,
      newPayment: {
        id: newPaymentId,
        value: CORRECT_VALUE,
        boletoUrl: newBoletoUrl,
      },
      log,
    });
  } catch (error: any) {
    log.push(`ERRO: ${error.message}`);
    return NextResponse.json({ error: error.message, log }, { status: 500 });
  }
}
