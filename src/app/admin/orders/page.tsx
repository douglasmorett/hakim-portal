import { prisma } from "@/lib/prisma";
import { prismaFirehub } from "@/lib/prismaFirehub";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import AdminOrderCard from "@/components/AdminOrderCard";
import { getNextDeliveryInfo } from "@/lib/deliveryDates";
import Link from "next/link";

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const session = await getServerSession(authOptions);
  const { tab } = await searchParams;
  const currentTab = tab === "cancelados" ? "cancelados" : "ativos";

  const whereClause = currentTab === "cancelados" 
    ? { status: "CANCELADO" } 
    : { status: { not: "CANCELADO" } };

  const includeClause = {
    user: true,
    items: { include: { product: true } },
    history: { orderBy: { createdAt: "desc" as const } }
  };

  // Buscar pedidos dos DOIS bancos em paralelo
  const [hakimOrders, firehubOrders] = await Promise.all([
    prisma.order.findMany({
      include: includeClause,
      orderBy: { createdAt: 'desc' },
      where: whereClause,
    }).catch(err => { console.error("[Orders] Erro banco Hakim:", err); return []; }),
    prismaFirehub.order.findMany({
      include: includeClause,
      orderBy: { createdAt: 'desc' },
      where: whereClause,
    }).catch(err => { console.error("[Orders] Erro banco FireHub:", err); return []; }),
  ]);

  // Mesclar e remover duplicatas (por ID), ordenar por data
  const seen = new Set<string>();
  const allOrders = [...hakimOrders, ...firehubOrders]
    .filter(o => { if (seen.has(o.id)) return false; seen.add(o.id); return true; })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const orders = allOrders;

  return (
    <div>
      <h1 className="font-bold mb-6" style={{ fontSize: "2rem" }}>Gestão de Pedidos</h1>
      
      <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem", borderBottom: "2px solid var(--border-color)", paddingBottom: "0.5rem" }}>
        <Link 
          href="/admin/orders?tab=ativos" 
          style={{ 
            padding: "0.5rem 1rem", 
            fontWeight: "bold", 
            borderBottom: currentTab === "ativos" ? "3px solid var(--primary)" : "none",
            color: currentTab === "ativos" ? "var(--primary)" : "var(--text-muted)"
          }}
        >
          Pedidos Ativos
        </Link>
        <Link 
          href="/admin/orders?tab=cancelados" 
          style={{ 
            padding: "0.5rem 1rem", 
            fontWeight: "bold", 
            borderBottom: currentTab === "cancelados" ? "3px solid var(--danger)" : "none",
            color: currentTab === "cancelados" ? "var(--danger)" : "var(--text-muted)"
          }}
        >
          Cancelados
        </Link>
      </div>
      
      {orders.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-muted">Nenhum pedido realizado pelas franquias ainda.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {await Promise.all(orders.map(async order => {
            const deliveryInfo = await getNextDeliveryInfo(order.user?.city || null);
            return (
              <AdminOrderCard key={order.id} order={order} deliveryInfo={deliveryInfo} />
            );
          }))}
        </div>
      )}
    </div>
  );
}
