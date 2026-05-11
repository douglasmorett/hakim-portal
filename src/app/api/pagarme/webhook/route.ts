/**
 * POST /api/pagarme/webhook
 * Recebe notificações do Pagar.me sobre status de pagamentos.
 * 
 * Ao confirmar pagamento → atualiza pedido + abate do ciclo mensal do franqueado.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseWebhookEvent } from "@/lib/pagarme";
import { applyOnlinePaymentOffset } from "@/lib/billing";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("[Pagar.me Webhook]", body.type, body.data?.id);

    const event = parseWebhookEvent(body);

    if (!event.orderId) {
      return NextResponse.json({ received: true });
    }

    if (event.type === "payment_paid") {
      // 1. Busca o pedido para obter franchiseeId e valor
      const order = await prisma.customerOrder.findUnique({
        where: { id: event.orderId },
        select: { id: true, franchiseeId: true, totalAmount: true, pagarmeStatus: true, pagarmeOrderId: true },
      });

      // 2. Atualiza o status do pedido
      await prisma.customerOrder.updateMany({
        where: { id: event.orderId, pagarmeStatus: { not: "paid" } },
        data: {
          pagarmeStatus: "paid",
          paymentPaidAt: new Date(),
          status: "ACEITO",
        },
      });

      console.log(`[Pagar.me] Pedido ${event.orderId} PAGO — status atualizado para ACEITO`);

      // 3. Abate o valor do ciclo mensal do franqueado (Use First, Pay Later)
      if (order && order.franchiseeId) {
        try {
          await applyOnlinePaymentOffset({
            franchiseeId: order.franchiseeId,
            orderId: order.id,
            paidAmount: order.totalAmount,
            pagarmeOrderId: order.pagarmeOrderId ?? undefined,
          });
          console.log(`[Billing] Abatimento aplicado: R$${order.totalAmount} para franqueado ${order.franchiseeId}`);
        } catch (billingErr) {
          // Não falha o webhook por erro de billing — loga e segue
          console.error("[Billing] Erro ao aplicar abatimento:", billingErr);
        }
      }
    }

    if (event.type === "payment_failed") {
      await prisma.customerOrder.updateMany({
        where: { id: event.orderId },
        data: {
          pagarmeStatus: "failed",
          status: "CANCELADO",
        },
      });
      console.log(`[Pagar.me] Pedido ${event.orderId} FALHOU`);
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("[Pagar.me Webhook Error]", err);
    return NextResponse.json({ received: true, error: err.message });
  }
}
