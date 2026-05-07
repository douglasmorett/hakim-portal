import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import CustomerOrdersList from "@/components/admin/CustomerOrdersList";

export default async function AdminPedidosClientesPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "ADMIN") redirect("/");

  const orders = await prisma.customerOrder.findMany({
    include: {
      items: { include: { menuProduct: true } },
      franchisee: { select: { name: true, storeName: true, city: true, slug: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div>
      <h1 className="font-bold mb-6" style={{ fontSize: "2rem" }}>📋 Pedidos de Clientes</h1>
      <p className="text-muted mb-4">Todos os pedidos feitos pelos clientes finais em todas as lojas.</p>
      <CustomerOrdersList orders={orders} isAdmin={true} />
    </div>
  );
}
