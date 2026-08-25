"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { createAsaasPayment, getAsaasKey } from "@/lib/asaas";
import { findOrderInAnyDb } from "@/lib/orderDb";

export async function adminUpdateOrderItems(orderId: string, items: { productId: string, quantity: number, price?: number }[]) {
  const session = await getServerSession(authOptions);

  if (!session || ((session.user as any)?.role !== "ADMIN" && (session.user as any)?.role !== "STAFF")) {
    throw new Error("Não autorizado");
  }

  if (!items || items.length === 0) {
    throw new Error("O pedido não pode ficar vazio.");
  }

  // O pedido pode estar no banco do Hakim ou no do FireHub — grava no mesmo
  // banco de onde veio.
  const resolved = await findOrderInAnyDb(orderId);
  if (!resolved) throw new Error("Pedido não encontrado");

  const { order, client: prisma } = resolved;

  // Fetch products to calculate total
  const productIds = items.map(i => i.productId);
  const dbProducts = await prisma.product.findMany({
    where: { id: { in: productIds } }
  });

  let newTotal = 0;
  const itemsWithPrice = items.map(item => {
    const product = dbProducts.find(p => p.id === item.productId);
    if (!product) throw new Error(`Produto não encontrado.`);
    const itemPrice = item.price !== undefined && item.price > 0 ? item.price : product.price;
    newTotal += itemPrice * item.quantity;
    return {
      productId: product.id,
      quantity: item.quantity,
      price: itemPrice
    };
  });

  // Update Database
  await prisma.$transaction([
    prisma.orderItem.deleteMany({ where: { orderId } }),
    prisma.order.update({
      where: { id: orderId },
      data: {
        totalAmount: newTotal,
        items: {
          create: itemsWithPrice
        }
      }
    }),
    prisma.orderHistory.create({
      data: {
        orderId,
        statusFrom: order.status,
        statusTo: order.status,
        actionBy: session.user?.name || "Admin",
        actionEmail: session.user?.email || "",
        notes: `Admin editou os itens do pedido. Total alterado de R$ ${order.totalAmount.toFixed(2)} para R$ ${newTotal.toFixed(2)}.`
      }
    })
  ]);

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}/edit`);

  // If order has Asaas payment and is still open, recreate it with the new value.
  // Cria a nova cobrança ANTES de apagar a antiga: se a criação falhar, o
  // cliente continua com um link válido em vez de ficar sem nenhum.
  if (order.asaasPaymentId && order.status === "PENDING_PAYMENT") {
    const asaasKey = getAsaasKey();
    if (asaasKey) {
      const ASAAS_URL = asaasKey.startsWith("$aact_prod")
        ? "https://api.asaas.com/v3"
        : "https://sandbox.asaas.com/v3";

      const shortId = order.id.slice(-6).toUpperCase();

      // 1. Create new payment using shared function
      const asaasResult = await createAsaasPayment({
        userName: order.user.name || order.user.email || "",
        userEmail: order.user.email || "",
        cpfCnpj: order.user.cpfCnpj || "",
        totalAmount: newTotal,
        orderId: order.id,
        description: `Pedido #${shortId} — Hakim Congelados (Editado)`
      });

      if (!asaasResult) {
        throw new Error(
          `Os itens foram salvos (novo total R$ ${newTotal.toFixed(2)}), mas a nova cobrança no Asaas NÃO foi criada. ` +
          `A cobrança antiga de R$ ${order.totalAmount.toFixed(2)} continua ativa — verifique o CPF/CNPJ do franqueado e gere a cobrança novamente.`
        );
      }

      await prisma.order.update({
        where: { id: orderId },
        data: {
          boletoUrl: asaasResult.boletoUrl,
          asaasPaymentId: asaasResult.paymentId
        }
      });

      // 2. Só agora apaga a cobrança antiga
      const deleteRes = await fetch(`${ASAAS_URL}/payments/${order.asaasPaymentId}`, {
        method: "DELETE",
        headers: { "access_token": asaasKey }
      }).catch(err => {
        console.error("[adminOrderEdit] Falha ao apagar cobrança antiga no Asaas:", err);
        return null;
      });

      if (!deleteRes || !deleteRes.ok) {
        console.error(
          `[adminOrderEdit] Cobrança antiga ${order.asaasPaymentId} do pedido ${orderId} não foi removida no Asaas ` +
          `(status ${deleteRes?.status}). Remover manualmente para o cliente não pagar duas vezes.`
        );
      }

      revalidatePath("/admin/orders");
      revalidatePath(`/admin/orders/${orderId}/edit`);
    }
  }
}
