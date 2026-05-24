/**
 * POST /api/admin/fix-boleto
 * 
 * Recria o boleto no Asaas para um pedido que teve o valor alterado.
 * Cancela o boleto antigo e gera um novo com o totalAmount atual.
 * 
 * Body: { orderId: string }
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAsaasPayment } from "@/lib/asaas";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session || (role !== "ADMIN" && role !== "STAFF")) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { orderId } = await req.json();
  if (!orderId) {
    return NextResponse.json({ error: "orderId é obrigatório" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { user: true },
  });

  if (!order) {
    return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });
  }

  // 1. Cancelar boleto antigo no Asaas
  const asaasKey = process.env.ASAAS_API_KEY;
  if (!asaasKey) {
    return NextResponse.json({ error: "ASAAS_API_KEY não configurada" }, { status: 500 });
  }

  const ASAAS_URL = asaasKey.startsWith("$aact_prod")
    ? "https://api.asaas.com/v3"
    : "https://sandbox.asaas.com/v3";

  if (order.asaasPaymentId) {
    try {
      await fetch(`${ASAAS_URL}/payments/${order.asaasPaymentId}`, {
        method: "DELETE",
        headers: { access_token: asaasKey, "User-Agent": "hakim-portal/1.0" },
      });
    } catch (e) {
      console.warn("[fix-boleto] Erro ao cancelar pagamento antigo:", e);
    }
  }

  // 2. Gerar novo boleto com valor atualizado
  const shortId = order.id.slice(-6).toUpperCase();
  const description = order.emergencyFine > 0
    ? `Pedido Emergência #${shortId} — Taxa de emergência de 30% cobrada conforme termos aceitos pelo cliente no site. — Hakim Congelados`
    : `Pedido #${shortId} — Hakim Congelados`;

  const asaasResult = await createAsaasPayment({
    userName: order.user.name || order.user.email || "",
    userEmail: order.user.email || "",
    cpfCnpj: order.user.cpfCnpj || "",
    totalAmount: order.totalAmount,
    orderId: order.id,
    description,
  });

  if (!asaasResult) {
    return NextResponse.json({ error: "Falha ao gerar novo boleto no Asaas" }, { status: 500 });
  }

  // 3. Atualizar pedido
  await prisma.order.update({
    where: { id: order.id },
    data: {
      boletoUrl: asaasResult.boletoUrl,
      asaasPaymentId: asaasResult.paymentId,
    },
  });

  // 4. Registrar no histórico
  await prisma.orderHistory.create({
    data: {
      orderId: order.id,
      statusFrom: order.status,
      statusTo: order.status,
      actionBy: session.user?.name || "Admin",
      actionEmail: session.user?.email || "",
      notes: `Boleto recriado. Novo link gerado para R$ ${order.totalAmount.toFixed(2)}.`,
    },
  });

  return NextResponse.json({
    success: true,
    newPaymentId: asaasResult.paymentId,
    newBoletoUrl: asaasResult.boletoUrl,
    totalAmount: order.totalAmount,
  });
}
