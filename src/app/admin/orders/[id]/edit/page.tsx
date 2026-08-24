import { prismaFirehub as prisma } from "@/lib/prismaFirehub";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import EditOrderForm from "@/components/EditOrderForm";

export const dynamic = "force-dynamic";

export default async function AdminEditOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  
  if (!session || ((session.user as any)?.role !== "ADMIN" && (session.user as any)?.role !== "STAFF")) {
    redirect("/");
  }

  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: { include: { product: true } },
      user: true
    }
  });

  if (!order) {
    return <div className="container"><p>Pedido não encontrado.</p></div>;
  }

  const products = await prisma.product.findMany({
    where: { active: true },
    orderBy: { name: 'asc' }
  });

  return (
    <div className="container">
      <h1 className="font-bold mb-6" style={{ fontSize: "2rem" }}>Editar Pedido #{order.id.slice(-6).toUpperCase()}</h1>
      <EditOrderForm order={order} products={products} />
    </div>
  );
}
