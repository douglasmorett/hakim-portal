import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { userId, isFranqueadoHakim } = await req.json();

  if (!userId || typeof isFranqueadoHakim !== "boolean") {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { isFranqueadoHakim }
  });

  return NextResponse.json({ success: true, name: user.name, isFranqueadoHakim: user.isFranqueadoHakim });
}
