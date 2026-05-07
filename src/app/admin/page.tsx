import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAsaasDashboardData } from "@/lib/asaas";
import DashboardClient from "@/components/DashboardClient";
import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ month?: string; year?: string }> }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role || "";
  const perms = (session?.user as any)?.permissions || "";

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

  const resolvedParams = await searchParams;
  const now = new Date();
  const month = parseInt(resolvedParams?.month || String(now.getMonth() + 1));
  const year = parseInt(resolvedParams?.year || String(now.getFullYear()));



  const [totalFranchisees, totalOrders, recentOrders, pendingPayables, overduePayables, todayPayables] = await Promise.all([
    prisma.user.count({ where: { role: "FRANCHISEE" } }),
    prisma.order.count(),
    prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true, city: true } } }
    }),
    prisma.payable.count({ where: { status: "PENDING", dueDate: { gte: new Date() } } }),
    prisma.payable.count({ where: { status: "PENDING", dueDate: { lt: new Date(new Date().setHours(0,0,0,0)) } } }),
    prisma.payable.findMany({
      where: {
        status: "PENDING",
        dueDate: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lte: new Date(new Date().setHours(23, 59, 59, 999))
        }
      }
    })
  ]);

  // Dados do Asaas (cobranças de clientes)
  const asaasData = await getAsaasDashboardData(month, year);

  const totalPayablesToday = todayPayables.reduce((acc, p) => acc + p.value, 0);

  return (
    <DashboardClient
      session={session}
      month={month}
      year={year}
      totalFranchisees={totalFranchisees}
      totalOrders={totalOrders}
      recentOrders={JSON.parse(JSON.stringify(recentOrders))}
      pendingPayables={pendingPayables}
      overduePayables={overduePayables}
      totalPayablesToday={totalPayablesToday}
      asaasData={asaasData}
    />
  );
}
