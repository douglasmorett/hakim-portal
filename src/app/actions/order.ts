"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { resolveOrderClient } from "@/lib/orderDb";

export async function updateOrderStatus(orderId: string, newStatus: string, notes?: string) {
  const session = await getServerSession(authOptions);

  if (!session || ((session.user as any)?.role !== "ADMIN" && (session.user as any)?.role !== "STAFF")) {
    throw new Error("Não autorizado");
  }

  // O pedido pode estar no banco do Hakim ou no do FireHub
  const resolved = await resolveOrderClient(orderId);
  if (!resolved) throw new Error("Pedido não encontrado");

  const { client: prisma, status: statusAntigo } = resolved;

  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: newStatus,
      // Se for cancelamento por outro método que não o cancelOrder específico
      ...(newStatus === "CANCELADO" && notes ? { cancelReason: notes } : {})
    },
    // Sem `select` o Prisma faz um SELECT de retorno com todas as colunas do
    // schema — e o FireHub não tem várias delas.
    select: { id: true }
  });

  // Registrar histórico
  await prisma.orderHistory.create({
    select: { id: true },
    data: {
      orderId,
      statusFrom: statusAntigo,
      statusTo: newStatus,
      actionBy: session.user?.name || "Sistema",
      actionEmail: session.user?.email || "",
      notes: notes || null
    }
  });

  revalidatePath("/admin/orders");
  revalidatePath("/store/orders");
}
