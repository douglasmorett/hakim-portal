/**
 * POST /api/admin/pay-via-asaas
 * Paga uma conta (boleto) diretamente do saldo da conta Asaas.
 * Somente ADMIN pode usar este endpoint.
 *
 * Body: { payableId: string }
 *
 * Fluxo:
 *  1. Busca o Payable no banco (precisa ter barcode)
 *  2. Chama POST /v3/bill-payment no Asaas com o código de barras
 *  3. Se sucesso, marca o Payable como PAID no banco
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ASAAS_BASE = "https://api.asaas.com/v3";

export async function POST(req: NextRequest) {
  // Só ADMIN pode pagar via Asaas
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const asaasKey = process.env.ASAAS_API_KEY;
  if (!asaasKey) {
    return NextResponse.json({ error: "ASAAS_API_KEY não configurada" }, { status: 503 });
  }

  const { payableId } = await req.json();
  if (!payableId) {
    return NextResponse.json({ error: "payableId obrigatório" }, { status: 400 });
  }

  // Busca o registro da conta a pagar
  const payable = await prisma.payable.findUnique({ where: { id: payableId } });
  if (!payable) {
    return NextResponse.json({ error: "Conta não encontrada" }, { status: 404 });
  }
  if (payable.status === "PAID") {
    return NextResponse.json({ error: "Esta conta já foi paga" }, { status: 400 });
  }
  if (!payable.barcode) {
    return NextResponse.json({
      error: "Esta conta não tem código de barras. Use 'Dar Baixa' para registrar manualmente.",
    }, { status: 400 });
  }

  const headers = {
    "access_token": asaasKey,
    "Content-Type": "application/json",
    "User-Agent": "hakim-portal/1.0",
  };

  // 1. Simula o pagamento no Asaas para obter valor e vencimento real
  let scheduleDate = payable.dueDate.toISOString().split("T")[0];
  // Se a data de vencimento já passou, paga hoje
  const today = new Date().toISOString().split("T")[0];
  if (scheduleDate < today) scheduleDate = today;

  // 2. Cria o pagamento de conta no Asaas
  const billRes = await fetch(`${ASAAS_BASE}/bill-payment`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      identificationField: payable.barcode.replace(/\D/g, ""),
      scheduleDate,
      description: `Pgto ${payable.supplierName} via Hakim Portal`,
    }),
  });

  const billData = await billRes.json();

  if (!billRes.ok) {
    console.error("[pay-via-asaas] Erro Asaas:", JSON.stringify(billData));
    const msg = billData?.errors?.[0]?.description
      || billData?.error
      || billData?.message
      || "Erro ao processar pagamento no Asaas.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  // 3. Marca como pago no banco
  await prisma.payable.update({
    where: { id: payableId },
    data: {
      status: "PAID",
      paidDate: new Date(),
    },
  });

  console.log(`[pay-via-asaas] ✅ ${payable.supplierName} R$${payable.value} pago via Asaas — ID: ${billData.id}`);

  return NextResponse.json({
    success: true,
    asaasId: billData.id,
    status: billData.status,
    value: billData.value,
    scheduleDate: billData.scheduleDate,
    message: `✅ Pagamento de R$ ${payable.value.toFixed(2).replace(".", ",")} agendado para ${scheduleDate}`,
  });
}
