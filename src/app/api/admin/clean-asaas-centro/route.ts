import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { prismaFirehub } from "@/lib/prismaFirehub";
import { getAsaasKey } from "@/lib/asaas";

const CRON_SECRET = "hakim-billing-secret-2026";

export async function GET(req: NextRequest) {
  try {
    const secret = req.nextUrl.searchParams.get("secret");
    if (secret !== CRON_SECRET) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const email = "viniciusmenezes.ofc@gmail.com";
    const asaasKey = getAsaasKey();
    if (!asaasKey) {
      return NextResponse.json({ error: "ASAAS_API_KEY não configurada no servidor" }, { status: 500 });
    }

    const BASE = asaasKey.startsWith("$aact_prod")
      ? "https://api.asaas.com/v3"
      : "https://sandbox.asaas.com/v3";

    console.log(`[clean-asaas-centro] Iniciando limpeza retroativa para ${email}...`);

    // 1. Encontrar o usuário nos dois bancos
    const userHakim = await prisma.user.findUnique({ where: { email } });
    const userFirehub = await prismaFirehub.user.findUnique({ where: { email } });

    const results: any = {
      hakim: { found: !!userHakim, cancelled: [], errors: [] },
      firehub: { found: !!userFirehub, cancelled: [], errors: [] }
    };

    const cancelAsaasPayment = async (paymentId: string) => {
      try {
        const res = await fetch(`${BASE}/payments/${paymentId}`, {
          method: "DELETE",
          headers: {
            "access_token": asaasKey,
            "Content-Type": "application/json",
            "User-Agent": "hakim-portal/1.0"
          }
        });
        const data = await res.json();
        return { ok: res.ok, status: res.status, data };
      } catch (err: any) {
        return { ok: false, error: err.message };
      }
    };

    // --- Processar Hakim DB ---
    if (userHakim) {
      const orders = await prisma.order.findMany({
        where: {
          userId: userHakim.id,
          asaasPaymentId: { not: null }
        },
        select: {
          id: true,
          status: true,
          asaasPaymentId: true
        }
      });

      for (const order of orders) {
        const paymentId = order.asaasPaymentId!;
        console.log(`[clean-asaas-centro] [Hakim] Cancelando asaasPaymentId ${paymentId} para o pedido ${order.id}...`);
        
        const cancelRes = await cancelAsaasPayment(paymentId);
        if (cancelRes.ok) {
          results.hakim.cancelled.push({ orderId: order.id, paymentId });
        } else {
          results.hakim.errors.push({ orderId: order.id, paymentId, error: cancelRes.error || cancelRes.data });
        }

        // Atualiza banco mesmo se der erro no cancelamento (para limpar)
        await prisma.order.update({
          where: { id: order.id },
          data: {
            asaasPaymentId: null,
            boletoUrl: null,
            status: "PAID"
          }
        });

        await prisma.orderHistory.create({
          data: {
            orderId: order.id,
            statusFrom: order.status,
            statusTo: "PAID",
            actionBy: "Admin Cleanup Endpoint",
            actionEmail: "admin@hakim.com.br",
            notes: `Cobrança Asaas (${paymentId}) cancelada retroativamente e pedido marcado como pago.`
          }
        });
      }
    }

    // --- Processar Firehub DB ---
    if (userFirehub) {
      const orders = await prismaFirehub.order.findMany({
        where: {
          userId: userFirehub.id,
          asaasPaymentId: { not: null }
        },
        select: {
          id: true,
          status: true,
          asaasPaymentId: true
        }
      });

      for (const order of orders) {
        const paymentId = order.asaasPaymentId!;
        console.log(`[clean-asaas-centro] [Firehub] Cancelando asaasPaymentId ${paymentId} para o pedido ${order.id}...`);
        
        const cancelRes = await cancelAsaasPayment(paymentId);
        if (cancelRes.ok) {
          results.firehub.cancelled.push({ orderId: order.id, paymentId });
        } else {
          results.firehub.errors.push({ orderId: order.id, paymentId, error: cancelRes.error || cancelRes.data });
        }

        // Atualiza banco
        await prismaFirehub.order.update({
          where: { id: order.id },
          data: {
            asaasPaymentId: null,
            boletoUrl: null,
            status: "PAID"
          }
        });

        await prismaFirehub.orderHistory.create({
          data: {
            orderId: order.id,
            statusFrom: order.status,
            statusTo: "PAID",
            actionBy: "Admin Cleanup Endpoint",
            actionEmail: "admin@hakim.com.br",
            notes: `Cobrança Asaas (${paymentId}) cancelada retroativamente e pedido marcado como pago.`
          }
        });
      }
    }

    return NextResponse.json({ success: true, email, results });

  } catch (error: any) {
    console.error("[clean-asaas-centro] Erro:", error);
    return NextResponse.json({ error: error.message || "Erro interno" }, { status: 500 });
  }
}
