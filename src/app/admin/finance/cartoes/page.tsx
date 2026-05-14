import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import CartoesClient from "./CartoesClient";

export const metadata = { title: "Cartões de Crédito — Hakim" };

export default async function CartoesPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "ADMIN") redirect("/admin");

  const cards = await prisma.creditCard.findMany({
    where: { active: true },
    orderBy: { createdAt: "asc" },
    include: {
      _count: { select: { payables: { where: { status: "PENDING" } } } },
    },
  });

  // Total pendente por cartão
  const pendingAmounts = await prisma.payable.groupBy({
    by: ["creditCardId"],
    where: { status: "PENDING", creditCardId: { not: null } },
    _sum: { value: true },
  });

  const cardsData = cards.map(c => ({
    id: c.id,
    name: c.name,
    lastDigits: c.lastDigits,
    bankName: c.bankName,
    limit: c.limit,
    closingDay: c.closingDay,
    dueDay: c.dueDay,
    pixKey: c.pixKey,
    pixKeyType: c.pixKeyType,
    color: c.color || "#4F46E5",
    pendingCount: c._count.payables,
    pendingAmount: pendingAmounts.find(p => p.creditCardId === c.id)?._sum?.value || 0,
    createdAt: c.createdAt.toISOString(),
  }));

  return <CartoesClient cards={cardsData} />;
}
