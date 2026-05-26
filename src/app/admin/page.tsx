import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { prismaFirehub } from "@/lib/prismaFirehub";
import { getAsaasDashboardData } from "@/lib/asaas";
import DashboardClient from "@/components/DashboardClient";
import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ month?: string; year?: string }> }) {
  let session;
  try {
    session = await getServerSession(authOptions);
  } catch (err) {
    console.error("[Dashboard] Erro ao obter sessão:", err);
    redirect("/login");
  }

  if (!session?.user) {
    redirect("/login");
  }

  const role = (session.user as any)?.role || "";
  const perms = (session.user as any)?.permissions || "";

  // STAFF sem acesso ao dashboard → redirecionar para primeira página disponível
  if (role === "STAFF") {
    if (!hasPermission(perms, "dashboard", role)) {
      const redirectMap = [
        { key: "finance",     path: "/admin/finance" },
        { key: "payables",    path: "/admin/finance" },
        { key: "franchisees", path: "/admin/franchisees" },
        { key: "orders",      path: "/admin/orders" },
        { key: "products",    path: "/admin/products" },
        { key: "routes",      path: "/admin/routes" },
      ];
      for (const { key, path } of redirectMap) {
        if (hasPermission(perms, key, role)) redirect(path);
      }
      redirect("/login"); // nenhum acesso disponível
    }
  }

  let month: number;
  let year: number;
  try {
    const resolvedParams = await searchParams;
    const now = new Date();
    month = parseInt(resolvedParams?.month || String(now.getMonth() + 1));
    year = parseInt(resolvedParams?.year || String(now.getFullYear()));
  } catch {
    const now = new Date();
    month = now.getMonth() + 1;
    year = now.getFullYear();
  }

  // Buscar dados do banco — cada query isolada para não derrubar tudo
  let totalFranchisees = 0;
  let totalOrders = 0;
  let recentOrders: any[] = [];
  let pendingPayables = 0;
  let overduePayables = 0;
  let totalPayablesToday = 0;

  try {
    totalFranchisees = await prisma.user.count({ where: { role: "FRANCHISEE" } });
  } catch (err) {
    console.error("[Dashboard] Erro ao contar franqueados:", err);
  }

  try {
    totalOrders = await prismaFirehub.order.count();
  } catch (err) {
    console.error("[Dashboard] Erro ao contar pedidos:", err);
  }

  try {
    const rawOrders = await prismaFirehub.order.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true, city: true } } }
    });
    // Serialização segura — converte Dates e evita crash
    recentOrders = JSON.parse(JSON.stringify(rawOrders));
  } catch (err) {
    console.error("[Dashboard] Erro ao buscar pedidos recentes:", err);
  }

  try {
    pendingPayables = await prisma.payable.count({
      where: { status: "PENDING", dueDate: { gte: new Date() } }
    });
  } catch (err) {
    console.error("[Dashboard] Erro ao contar contas pendentes:", err);
  }

  try {
    overduePayables = await prisma.payable.count({
      where: {
        status: "PENDING",
        dueDate: { lt: new Date(new Date().setHours(0, 0, 0, 0)) }
      }
    });
  } catch (err) {
    console.error("[Dashboard] Erro ao contar contas vencidas:", err);
  }

  try {
    const todayPayables = await prisma.payable.findMany({
      where: {
        status: "PENDING",
        dueDate: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lte: new Date(new Date().setHours(23, 59, 59, 999))
        }
      }
    });
    totalPayablesToday = todayPayables.reduce((acc, p) => acc + p.value, 0);
  } catch (err) {
    console.error("[Dashboard] Erro ao calcular total a pagar hoje:", err);
  }

  // Dados do Asaas (cobranças de clientes) — isolado e com fallback
  let asaasData = null;
  try {
    asaasData = await getAsaasDashboardData(month, year);
  } catch (err) {
    console.error("[Dashboard] Erro ao buscar dados do Asaas:", err);
  }

  return (
    <DashboardClient
      session={session}
      month={month}
      year={year}
      totalFranchisees={totalFranchisees}
      totalOrders={totalOrders}
      recentOrders={recentOrders}
      pendingPayables={pendingPayables}
      overduePayables={overduePayables}
      totalPayablesToday={totalPayablesToday}
      asaasData={asaasData}
    />
  );
}
