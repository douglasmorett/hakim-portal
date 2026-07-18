/**
 * GET    /api/admin/credit-cards          — lista cartões
 * POST   /api/admin/credit-cards          — cria cartão
 * DELETE /api/admin/credit-cards?id=xxx   — remove cartão
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function checkAdmin(req?: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "ADMIN") return false;
  return true;
}

export async function GET() {
  if (!await checkAdmin()) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const cards = await prisma.creditCard.findMany({
    where: { active: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(cards);
}

export async function POST(req: NextRequest) {
  if (!await checkAdmin()) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { name, lastDigits, bankName, limit, closingDay, dueDay, bestPurchaseDay, pixKey, pixKeyType, color } = await req.json();

  if (!name || !pixKey) {
    return NextResponse.json({ error: "Nome do cartão e chave PIX são obrigatórios" }, { status: 400 });
  }

  const card = await prisma.creditCard.create({
    data: {
      name,
      lastDigits: lastDigits || null,
      bankName: bankName || null,
      limit: limit ? parseFloat(limit) : null,
      closingDay: closingDay ? parseInt(closingDay) : null,
      dueDay: dueDay ? parseInt(dueDay) : null,
      bestPurchaseDay: bestPurchaseDay ? parseInt(bestPurchaseDay) : null,
      pixKey,
      pixKeyType: pixKeyType || "CPF",
      color: color || "#4F46E5",
      active: true,
    },
  });

  return NextResponse.json({ success: true, card });
}

export async function DELETE(req: NextRequest) {
  if (!await checkAdmin()) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });

  await prisma.creditCard.update({ where: { id }, data: { active: false } });
  return NextResponse.json({ success: true });
}
