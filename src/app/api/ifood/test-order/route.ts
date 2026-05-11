/**
 * GET /api/ifood/test-order?orderId=xxx
 * Busca um pedido de teste do iFood pelo ID e salva no banco.
 * Útil para testar a integração antes da homologação.
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const IFOOD_BASE = "https://merchant-api.ifood.com.br";

async function getAccessToken(): Promise<string | null> {
  const clientId     = process.env.IFOOD_CLIENT_ID;
  const clientSecret = process.env.IFOOD_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const res = await fetch(`${IFOOD_BASE}/authentication/v1.0/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grantType:    "client_credentials",
      clientId,
      clientSecret,
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.accessToken ?? null;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const orderId = req.nextUrl.searchParams.get("orderId");
  if (!orderId) {
    return NextResponse.json({ error: "orderId obrigatório" }, { status: 400 });
  }

  const token = await getAccessToken();
  if (!token) {
    return NextResponse.json({
      error: "Credenciais iFood não configuradas",
      hint: "Configure IFOOD_CLIENT_ID e IFOOD_CLIENT_SECRET no Vercel",
    }, { status: 503 });
  }

  // Busca detalhes do pedido
  const orderRes = await fetch(`${IFOOD_BASE}/order/v1.0/orders/${orderId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!orderRes.ok) {
    const err = await orderRes.text();
    return NextResponse.json({ error: "Pedido não encontrado no iFood", details: err }, { status: 404 });
  }

  const order = await orderRes.json();

  // Salva no banco como CustomerOrder para testar
  const existing = await prisma.customerOrder.findFirst({
    where: { ifoodOrderId: orderId },
  });

  if (!existing) {
    const items = order.items ?? [];
    const total = order.totalPrice ?? items.reduce((s: number, i: any) => s + i.totalPrice, 0);

    await prisma.customerOrder.create({
      data: {
        ifoodOrderId:    orderId,
        status:          "NOVO",
        origem:          "IFOOD",
        customerName:    order.customer?.name ?? "Cliente iFood",
        customerPhone:   order.customer?.phone ?? "",
        customerEmail:   order.customer?.documentNumber ?? "",
        deliveryAddress: JSON.stringify(order.delivery?.deliveryAddress ?? {}),
        total,
        paymentMethod:   order.payments?.[0]?.name ?? "iFood",
        notes:           order.merchant?.name ?? "",
        franchiseeId:    undefined,
        items: {
          create: items.map((i: any) => ({
            name:      i.name,
            quantity:  i.quantity,
            unitPrice: i.unitPrice,
            total:     i.totalPrice,
          })),
        },
      },
    });
  }

  return NextResponse.json({
    success: true,
    saved: !existing,
    order: {
      id:       orderId,
      status:   order.orderStatus,
      customer: order.customer?.name,
      total:    order.totalPrice,
      items:    order.items?.length ?? 0,
    },
  });
}
