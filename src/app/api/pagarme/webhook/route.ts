/**
 * POST /api/pagarme/webhook
 * Recebe notificações do Pagar.me sobre status de pagamentos
 * 
 * Configurar em: dashboard.pagar.me → Configurações → Webhooks
 * URL: https://seudominio.com/api/pagarme/webhook
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseWebhookEvent } from "@/lib/pagarme";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("[Pagar.me Webhook]", body.type, body.data?.id);

    const event = parseWebhookEvent(body);

    if (!event.orderId) {
      return NextResponse.json({ received: true });
    }

    if (event.type === "payment_paid") {
      await prisma.customerOrder.updateMany({
        where: { id: event.orderId, pagarmeStatus: { not: "paid" } },
        data: {
          pagarmeStatus: "paid",
          paymentPaidAt: new Date(),
          status: "ACEITO", // Pedido confirmado automaticamente ao pagar
        }
      });
      console.log(`[Pagar.me] Pedido ${event.orderId} PAGO — status atualizado para ACEITO`);
    }

    if (event.type === "payment_failed") {
      await prisma.customerOrder.updateMany({
        where: { id: event.orderId },
        data: {
          pagarmeStatus: "failed",
          status: "CANCELADO",
        }
      });
      console.log(`[Pagar.me] Pedido ${event.orderId} FALHOU`);
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("[Pagar.me Webhook Error]", err);
    // Sempre retornar 200 para o Pagar.me não retentar em cascata
    return NextResponse.json({ received: true, error: err.message });
  }
}
