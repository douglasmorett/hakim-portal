"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function approveEmergencyOrder(orderId: string) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session || (role !== "ADMIN" && role !== "STAFF")) {
    throw new Error("Não autorizado");
  }

  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { user: true } });
  if (!order) throw new Error("Pedido não encontrado");

  // INTEGRAÇÃO ASAAS para gerar boleto após aprovação
  const asaasKey = process.env.ASAAS_API_KEY;
  const ASAAS_URL = asaasKey?.startsWith("$aact_prod") 
    ? "https://api.asaas.com/v3" 
    : "https://sandbox.asaas.com/v3";

  let boletoUrl = null;
  let asaasPaymentId = null;

  if (asaasKey) {
    let asaasCustomerId = null;
    if (order.user.cpfCnpj) {
      const searchRes = await fetch(`${ASAAS_URL}/customers?cpfCnpj=${order.user.cpfCnpj}`, {
        headers: { "access_token": asaasKey }
      });
      const searchData = await searchRes.json();
      if (searchRes.ok && searchData.data && searchData.data.length > 0) {
        asaasCustomerId = searchData.data[0].id;
      }
    }

    if (!asaasCustomerId) {
      const customerRes = await fetch(`${ASAAS_URL}/customers`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "access_token": asaasKey },
        body: JSON.stringify({
          name: order.user.name,
          email: order.user.email,
          cpfCnpj: order.user.cpfCnpj || ""
        })
      });
      const customerData = await customerRes.json();
      asaasCustomerId = customerData.id;
    }

    if (asaasCustomerId) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 10); // 10 dias úteis? ou normais? Igual ao normal

      const paymentRes = await fetch(`${ASAAS_URL}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "access_token": asaasKey },
        body: JSON.stringify({
          customer: asaasCustomerId,
          billingType: "BOLETO",
          value: order.totalAmount,
          dueDate: dueDate.toISOString().split("T")[0],
          description: `Pedido de Emergência #${order.id.slice(-6).toUpperCase()} - Hakim B2B`,
          externalReference: order.id
        })
      });

      const paymentData = await paymentRes.json();
      if (paymentRes.ok) {
        boletoUrl = paymentData.bankSlipUrl || paymentData.invoiceUrl;
        asaasPaymentId = paymentData.id;
      } else {
        console.error("Erro ao gerar boleto Asaas na emergência:", paymentData);
      }
    }
  }

  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: "PENDING_PAYMENT",
      emergencyStatus: "APPROVED",
      boletoUrl,
      asaasPaymentId
    }
  });

  await prisma.orderHistory.create({
    data: {
      orderId,
      statusFrom: "EMERGENCIA_PENDENTE",
      statusTo: "PENDING_PAYMENT",
      actionBy: session?.user?.name || "Admin",
      actionEmail: session?.user?.email || "",
      notes: "Emergência Aprovada e Boleto Gerado"
    }
  });

  revalidatePath("/admin/orders");
  return { success: true };
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
      rejectionReason: reason
    }
  });

  await prisma.orderHistory.create({
    data: {
      orderId,
      statusFrom: "EMERGENCIA_PENDENTE",
      statusTo: "CANCELADO",
      actionBy: session?.user?.name || "Admin",
      actionEmail: session?.user?.email || "",
      notes: `Emergência Reprovada: ${reason}`
    }
  });

  revalidatePath("/admin/orders");
  return { success: true };
}
