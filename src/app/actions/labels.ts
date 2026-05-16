"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function saveLabelData(productId: string, labelData: any) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Não autorizado");
  
  await prisma.product.update({
    where: { id: productId },
    data: { labelData }
  });

  revalidatePath("/admin/labels");
}

export async function updateStoreLabelInfo(cpfCnpj: string, storeAddress: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!(session?.user as any)?.id) return { success: false, error: "Não autorizado" };

    await prisma.user.update({
      where: { id: (session?.user as any).id },
      data: { cpfCnpj, storeAddress }
    });

    revalidatePath("/admin/labels");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Erro desconhecido" };
  }
}
