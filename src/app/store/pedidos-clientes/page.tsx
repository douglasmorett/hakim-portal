import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import CustomerOrdersList from "@/components/admin/CustomerOrdersList";
import Link from "next/link";

export default async function FranchiseeCustomerOrdersPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/");

  const user = await prisma.user.findUnique({
    where: { email: session.user?.email || "" }
  });
  if (!user) redirect("/");

  const orders = await prisma.customerOrder.findMany({
    where: { franchiseeId: user.id },
    include: {
      items: { include: { menuProduct: true } },
      franchisee: { select: { name: true, storeName: true, city: true, slug: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  const storeUrl = user.slug ? `${process.env.NEXTAUTH_URL || "https://hakim-portal.vercel.app"}/loja/${user.slug}` : null;

  return (
    <div className="container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
        <div>
          <h1 className="font-bold" style={{ fontSize: "2rem" }}>📋 Pedidos dos Meus Clientes</h1>
          <p className="text-muted">Gerencie os pedidos que seus clientes fazem pelo site.</p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {storeUrl && (
            <button 
              onClick={() => { navigator.clipboard.writeText(storeUrl); alert("Link copiado!"); }}
              className="btn btn-outline"
              style={{ fontSize: "0.85rem" }}
            >
              🔗 Copiar Link da Loja
            </button>
          )}
          <Link href="/store" className="btn btn-primary" style={{ fontSize: "0.85rem" }}>
            🛒 Comprar com a Franquia
          </Link>
        </div>
      </div>

      <CustomerOrdersList orders={orders} isAdmin={false} />
    </div>
  );
}
