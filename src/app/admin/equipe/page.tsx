import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import TeamClient from "@/components/TeamClient";

export const dynamic = "force-dynamic";

export default async function EquipePage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "ADMIN") redirect("/admin");

  const staffUsers = await prisma.user.findMany({
    where: { role: "STAFF" },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true, permissions: true, createdAt: true }
  });

  return <TeamClient staffUsers={JSON.parse(JSON.stringify(staffUsers))} />;
}
