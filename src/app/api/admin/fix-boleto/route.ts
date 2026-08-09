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
import { prismaFirehub as prisma } from "@/lib/prismaFirehub";
import { createAsaasPayment, getAsaasKey } from "@/lib/asaas";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;
    if (!session || (role !== "ADMIN" && role !== "STAFF")) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { orderId } = body;
    if (!orderId) {
      return NextResponse.json({ error: "orderId é obrigatório" }, { status: 400 });
    }

    // Usar select explícito compatível com Firehub DB
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        totalAmount: true,
        status: true,
        asaasPaymentId: true,
        user: {
          select: {
            name: true,
            email: true,
            cpfCnpj: true
          }
        }
      }
    });

    if (!order) {
      return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });
    }

    // 1. Cancelar boleto antigo no Asaas
    const asaasKey = getAsaasKey();
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

    // 2. Gerar novo boleto com valor atualizado do banco
    const shortId = order.id.slice(-6).toUpperCase();
    const description = `Pedido #${shortId} — Icebox Congelados`;

    const asaasResult = await createAsaasPayment({
      userName: order.user?.name || order.user?.email || "",
      userEmail: order.user?.email || "",
      cpfCnpj: order.user?.cpfCnpj || "",
      totalAmount: order.totalAmount,
      orderId: order.id,
      description,
    });

    if (!asaasResult) {
      return NextResponse.json({ error: "Falha ao gerar novo boleto no Asaas" }, { status: 500 });
    }

    // 3. Atualizar pedido no banco
    await prisma.order.update({
      where: { id: order.id },
      data: {
        boletoUrl: asaasResult.boletoUrl,
        asaasPaymentId: asaasResult.paymentId,
      },
      select: {
        id: true,
        boletoUrl: true,
        asaasPaymentId: true,
      }
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
  } catch (error: any) {
    console.error("[fix-boleto] Erro interno:", error);
    return NextResponse.json({ error: error?.message || "Erro ao recriar boleto" }, { status: 500 });
  }
}
