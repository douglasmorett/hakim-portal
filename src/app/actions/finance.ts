"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

import { convert44ToLinhaDigitavel } from "@/lib/boleto";

export async function createPayable(data: {
  supplierName: string;
  barcode?: string;
  receivedDate: string;
  dueDate: string;
  value: number;
  category?: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return { error: "Sessão expirada. Faça login novamente." };
  }
  
  const role = (session.user as any)?.role;
  const permissions = (session.user as any)?.permissions || "";
  
  // Admin ou usuário com permissão "finance" ou "payables"
  const hasAccess = role === "ADMIN" || 
    permissions.split(",").includes("finance") || 
    permissions.split(",").includes("payables");
    
  if (!hasAccess) {
    return { error: "Sem permissão para registrar contas. Contate o administrador." };
  }

  // Validações
  if (!data.supplierName || data.supplierName.trim() === "") {
    return { error: "Nome do fornecedor é obrigatório." };
  }

  if (!data.value || isNaN(data.value) || data.value <= 0) {
    return { error: "Valor inválido. Informe um valor maior que zero." };
  }

  if (!data.dueDate) {
    return { error: "Data de vencimento é obrigatória." };
  }

  // Se receivedDate não foi informada, usa a data atual
  const receivedDate = data.receivedDate 
    ? new Date(data.receivedDate) 
    : new Date();

  const dueDate = new Date(data.dueDate);

  if (isNaN(receivedDate.getTime())) {
    return { error: "Data de recebimento inválida." };
  }

  if (isNaN(dueDate.getTime())) {
    return { error: "Data de vencimento inválida." };
  }

  // Normaliza o código de barras
  const rawBarcode = data.barcode?.replace(/\D/g, "") || "";
  const normalizedBarcode = rawBarcode ? convert44ToLinhaDigitavel(rawBarcode) : null;

  try {
    await prisma.payable.create({
      data: {
        supplierName: data.supplierName.trim(),
        barcode: normalizedBarcode,
        receivedDate,
        dueDate,
        value: data.value,
        status: "PENDING",
        category: data.category || "BUSINESS"
      }
    });

    revalidatePath("/admin/finance");
    return { success: true };
  } catch (err: any) {
    console.error("Erro ao criar payable:", err);
    return { error: "Erro no banco de dados: " + (err?.message || "desconhecido") };
  }
}

export async function markPayableAsPaid(id: string) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "ADMIN") throw new Error("Não autorizado");

  await prisma.payable.update({
    where: { id },
    data: {
      status: "PAID",
      paidDate: new Date()
    }
  });

  revalidatePath("/admin/finance");
}

export async function deletePayable(id: string) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "ADMIN") throw new Error("Não autorizado");

  await prisma.payable.delete({ where: { id } });
  revalidatePath("/admin/finance");
}

export async function updatePayable(id: string, data: {
  supplierName?: string;
  barcode?: string;
  dueDate?: string;
  value?: number;
  paymentType?: string;
  pixKey?: string;
  pixKeyName?: string;
  pixKeyType?: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return { error: "Apenas administradores podem editar contas." };
  }

  const updateData: any = {};
  if (data.supplierName !== undefined) updateData.supplierName = data.supplierName.trim();
  if (data.barcode !== undefined) {
    const raw = data.barcode.replace(/\D/g, "");
    updateData.barcode = raw ? convert44ToLinhaDigitavel(raw) : null;
  }
  if (data.dueDate !== undefined) updateData.dueDate = new Date(data.dueDate);
  if (data.value !== undefined) updateData.value = data.value;
  if (data.paymentType !== undefined) updateData.paymentType = data.paymentType;
  if (data.pixKey !== undefined) updateData.pixKey = data.pixKey.trim() || null;
  if (data.pixKeyName !== undefined) updateData.pixKeyName = data.pixKeyName.trim() || null;
  if (data.pixKeyType !== undefined) updateData.pixKeyType = data.pixKeyType;

  try {
    await prisma.payable.update({ where: { id }, data: updateData });
    revalidatePath("/admin/finance");
    return { success: true };
  } catch (err: any) {
    return { error: "Erro ao atualizar: " + (err?.message || "desconhecido") };
  }
}

