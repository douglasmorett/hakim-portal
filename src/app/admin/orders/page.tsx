import { prisma } from "@/lib/prisma";
import { prismaFirehub } from "@/lib/prismaFirehub";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import AdminOrderCard from "@/components/AdminOrderCard";
import { getNextDeliveryInfo } from "@/lib/deliveryDates";
import Link from "next/link";

export const dynamic = "force-dynamic";

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

  // FireHub DB não tem todas as colunas do Hakim (ex: emergencyFine, isEmergency, etc.)
  // Precisamos usar select explícito para o FireHub e adicionar defaults depois
  const firehubSelect = {
    id: true, userId: true, totalAmount: true, status: true, createdAt: true, updatedAt: true,
    user: { select: { id: true, name: true, email: true, city: true, storeName: true, cpfCnpj: true } },
    items: { select: { id: true, orderId: true, productId: true, quantity: true, price: true, product: true } },
    history: { orderBy: { createdAt: "desc" as const } as const, select: { id: true, orderId: true, statusFrom: true, statusTo: true, actionBy: true, actionEmail: true, notes: true, createdAt: true } },
  };

  // Buscar pedidos dos DOIS bancos em paralelo
  const [hakimOrders, rawFirehubOrders] = await Promise.all([
    prisma.order.findMany({
      include: includeClause,
      orderBy: { createdAt: 'desc' },
      where: whereClause,
    }).catch(err => { console.error("[Orders] Erro banco Hakim:", err); return []; }),
    prismaFirehub.order.findMany({
      select: firehubSelect,
      orderBy: { createdAt: 'desc' },
      where: whereClause,
    }).catch(err => { console.error("[Orders] Erro banco FireHub:", err); return []; }),
  ]);

  // Adicionar defaults para colunas que não existem no FireHub
  const firehubOrders = rawFirehubOrders.map((o: any) => ({
    ...o,
    boletoUrl: null,
    asaasPaymentId: null,
    deliveryDate: null,
    cancelReason: null,
    emergencyStatus: null,
    emergencyFine: 0,
    isEmergency: false,
    rejectionReason: null,
  }));

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
            let deliveryInfo;
            try {
              deliveryInfo = await getNextDeliveryInfo(order.user?.city || null);
            } catch {
              deliveryInfo = { limitStr: "Erro ao calcular", deliveryStr: "A definir" };
            }
            return (
              <AdminOrderCard key={order.id} order={order} deliveryInfo={deliveryInfo} />
            );
          }))}
        </div>
      )}
    </div>
  );
}
