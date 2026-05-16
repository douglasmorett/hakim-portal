"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function createKitchenItem(data: any) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Não autorizado");

  if (!(session?.user as any)?.id) throw new Error("Não autorizado");

  const item = await prisma.kitchenItem.create({
    data: {
      ...data,
      franchiseeId: (session.user as any).id
    }
  });

  revalidatePath("/admin/labels");
  return item;
}

export async function updateKitchenItem(id: string, data: any) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Não autorizado");

  const item = await prisma.kitchenItem.update({
    where: { id },
    data
  });

  revalidatePath("/admin/labels");
  return item;
}

export async function deleteKitchenItem(id: string) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Não autorizado");

  await prisma.kitchenItem.delete({
    where: { id }
  });

  revalidatePath("/admin/labels");
}
