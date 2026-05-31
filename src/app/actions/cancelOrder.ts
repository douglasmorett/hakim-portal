"use server";

import { prisma } from "@/lib/prisma";
import { prismaFirehub } from "@/lib/prismaFirehub";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

// Colunas seguras que existem em AMBOS os bancos
const FIREHUB_ORDER_SELECT = {
  id: true, userId: true, totalAmount: true, status: true,
  createdAt: true, updatedAt: true,
};

export async function cancelOrder(orderId: string, adminPassword?: string, reason?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;

    if (!session || !session.user || (role !== "ADMIN" && role !== "STAFF")) {
      return { success: false, error: "Não autorizado." };
    }

    if (!adminPassword) {
      return { success: false, error: "Senha de acesso não fornecida." };
    }

    if (!reason) {
      return { success: false, error: "O motivo do cancelamento é obrigatório." };
    }

    // Buscar o usuário logado para validar a senha
    let currentUser = await prisma.user.findUnique({
      where: { email: session.user.email! }
    }).catch((err) => { console.error("[cancelOrder] Erro busca user principal:", err.message); return null; });

    if (!currentUser) {
      currentUser = await prismaFirehub.user.findUnique({
        where: { email: session.user.email! },
        select: { id: true, name: true, email: true, password: true }
      }).catch((err) => { console.error("[cancelOrder] Erro busca user firehub:", err.message); return null; });
    }

    if (!currentUser) {
      return { success: false, error: "Usuário não encontrado." };
    }

    // Verifica a senha
    const passwordMatch = await bcrypt.compare(adminPassword, currentUser.password);
    if (!passwordMatch) {
      return { success: false, error: "Senha incorreta. O pedido não foi cancelado." };
    }

    // Buscar o pedido — tenta banco principal primeiro (com todas as colunas)
    let order: any = await prisma.order.findUnique({
      where: { id: orderId }
    }).catch((err) => { console.error("[cancelOrder] Erro busca order principal:", err.message); return null; });

    let source: "hakim" | "firehub" = "hakim";

    if (!order) {
      // FireHub: usar SELECT explícito — só colunas que existem nesse banco
      order = await prismaFirehub.order.findUnique({
        where: { id: orderId },
        select: FIREHUB_ORDER_SELECT,
      }).catch((err) => { console.error("[cancelOrder] Erro busca order firehub:", err.message); return null; });
      source = "firehub";
    }

    if (!order) {
      return { success: false, error: "Pedido não encontrado." };
    }

    const oldStatus = order.status;

    if (oldStatus === "CANCELADO") {
      return { success: false, error: "Pedido já está cancelado." };
    }

    // Se o pedido possui um ID de pagamento no Asaas, tentamos cancelar lá primeiro
    if (order.asaasPaymentId) {
      const asaasKey = process.env.ASAAS_API_KEY;
      if (asaasKey) {
        const ASAAS_URL = asaasKey.startsWith("$aact_prod")
          ? "https://api.asaas.com/v3"
          : "https://sandbox.asaas.com/v3";

        try {
          const res = await fetch(`${ASAAS_URL}/payments/${order.asaasPaymentId}`, {
            method: "DELETE",
            headers: { "access_token": asaasKey, "User-Agent": "HakimPortal/1.0" }
          });
          const data = await res.json();
          if (!res.ok && data.errors && data.errors[0]?.code !== "invalid_action") {
            console.warn("[cancelOrder] Aviso Asaas:", data.errors);
          }
        } catch (asaasErr) {
          console.warn("[cancelOrder] Erro Asaas (ignorado):", asaasErr);
        }
      }
    }

    // Atualizar status do pedido
    const dbClient = source === "hakim" ? prisma : prismaFirehub;
    
    if (source === "hakim") {
      // Banco principal — tem cancelReason
      await dbClient.order.update({
        where: { id: orderId },
        data: { status: "CANCELADO", cancelReason: reason }
      });
    } else {
      // FireHub — só atualiza status (cancelReason pode não existir)
      try {
        await dbClient.order.update({
          where: { id: orderId },
          data: { status: "CANCELADO", cancelReason: reason }
        });
      } catch {
        // Se falhar com cancelReason, tenta sem
        await dbClient.order.update({
          where: { id: orderId },
          data: { status: "CANCELADO" }
        });
      }
    }

    // Registrar histórico
    const historyData = {
      orderId,
      statusFrom: oldStatus,
      statusTo: "CANCELADO",
      actionBy: session.user?.name || "Sistema",
      actionEmail: session.user?.email || "",
      notes: reason
    };

    try {
      await dbClient.orderHistory.create({ data: historyData });
    } catch {
      // Fallback: tenta no banco principal
      try {
        await prisma.orderHistory.create({ data: historyData });
      } catch (e) {
        console.warn("[cancelOrder] Não conseguiu criar histórico:", e);
      }
    }

    revalidatePath("/admin/orders");
    revalidatePath("/store/orders");

    return { success: true };
  } catch (err: any) {
    console.error("[cancelOrder] Erro fatal:", err);
    return { success: false, error: err.message || "Erro interno ao cancelar pedido." };
  }
}
