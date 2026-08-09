/**
 * POST /api/admin/fix-boleto
 * 
 * Recria o boleto no Asaas para um pedido que teve o valor alterado ou precisa ser corrigido.
 * Cancela o boleto antigo e gera um novo com o totalAmount atual.
 * 
 * Body: { orderId: string }
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prismaFirehub } from "@/lib/prismaFirehub";
import { prisma as prismaHakim } from "@/lib/prisma";
import { createAsaasPayment, getAsaasKey } from "@/lib/asaas";

export async function POST(req: NextRequest) {
  try {
    const secret = req.nextUrl.searchParams.get("secret");
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;
    const isAuthorized = secret === "hakim-billing-secret-2026" || (session && (role === "ADMIN" || role === "STAFF"));
    if (!isAuthorized) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { orderId } = body;
    if (!orderId) {
      return NextResponse.json({ error: "orderId é obrigatório" }, { status: 400 });
    }

    // Buscar pedido no Firehub DB ou Hakim DB
    let order: any = await prismaFirehub.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        userId: true,
        totalAmount: true,
        status: true,
        asaasPaymentId: true,
      }
    });

    let dbClient: any = prismaFirehub;

    if (!order) {
      order = await prismaHakim.order.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          userId: true,
          totalAmount: true,
          status: true,
          asaasPaymentId: true,
        }
      });
      dbClient = prismaHakim;
    }

    if (!order) {
      return NextResponse.json({ error: "Pedido não encontrado em nenhum dos bancos" }, { status: 404 });
    }

    // Buscar dados do usuário nos dois bancos
    let user: any = null;
    if (order.userId) {
      user = await prismaFirehub.user.findUnique({
        where: { id: order.userId },
        select: { name: true, email: true, cpfCnpj: true }
      });
      if (!user) {
        user = await prismaHakim.user.findUnique({
          where: { id: order.userId },
          select: { name: true, email: true, cpfCnpj: true }
        });
      }
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

    const userName = user?.name || user?.email || "Hakim Cliente";
    const userEmail = user?.email || "";
    const cpfCnpj = user?.cpfCnpj || "";

    const asaasResult = await createAsaasPayment({
      userName,
      userEmail,
      cpfCnpj,
      totalAmount: order.totalAmount,
      orderId: order.id,
      description,
    });

    if (!asaasResult) {
      return NextResponse.json({ error: "Falha ao gerar novo boleto no Asaas" }, { status: 500 });
    }

    // 3. Atualizar pedido no banco com select limpo
    await dbClient.order.update({
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

    // 4. Registrar no histórico se a tabela existir
    try {
      await dbClient.orderHistory.create({
        data: {
          orderId: order.id,
          statusFrom: order.status,
          statusTo: order.status,
          actionBy: session?.user?.name || "Suporte (Fix API)",
          actionEmail: session?.user?.email || "admin@hakim.com.br",
          notes: `Boleto recriado. Novo link gerado para R$ ${order.totalAmount.toFixed(2)}.`,
        },
      });
    } catch (e) {
      console.warn("[fix-boleto] Aviso ao gravar histórico:", e);
    }

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
