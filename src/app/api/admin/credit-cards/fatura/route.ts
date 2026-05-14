/**
 * POST /api/admin/credit-cards/fatura
 * Cria uma entrada em Contas a Pagar (Payable) do tipo CREDIT_CARD vinculada ao cartão.
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { creditCardId, supplierName, value, dueDate, category } = await req.json();

  if (!creditCardId || !value || !dueDate) {
    return NextResponse.json({ error: "creditCardId, value e dueDate são obrigatórios" }, { status: 400 });
  }

  const card = await prisma.creditCard.findUnique({ where: { id: creditCardId } });
  if (!card) return NextResponse.json({ error: "Cartão não encontrado" }, { status: 404 });

  const payable = await prisma.payable.create({
    data: {
      supplierName: supplierName || `Fatura ${card.name}`,
      paymentType: "CREDIT_CARD",
      creditCardId,
      pixKey: card.pixKey,
      pixKeyType: card.pixKeyType,
      pixKeyName: card.name,
      value: parseFloat(value),
      dueDate: new Date(dueDate),
      receivedDate: new Date(),
      category: category || "BUSINESS",
      status: "PENDING",
    },
  });

  return NextResponse.json({ success: true, payable });
}
