import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import StoreDashboard from "@/components/customer/StoreDashboard";

export default async function StorePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/");
  const role = (session.user as any)?.role;
  if (role !== "FRANCHISEE" && role !== "ADMIN") redirect("/");

  const user = await prisma.user.findUnique({
    where: { email: session.user?.email || "" },
    select: { id: true, paymentFees: true }
  });
  if (!user) redirect("/");

  // Busca últimos 90 dias de pedidos para relatórios
  const since = new Date();
  since.setDate(since.getDate() - 90);

  const orders = await prisma.customerOrder.findMany({
    where: { franchiseeId: user.id, createdAt: { gte: since } },
    include: { items: { include: { menuProduct: { select: { name: true, cost: true } } } } },
    orderBy: { createdAt: 'desc' }
  });

  const serialized = orders.map(o => ({
    id: o.id,
    totalAmount: o.totalAmount,
    status: o.status,
    deliveryType: o.deliveryType,
    paymentMethod: o.paymentMethod || undefined,
    customerName: o.customerName,
    customerPhone: o.customerPhone,
    createdAt: o.createdAt.toISOString(),
    items: o.items.map(i => ({
      id: i.id,
      quantity: i.quantity,
      price: i.price,
      cost: i.menuProduct.cost || null,
      menuProduct: { name: i.menuProduct.name }
    }))
  }));

  return <StoreDashboard orders={serialized} paymentFees={(user.paymentFees as any) || {}} />;
}
