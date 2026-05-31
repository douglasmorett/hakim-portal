"use server";

import { prisma } from "@/lib/prisma";
import { prismaFirehub } from "@/lib/prismaFirehub";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

export async function cancelOrder(orderId: string, adminPassword?: string, reason?: string) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;

  if (!session || !session.user || (role !== "ADMIN" && role !== "STAFF")) {
    throw new Error("Não autorizado.");
  }

  if (!adminPassword) {
    throw new Error("Senha de acesso não fornecida.");
  }

  if (!reason) {
    throw new Error("O motivo do cancelamento é obrigatório.");
  }

  // Buscar o usuário logado para validar a senha — tenta banco principal primeiro
  let currentUser = await prisma.user.findUnique({
    where: { email: session.user.email! }
  });

  if (!currentUser) {
    currentUser = await prismaFirehub.user.findUnique({
      where: { email: session.user.email! }
    });
  }

  if (!currentUser) {
    throw new Error("Usuário não encontrado.");
  }

  // Verifica a senha
  const passwordMatch = await bcrypt.compare(adminPassword, currentUser.password);
  if (!passwordMatch) {
    throw new Error("Senha incorreta. O pedido não foi cancelado.");
  }

  // Buscar o pedido — tenta banco principal primeiro, depois FireHub
  let order = await prisma.order.findUnique({
    where: { id: orderId }
  });

  // Determina qual client usar para atualizar o pedido
  let dbClient = prisma;

  if (!order) {
    order = await prismaFirehub.order.findUnique({
      where: { id: orderId }
    });
    dbClient = prismaFirehub;
  }

  if (!order) {
    throw new Error("Pedido não encontrado.");
  }

  const oldStatus = order.status;

  if (oldStatus === "CANCELADO") {
    throw new Error("Pedido já está cancelado.");
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
          console.warn("Aviso ao deletar cobrança no Asaas:", data.errors);
          // Não bloquear o cancelamento por erro no Asaas — logar e continuar
        }
      } catch (asaasErr) {
        console.warn("Erro ao comunicar com Asaas (ignorado):", asaasErr);
      }
    }
  }

  await dbClient.order.update({
    where: { id: orderId },
    data: { 
      status: "CANCELADO",
      ...(dbClient === prisma ? { cancelReason: reason } : {})
    }
  });

  // Registrar histórico — tenta no mesmo banco do pedido
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
    // Se o banco FireHub não tiver a tabela OrderHistory, tenta no principal
    console.warn("Falha ao criar histórico no banco do pedido, tentando no principal:", histErr);
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
      console.warn("Falha ao criar histórico no banco principal também:", histErr2);
    }
  }

  revalidatePath("/admin/orders");
  revalidatePath("/store/orders");
}
