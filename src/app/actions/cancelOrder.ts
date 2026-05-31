"use server";

import { prisma } from "@/lib/prisma";
import { prismaFirehub } from "@/lib/prismaFirehub";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

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

    // Buscar o usuário logado para validar a senha — tenta banco principal primeiro
    let currentUser = await prisma.user.findUnique({
      where: { email: session.user.email! }
    }).catch(() => null);

    if (!currentUser) {
      currentUser = await prismaFirehub.user.findUnique({
        where: { email: session.user.email! }
      }).catch(() => null);
    }

    if (!currentUser) {
      return { success: false, error: "Usuário não encontrado." };
    }

    // Verifica a senha
    const passwordMatch = await bcrypt.compare(adminPassword, currentUser.password);
    if (!passwordMatch) {
      return { success: false, error: "Senha incorreta. O pedido não foi cancelado." };
    }

    // Buscar o pedido — tenta banco principal primeiro, depois FireHub
    let order = await prisma.order.findUnique({
      where: { id: orderId }
    }).catch(() => null);

    // Determina qual client usar para atualizar o pedido
    let dbClient = prisma;

    if (!order) {
      order = await prismaFirehub.order.findUnique({
        where: { id: orderId }
      }).catch(() => null);
      dbClient = prismaFirehub;
    }

    if (!order) {
      return { success: false, error: "Pedido não encontrado." };
    }

    const oldStatus = order.status;

    if (oldStatus === "CANCELADO") {
      return { success: false, error: "Pedido já está cancelado." };
    }

    // Se o pedido possui um ID de pagamento no Asaas, tentamos cancelar lá primeiro
    if ((order as any).asaasPaymentId) {
      const asaasKey = process.env.ASAAS_API_KEY;
      if (asaasKey) {
        const ASAAS_URL = asaasKey.startsWith("$aact_prod")
          ? "https://api.asaas.com/v3"
          : "https://sandbox.asaas.com/v3";

        try {
          const res = await fetch(`${ASAAS_URL}/payments/${(order as any).asaasPaymentId}`, {
            method: "DELETE",
            headers: {
              "access_token": asaasKey,
              "User-Agent": "HakimPortal/1.0"
            }
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
    try {
      await dbClient.order.update({
        where: { id: orderId },
        data: { 
          status: "CANCELADO",
          cancelReason: reason
        }
      });
    } catch (updateErr: any) {
      console.error("[cancelOrder] Erro ao atualizar pedido:", updateErr);
      // Se falhou com cancelReason (campo pode não existir no FireHub), tenta sem
      try {
        await dbClient.order.update({
          where: { id: orderId },
          data: { status: "CANCELADO" }
        });
      } catch (updateErr2: any) {
        console.error("[cancelOrder] Erro ao atualizar pedido (sem cancelReason):", updateErr2);
        return { success: false, error: "Erro ao atualizar pedido: " + (updateErr2.message || "Erro desconhecido") };
      }
    }

    // Registrar histórico — tenta no mesmo banco, fallback para principal
    try {
      await dbClient.orderHistory.create({
        data: {
          orderId,
          statusFrom: oldStatus,
          statusTo: "CANCELADO",
          actionBy: session.user?.name || "Sistema",
          actionEmail: session.user?.email || "",
          notes: reason
        }
      });
    } catch (histErr) {
      console.warn("[cancelOrder] Falha histórico no banco do pedido:", histErr);
      try {
        await prisma.orderHistory.create({
          data: {
            orderId,
            statusFrom: oldStatus,
            statusTo: "CANCELADO",
            actionBy: session.user?.name || "Sistema",
            actionEmail: session.user?.email || "",
            notes: reason
          }
        });
      } catch (histErr2) {
        console.warn("[cancelOrder] Falha histórico no banco principal:", histErr2);
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
