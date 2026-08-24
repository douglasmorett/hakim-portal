import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { calcMensalidade, FIREHUB_PLAN } from "@/lib/firehub-billing";
import LojistasAdminClient from "./LojistasAdminClient";

export const dynamic = "force-dynamic";

export default async function AdminLojistasPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "ADMIN") redirect("/admin");

  const TRIAL_DAYS = FIREHUB_PLAN.TRIAL_DAYS;
  const since365 = new Date();
  since365.setDate(since365.getDate() - 365);

  const sinceThisMonth = new Date();
  sinceThisMonth.setDate(1);
  sinceThisMonth.setHours(0, 0, 0, 0);

  const franchisees = await prisma.user.findMany({
    where: { role: "FRANCHISEE" },
    orderBy: { createdAt: "desc" },
  });

  // Busca pedidos do mês atual para cada lojista de uma vez
  const allOrdersThisMonth = await prisma.customerOrder.findMany({
    where: {
      franchiseeId: { in: franchisees.map(f => f.id) },
      createdAt: { gte: sinceThisMonth },
      status: { not: "CANCELADO" },
    },
    select: { franchiseeId: true, totalAmount: true },
  });

  const now = new Date();

  const lojistas = franchisees.map(f => {
    // Dias desde criação
    const diasDesde = Math.floor((now.getTime() - new Date(f.createdAt).getTime()) / (1000 * 60 * 60 * 24));
    const emTrial = diasDesde < TRIAL_DAYS;
    const diasTrialRestantes = Math.max(0, TRIAL_DAYS - diasDesde);

    // Faturamento do mês
    const pedidosMes = allOrdersThisMonth.filter(o => o.franchiseeId === f.id);
    const faturamentoMes = pedidosMes.reduce((s, o) => s + o.totalAmount, 0);
    const { mensalidade, modelo } = calcMensalidade(faturamentoMes);

    // Status
    let status: "trial" | "ativo" | "zero" = "ativo";
    if (emTrial) status = "trial";
    else if (faturamentoMes === 0) status = "zero";

    return {
      id: f.id,
      name: f.name,
      email: f.email,
      storeName: f.storeName || f.name,
      slug: f.slug || "",
      city: f.city || "",
      createdAt: f.createdAt.toISOString(),
      diasDesde,
      emTrial,
      diasTrialRestantes,
      faturamentoMes,
      mensalidade,
      modelo,
      status,
      storeOpen: f.storeOpen,
      pagarmeRecipientId: f.pagarmeRecipientId || null,
    };
  });

  return <LojistasAdminClient lojistas={lojistas} />;
}
