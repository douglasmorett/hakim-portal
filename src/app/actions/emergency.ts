"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { createAsaasPayment } from "@/lib/asaas";

const EMERGENCY_FREE_QUOTA = 1;
const EMERGENCY_FINE_PERCENT = 0.30;

export async function approveEmergencyOrder(orderId: string) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session || (role !== "ADMIN" && role !== "STAFF")) {
    throw new Error("Não autorizado");
  }

  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { user: true } });
  if (!order) throw new Error("Pedido não encontrado");

  // ── Cota de emergência: 1 grátis por mês, a partir da 2ª → multa 30% ──
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const approvedThisMonth = await prisma.order.count({
    where: {
      userId: order.userId,
      isEmergency: true,
      emergencyStatus: "APPROVED",
      createdAt: { gte: startOfMonth },
      id: { not: orderId },
    },
  });

  const itemsTotal = order.totalAmount;
  const fine = approvedThisMonth >= EMERGENCY_FREE_QUOTA
    ? Math.round(itemsTotal * EMERGENCY_FINE_PERCENT * 100) / 100
    : 0;
  const finalAmount = Math.round((itemsTotal + fine) * 100) / 100;

  // ── Gerar boleto Asaas com valor final (itens + multa) ──
  const shortId = order.id.slice(-6).toUpperCase();
  let boletoUrl: string | null = null;
  let asaasPaymentId: string | null = null;

  const description = fine > 0
    ? `Pedido Emergência #${shortId} — Taxa de emergência de 30% cobrada conforme termos aceitos pelo cliente no site. — Hakim Congelados`
    : `Pedido de Emergência #${shortId} — Hakim Congelados`;

  const asaasResult = await createAsaasPayment({
    userName: order.user.name || order.user.email || "",
    userEmail: order.user.email || "",
    cpfCnpj: order.user.cpfCnpj || "",
    totalAmount: finalAmount,
    orderId: order.id,
    description,
  });

  if (asaasResult) {
    boletoUrl = asaasResult.boletoUrl;
    asaasPaymentId = asaasResult.paymentId;
  }

  // ── Salvar pedido com multa e novo total ──
  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: "PENDING_PAYMENT",
      emergencyStatus: "APPROVED",
      emergencyFine: fine,
      totalAmount: finalAmount,
      boletoUrl,
      asaasPaymentId,
    },
  });

  const fineNote = fine > 0
    ? `Emergência Aprovada e Boleto Gerado. Multa de 30% aplicada: R$ ${fine.toFixed(2)} (${approvedThisMonth + 1}ª emergência do mês).`
    : `Emergência Aprovada e Boleto Gerado (1ª do mês — sem multa).`;

  await prisma.orderHistory.create({
    data: {
      orderId,
      statusFrom: "EMERGENCIA_PENDENTE",
      statusTo: "PENDING_PAYMENT",
      actionBy: session?.user?.name || "Admin",
      actionEmail: session?.user?.email || "",
      notes: fineNote,
    },
  });

  revalidatePath("/admin/orders");
  return { success: true, fine, finalAmount };
}

export async function rejectEmergencyOrder(orderId: string, reason: string) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session || (role !== "ADMIN" && role !== "STAFF")) {
    throw new Error("Não autorizado");
  }

  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: "CANCELADO",
      emergencyStatus: "REJECTED",
      rejectionReason: reason,
    },
  });

  await prisma.orderHistory.create({
    data: {
      orderId,
      statusFrom: "EMERGENCIA_PENDENTE",
      statusTo: "CANCELADO",
      actionBy: session?.user?.name || "Admin",
      actionEmail: session?.user?.email || "",
      notes: `Emergência Reprovada: ${reason}`,
    },
  });

  revalidatePath("/admin/orders");
  return { success: true };
}
