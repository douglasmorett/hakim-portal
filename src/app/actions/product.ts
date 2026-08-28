"use server";

import { prismaFirehub } from "@/lib/prismaFirehub";

/**
 * ── OS PRODUTOS MORAM NO BANCO DO FIREHUB, NÃO NO DESTE PORTAL ──────────────
 *
 * O catálogo que o cliente da distribuidora compra em
 * iceboxdistribuidora.com.br é servido pelo FireHub, lendo o banco
 * `firehub_db`. Esta tela gravava no banco DESTE portal — outro banco, no mesmo
 * Neon. Ou seja: o preço editado aqui nunca chegava a quem compra.
 *
 * Medido em 28/08/2026, comparando esta tela com o que o site realmente servia:
 *
 *     Salsicha 5kg            51,90  =  51,90   ok (não mudou desde a migração)
 *     Pastel de Nata 48 und  144,00  = 144,00   ok
 *     4 Queijos 3kg          168,90  → 134,70   DIVERGE  −34,20
 *     Queijo Temperado 3kg   152,70  → 116,70   DIVERGE  −36,00
 *     Queijo Mussarela Base  146,70  → 110,40   DIVERGE  −36,30
 *
 * Os três que divergiam eram os TRÊS QUEIJOS, todos por cerca de R$ 35: um
 * reajuste lançado aqui que nunca chegou a quem compra. Toda a base da
 * distribuidora estava levando queijo com R$ 35 de desconto que ninguém deu.
 *
 * `prismaFirehub` já existia e já era usado para os pedidos — os dois bancos
 * vivem no mesmo Neon, então a conexão já estava de pé. Faltava só os produtos
 * usarem ela.
 *
 * `select` explícito de propósito: o banco do FireHub não tem todas as colunas
 * do schema deste portal, e sem `select` o Prisma monta o SELECT de retorno com
 * todas elas e a escrita quebra — a mesma armadilha já documentada no commit
 * 7092154 para os pedidos.
 */
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { hasPermission } from "@/lib/permissions";

export async function createProduct(formData: FormData) {
  const session = await getServerSession(authOptions);
  
  if (!session) throw new Error("Não autorizado");
  const role = (session.user as any).role;
  const perms = (session.user as any).permissions || "";
  
  if (role !== "ADMIN" && !(role === "STAFF" && hasPermission(perms, "products", role))) {
    throw new Error("Não autorizado");
  }

  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  let priceStr = formData.get("price") as string;
  priceStr = priceStr?.replace(",", ".") || "0";
  const price = parseFloat(priceStr);
  const imageUrl = formData.get("imageUrl") as string | null;
  const category = formData.get("category") as string | null;

  await prismaFirehub.product.create({
    select: { id: true },
    data: {
      name,
      description,
      price: isNaN(price) ? 0 : price,
      imageUrl: imageUrl === "" ? null : imageUrl,
      category: category === "" ? null : category,
    },
  });

  revalidatePath("/admin/products");
  revalidatePath("/store");
}

export async function deleteProduct(id: string) {
  const session = await getServerSession(authOptions);
  
  if (!session) throw new Error("Não autorizado");
  const role = (session.user as any).role;
  const perms = (session.user as any).permissions || "";
  
  if (role !== "ADMIN" && !(role === "STAFF" && hasPermission(perms, "products", role))) {
    throw new Error("Não autorizado");
  }

  await prismaFirehub.product.delete({
    select: { id: true },
    where: { id },
  });

  revalidatePath("/admin/products");
  revalidatePath("/store");
}

export async function updateProduct(id: string, formData: FormData) {
  const session = await getServerSession(authOptions);
  
  if (!session) throw new Error("Não autorizado");
  const role = (session.user as any).role;
  const perms = (session.user as any).permissions || "";
  
  if (role !== "ADMIN" && !(role === "STAFF" && hasPermission(perms, "products", role))) {
    throw new Error("Não autorizado");
  }

  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  let priceStr = formData.get("price") as string;
  priceStr = priceStr?.replace(",", ".") || "0";
  const price = parseFloat(priceStr);
  const imageUrl = formData.get("imageUrl") as string | null;
  const category = formData.get("category") as string | null;

  await prismaFirehub.product.update({
    select: { id: true },
    where: { id },
    data: {
      name,
      description,
      price: isNaN(price) ? 0 : price,
      ...(imageUrl !== null ? { imageUrl: imageUrl === "" ? null : imageUrl } : {}),
      ...(category !== null ? { category: category === "" ? null : category } : {}),
    },
  });

  revalidatePath("/admin/products");
  revalidatePath("/store");
}