export async function checkAndGenerateRecurringPayables() {
  try {
    const recurring = await prisma.recurringPayable.findMany({
      where: { active: true }
    });

    if (recurring.length === 0) return { success: true, count: 0 };

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth(); // 0-indexed (0 = Jan, 11 = Dec)

    // Início e fim do mês atual
    const startOfMonth = new Date(currentYear, currentMonth, 1);
    const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);

    // Buscar payables deste mês que foram gerados a partir de contas recorrentes
    const existingPayables = await prisma.payable.findMany({
      where: {
        recurringPayableId: { in: recurring.map(r => r.id) },
        dueDate: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      },
      select: { recurringPayableId: true }
    });

    const generatedIds = new Set(existingPayables.map(ep => ep.recurringPayableId).filter(Boolean) as string[]);

    let count = 0;
    for (const rec of recurring) {
      if (!generatedIds.has(rec.id)) {
        // Calcula a data de vencimento limitando pelo último dia do mês alvo
        const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
        const day = Math.min(rec.dueDateDay, lastDay);
        const dueDate = new Date(currentYear, currentMonth, day, 12, 0, 0);

        await prisma.payable.create({
          data: {
            supplierName: rec.supplierName,
            barcode: rec.barcode || null,
            pixKey: rec.pixKey || null,
            pixKeyName: rec.pixKeyName || null,
            pixKeyType: rec.pixKeyType || null,
            paymentType: rec.paymentType,
            receivedDate: new Date(),
            dueDate,
            value: rec.value,
            status: "PENDING",
            category: rec.category,
            creditCardId: rec.creditCardId || null,
            recurringPayableId: rec.id
          }
        });
        count++;
      }
    }

    return { success: true, count };
  } catch (err: any) {
    console.error("Erro ao gerar contas recorrentes:", err);
    return { error: err?.message || "Erro desconhecido" };
  }
}

export async function createRecurringPayable(data: {
  supplierName: string;
  value: number;
  category: string;
  paymentType: string;
  dueDateDay: number;
  barcode?: string;
  pixKey?: string;
  pixKeyName?: string;
  pixKeyType?: string;
  creditCardId?: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return { error: "Sessão expirada. Faça login novamente." };
  }

  const role = (session.user as any)?.role;
  const permissions = (session.user as any)?.permissions || "";

  const hasAccess = role === "ADMIN" ||
    permissions.split(",").includes("finance") ||
    permissions.split(",").includes("payables");

  if (!hasAccess) {
    return { error: "Sem permissão para registrar contas fixas. Contate o administrador." };
  }

  // Validações
  if (!data.supplierName || data.supplierName.trim() === "") {
    return { error: "Nome do fornecedor é obrigatório." };
  }

  if (!data.value || isNaN(data.value) || data.value <= 0) {
    return { error: "Valor inválido. Informe um valor maior que zero." };
  }

  const day = Number(data.dueDateDay);
  if (!day || isNaN(day) || day < 1 || day > 31) {
    return { error: "Dia do vencimento inválido. Escolha um dia entre 1 e 31." };
  }

  try {
    const newRecurring = await prisma.recurringPayable.create({
      data: {
        supplierName: data.supplierName.trim(),
        value: data.value,
        category: data.category || "BUSINESS",
        paymentType: data.paymentType || "BOLETO",
        dueDateDay: day,
        barcode: data.barcode?.trim() || null,
        pixKey: data.pixKey?.trim() || null,
        pixKeyName: data.pixKeyName?.trim() || null,
        pixKeyType: data.pixKeyType?.trim() || null,
        creditCardId: data.creditCardId || null,
        active: true
      }
    });

    // Gera para o mês atual imediatamente após a criação para aparecer de prontidão
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
    const cappedDay = Math.min(day, lastDay);
    const dueDate = new Date(currentYear, currentMonth, cappedDay, 12, 0, 0);

    await prisma.payable.create({
      data: {
        supplierName: newRecurring.supplierName,
        barcode: newRecurring.barcode,
        pixKey: newRecurring.pixKey,
        pixKeyName: newRecurring.pixKeyName,
        pixKeyType: newRecurring.pixKeyType,
        paymentType: newRecurring.paymentType,
        receivedDate: new Date(),
        dueDate,
        value: newRecurring.value,
        status: "PENDING",
        category: newRecurring.category,
        creditCardId: newRecurring.creditCardId,
        recurringPayableId: newRecurring.id
      }
    });

    revalidatePath("/admin/finance");
    return { success: true };
  } catch (err: any) {
    console.error("Erro ao criar conta fixa:", err);
    return { error: "Erro no banco de dados: " + (err?.message || "desconhecido") };
  }
}

export async function deleteRecurringPayable(id: string) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return { error: "Apenas administradores podem excluir contas fixas." };
  }

  try {
    await prisma.recurringPayable.delete({ where: { id } });
    revalidatePath("/admin/finance");
    return { success: true };
  } catch (err: any) {
    console.error("Erro ao excluir conta fixa:", err);
    return { error: "Erro ao excluir: " + (err?.message || "desconhecido") };
  }
}

export async function toggleRecurringPayableActive(id: string, active: boolean) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return { error: "Apenas administradores podem alterar o status de contas fixas." };
  }

  try {
    await prisma.recurringPayable.update({
      where: { id },
      data: { active }
    });
    revalidatePath("/admin/finance");
    return { success: true };
  } catch (err: any) {
    console.error("Erro ao alterar status da conta fixa:", err);
    return { error: "Erro ao alterar status: " + (err?.message || "desconhecido") };
  }
}
