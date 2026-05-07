import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const body = await req.json();
  const data: any = {};

  // CPF/CNPJ (editável pelo dono da loja)
  if (body.cpfCnpj !== undefined) data.cpfCnpj = body.cpfCnpj;

  // Store settings
  for (const key of ["storeName", "storePhone", "storeAddress", "storeBanner", "storeLogo", "storeHours", "paymentFees", "deliveryZoneType", "deliveryZones", "storeLatLng"]) {
    if (body[key] !== undefined) data[key] = body[key];
  }
  if (body.storeDeliveryOnly !== undefined) data.storeDeliveryOnly = body.storeDeliveryOnly;
  await prisma.user.update({ where: { email: session.user?.email || "" }, data });
  return NextResponse.json({ success: true });
}
