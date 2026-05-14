/**
 * POST /api/admin/mark-paid
 * Marca uma conta a pagar como PAGA (Dar Baixa manual).
 * Somente ADMIN.
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

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });

  await prisma.payable.update({
    where: { id },
    data: { status: "PAID", paidDate: new Date() },
  });

  return NextResponse.json({ success: true });
}

/**
 * DELETE /api/admin/mark-paid?id=xxx
 * Exclui uma conta a pagar.
 */
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });

  await prisma.payable.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
