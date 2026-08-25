import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import EditOrderForm from "@/components/EditOrderForm";
import { findOrderInAnyDb } from "@/lib/orderDb";

export const dynamic = "force-dynamic";

export default async function AdminEditOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);

  if (!session || ((session.user as any)?.role !== "ADMIN" && (session.user as any)?.role !== "STAFF")) {
    redirect("/");
  }

  const { id } = await params;

  // O pedido pode estar no banco do Hakim ou no do FireHub
  const resolved = await findOrderInAnyDb(id);

  if (!resolved) {
    return <div className="container"><p>Pedido não encontrado.</p></div>;
  }

  const { order, client } = resolved;

  // Produtos precisam vir do MESMO banco do pedido — o productId do item
  // referencia a tabela Product daquele banco.
  const products = await client.product.findMany({
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
