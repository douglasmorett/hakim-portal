/**
 * POST /api/admin/pay-via-pix
 * Realiza transferência PIX do saldo Asaas para a chave cadastrada (cartão de crédito).
 * Somente ADMIN.
 *
 * Body: { payableId: string }
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAsaasKey } from "@/lib/asaas";

const ASAAS_BASE = "https://api.asaas.com/v3";

const PIX_TYPE_MAP: Record<string, string> = {
  CPF:    "CPF",
  CNPJ:   "CNPJ",
  EMAIL:  "EMAIL",
  PHONE:  "PHONE",
  RANDOM: "EVP",
};

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const asaasKey = getAsaasKey();
  if (!asaasKey) return NextResponse.json({ error: "ASAAS_API_KEY não configurada" }, { status: 503 });

  const { payableId } = await req.json();
  if (!payableId) return NextResponse.json({ error: "payableId obrigatório" }, { status: 400 });

  // Busca a conta com o cartão relacionado
  const payable = await prisma.payable.findUnique({
    where: { id: payableId },
    include: { creditCard: true },
  });

  if (!payable) return NextResponse.json({ error: "Conta não encontrada" }, { status: 404 });
  if (payable.status === "PAID") return NextResponse.json({ error: "Esta conta já foi paga" }, { status: 400 });

  // Pega a chave PIX — pode vir do cartão relacionado ou direto na conta
  const pixKey     = payable.creditCard?.pixKey || payable.pixKey;
  const pixKeyType = payable.creditCard?.pixKeyType || payable.pixKeyType || "CPF";
  const pixName    = payable.creditCard?.name || payable.pixKeyName || payable.supplierName;

  if (!pixKey) {
    return NextResponse.json({
      error: "Nenhuma chave PIX cadastrada para esta conta. Cadastre a chave PIX do cartão.",
    }, { status: 400 });
  }

  const asaasKeyType = PIX_TYPE_MAP[pixKeyType] || "CPF";

  // Realiza a transferência PIX no Asaas
  const transferRes = await fetch(`${ASAAS_BASE}/transfers`, {
    method: "POST",
    headers: {
      "access_token": asaasKey,
      "Content-Type": "application/json",
      "User-Agent": "hakim-portal/1.0",
    },
    body: JSON.stringify({
      value:         payable.value,
      operationType: "PIX",
      pixAddressKey: pixKey,
      pixAddressKeyType: asaasKeyType,
      description:   `Pgto fatura ${pixName} - ${payable.supplierName}`,
      scheduleDate:  new Date().toISOString().split("T")[0],
    }),
  });

  const transferData = await transferRes.json();

  if (!transferRes.ok) {
    const msg = transferData?.errors?.[0]?.description
      || transferData?.error
      || "Erro ao processar PIX no Asaas.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  // Marca como pago no banco
  await prisma.payable.update({
    where: { id: payableId },
    data: {
      status:     "PAID",
      paidDate:   new Date(),
      asaasPayId: transferData.id,
    },
  });

  console.log(`[pay-via-pix] ✅ PIX ${pixKey} R$${payable.value} — Transfer: ${transferData.id}`);

  return NextResponse.json({
    success: true,
    transferId: transferData.id,
    status:     transferData.status,
    value:      transferData.value,
    pixKey,
    message:    `✅ PIX de R$ ${payable.value.toFixed(2).replace(".", ",")} enviado para ${pixName}!`,
  });
}
