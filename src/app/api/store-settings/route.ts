import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const body = await req.json();
  const data: any = {};
  for (const key of ["storeName", "storePhone", "storeAddress", "storeBanner", "storeLogo", "storeHours"]) {
    if (body[key] !== undefined) data[key] = body[key];
  }
  await prisma.user.update({ where: { email: session.user?.email || "" }, data });
  return NextResponse.json({ success: true });
}
