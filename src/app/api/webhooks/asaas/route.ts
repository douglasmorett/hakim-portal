/**
 * POST /api/webhooks/asaas
 * Webhook do Asaas — atualiza status do pedido automaticamente quando o pagamento é confirmado.
 *
 * Eventos tratados:
 *  - PAYMENT_CONFIRMED  → PAID (pagamento confirmado)
 *  - PAYMENT_RECEIVED   → PAID (boleto compensado)
 *  - PAYMENT_OVERDUE    → mantém PENDING_PAYMENT (apenas log)
 *  - PAYMENT_DELETED    → CANCELADO
 *  - PAYMENT_REFUNDED   → CANCELADO
 *
 * Configure no painel do Asaas:
 *   Configurações → Integrações → Webhooks → URL: https://hakim-portal-8umjlo6jv-grupohakim.vercel.app/api/webhooks/asaas
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { event, payment } = body;

    if (!payment?.id) {
      return NextResponse.json({ received: true, skipped: "no payment id" });
    }

    const asaasPaymentId = payment.id;

    // Mapeia evento do Asaas para status do FireHub
    let newStatus: string | null = null;

    if (event === "PAYMENT_CONFIRMED" || event === "PAYMENT_RECEIVED") {
      newStatus = "PAID";
    } else if (event === "PAYMENT_DELETED" || event === "PAYMENT_REFUNDED" || event === "PAYMENT_CHARGEBACK_REQUESTED") {
      newStatus = "CANCELADO";
    }

    if (!newStatus) {
      // Evento não mapeado — só confirma recebimento
      console.log(`[Asaas Webhook] Evento não mapeado: ${event} | Payment: ${asaasPaymentId}`);
      return NextResponse.json({ received: true, event, action: "noop" });
    }

    // Busca o pedido pelo ID do Asaas
    const order = await prisma.order.findFirst({
      where: { asaasPaymentId },
      select: { id: true, status: true, userId: true },
    });

    if (!order) {
      console.warn(`[Asaas Webhook] Pedido não encontrado para payment: ${asaasPaymentId}`);
      return NextResponse.json({ received: true, warning: "order not found" });
    }

    // Não volta atrás (ex: já PAID → não cancela por um evento antigo)
    if (order.status === "PAID" && newStatus === "CANCELADO") {
      return NextResponse.json({ received: true, skipped: "order already paid, ignoring cancel" });
    }

    // Atualiza o status
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: newStatus,
        ...(newStatus === "PAID" ? { updatedAt: new Date() } : {}),
      },
    });

    // Registra no histórico
    await prisma.orderHistory.create({
      data: {
        orderId:     order.id,
        statusFrom:  order.status,
        statusTo:    newStatus,
        actionBy:    "ASAAS_WEBHOOK",
        actionEmail: "webhook@asaas.com",
        notes:       `Evento automático Asaas: ${event}`,
      },
    });

    console.log(`[Asaas Webhook] ✅ Pedido ${order.id} → ${newStatus} (evento: ${event})`);

    return NextResponse.json({
      received: true,
      orderId: order.id,
      newStatus,
      event,
    });

  } catch (err: any) {
    console.error("[Asaas Webhook] Erro:", err.message);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// O Asaas pode enviar GET para verificar se o endpoint está ativo
export async function GET() {
  return NextResponse.json({ status: "Asaas webhook ativo ✅", endpoint: "/api/webhooks/asaas" });
}
