import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

// POST /api/admin/fix-boleto - Fix boleto URLs after Asaas recreation
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { orderId, asaasPaymentId, boletoUrl, newTotal } = await req.json();

  if (!orderId || !asaasPaymentId) {
    return NextResponse.json({ error: "orderId e asaasPaymentId obrigatórios" }, { status: 400 });
  }

  const updateData: any = { asaasPaymentId, boletoUrl };
  if (newTotal) updateData.totalAmount = newTotal;

  const order = await prisma.order.update({
    where: { id: orderId },
    data: updateData
  });

  return NextResponse.json({ success: true, order: { id: order.id, totalAmount: order.totalAmount, asaasPaymentId: order.asaasPaymentId, boletoUrl: order.boletoUrl } });
}
