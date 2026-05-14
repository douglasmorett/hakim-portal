import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ShoppingCart, ExternalLink, Clock, CheckCircle2, XCircle, ArrowLeft } from "lucide-react";

const STATUS_LABEL: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  PENDING_PAYMENT: { label: "Aguardando Pagamento", color: "#F59E0B", icon: <Clock size={14} /> },
  PAID:            { label: "Pago", color: "#22C55E", icon: <CheckCircle2 size={14} /> },
  CONFIRMED:       { label: "Confirmado", color: "#3B82F6", icon: <CheckCircle2 size={14} /> },
  PROCESSING:      { label: "Em Processamento", color: "#8B5CF6", icon: <Clock size={14} /> },
  SHIPPED:         { label: "Enviado", color: "#06B6D4", icon: <Clock size={14} /> },
  DELIVERED:       { label: "Entregue", color: "#22C55E", icon: <CheckCircle2 size={14} /> },
  CANCELADO:       { label: "Cancelado", color: "#EF4444", icon: <XCircle size={14} /> },
  CANCELLED:       { label: "Cancelado", color: "#EF4444", icon: <XCircle size={14} /> },
};

function fmt(v: number) {
  return `R$ ${v.toFixed(2).replace(".", ",")}`;
}

function fmtDate(d: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(d));
}

export default async function MeusPedidosPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const role = (session.user as any)?.role;
  // Só FRANCHISEE e ADMIN podem acessar
  if (role !== "FRANCHISEE" && role !== "ADMIN") redirect("/admin");

  const user = await prisma.user.findUnique({
    where: { email: session.user?.email || "" },
    select: { id: true, name: true, role: true },
  });
  if (!user) redirect("/login");

  // FRANCHISEE vê só seus próprios pedidos. ADMIN vê todos.
  const orders = await prisma.order.findMany({
    where: user.role === "FRANCHISEE" ? { userId: user.id } : {},
    include: {
      items: { include: { product: true } },
      user: { select: { name: true, storeName: true, city: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const total = orders.reduce((s, o) => s + o.totalAmount, 0);
  const pagos = orders.filter(o => o.status === "PAID" || o.status === "DELIVERED" || o.status === "CONFIRMED").length;
  const pendentes = orders.filter(o => o.status === "PENDING_PAYMENT").length;
  const cancelados = orders.filter(o => o.status === "CANCELADO" || o.status === "CANCELLED").length;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}>
        <Link href="/admin" style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "linear-gradient(135deg, #EF4444, #DC2626)",
          color: "#fff", padding: "10px 20px", borderRadius: 10,
          fontWeight: 700, fontSize: ".9rem", textDecoration: "none",
          boxShadow: "0 4px 15px rgba(239,68,68,0.3)",
        }}>
          <ArrowLeft size={16} /> Voltar ao Painel
        </Link>
        <div>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 800, margin: 0 }}>
            <ShoppingCart size={22} style={{ verticalAlign: "middle", marginRight: 8, color: "#EF4444" }} />
            Meus Pedidos
          </h1>
          <p style={{ margin: 0, color: "var(--text-muted)", fontSize: ".85rem" }}>
            Visualize seus pedidos, links de pagamento e status — apenas leitura
          </p>
        </div>
      </div>

      {/* Cards de resumo */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 28 }}>
        {[
          { label: "Total de Pedidos", value: orders.length, color: "#3B82F6" },
          { label: "Pagos / Confirmados", value: pagos, color: "#22C55E" },
          { label: "Aguardando Pagamento", value: pendentes, color: "#F59E0B" },
          { label: "Cancelados", value: cancelados, color: "#EF4444" },
          { label: "Valor Total Pago", value: fmt(total), color: "#8B5CF6" },
        ].map(card => (
          <div key={card.label} style={{
            background: "var(--surface)",
            border: "1px solid var(--border-color)",
            borderRadius: 12,
            padding: "16px 18px",
            borderTop: `3px solid ${card.color}`,
          }}>
            <p style={{ margin: 0, fontSize: ".75rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: .5 }}>
              {card.label}
            </p>
            <p style={{ margin: "6px 0 0", fontSize: "1.5rem", fontWeight: 800, color: card.color }}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Aviso somente leitura */}
      <div style={{
        background: "rgba(59,130,246,0.08)",
        border: "1px solid rgba(59,130,246,0.25)",
        borderRadius: 10, padding: "10px 16px",
        display: "flex", alignItems: "center", gap: 10,
        marginBottom: 20, fontSize: ".85rem", color: "#3B82F6",
      }}>
        🔒 <strong>Visualização apenas</strong> — alterações de status são feitas pela equipe Hakim.
      </div>

      {/* Lista de pedidos */}
      {orders.length === 0 ? (
        <div style={{
          background: "var(--surface)", border: "1px solid var(--border-color)",
          borderRadius: 14, padding: "3rem", textAlign: "center",
        }}>
          <ShoppingCart size={48} style={{ color: "var(--text-muted)", opacity: .4, marginBottom: 12 }} />
          <p style={{ color: "var(--text-muted)" }}>Nenhum pedido encontrado.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {orders.map(order => {
            const st = STATUS_LABEL[order.status] || { label: order.status, color: "#6B7280", icon: null };
            const boletoUrl = order.boletoUrl;
            return (
              <div key={order.id} style={{
                background: "var(--surface)",
                border: "1px solid var(--border-color)",
                borderRadius: 14,
                padding: "18px 20px",
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: 16,
                alignItems: "start",
              }}>
                {/* Info esquerda */}
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      background: `${st.color}18`,
                      color: st.color,
                      border: `1px solid ${st.color}40`,
                      padding: "3px 10px", borderRadius: 20,
                      fontSize: ".8rem", fontWeight: 700,
                    }}>
                      {st.icon} {st.label}
                    </span>
                    {order.isEmergency && (
                      <span style={{
                        background: "rgba(239,68,68,0.1)", color: "#EF4444",
                        border: "1px solid rgba(239,68,68,0.3)",
                        padding: "2px 8px", borderRadius: 20, fontSize: ".75rem", fontWeight: 700,
                      }}>⚡ Emergência</span>
                    )}
                  </div>

                  <p style={{ margin: "0 0 4px", fontSize: ".95rem", fontWeight: 700 }}>
                    Pedido #{order.id.slice(-8).toUpperCase()}
                  </p>
                  <p style={{ margin: "0 0 2px", fontSize: ".82rem", color: "var(--text-muted)" }}>
                    📅 {fmtDate(order.createdAt)}
                  </p>

                  {/* Itens */}
                  <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {order.items.map(item => (
                      <span key={item.id} style={{
                        background: "var(--bg-color)", border: "1px solid var(--border-color)",
                        padding: "3px 10px", borderRadius: 8, fontSize: ".78rem",
                      }}>
                        {item.quantity}x {item.product?.name || "Produto"}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Info direita */}
                <div style={{ textAlign: "right", minWidth: 160 }}>
                  <p style={{ margin: "0 0 4px", fontSize: "1.2rem", fontWeight: 800, color: "#22C55E" }}>
                    {fmt(order.totalAmount)}
                  </p>
                  {order.asaasPaymentId && (
                    <p style={{ margin: "0 0 8px", fontSize: ".72rem", color: "var(--text-muted)" }}>
                      ID: {order.asaasPaymentId.slice(0, 16)}...
                    </p>
                  )}

                  {/* Link de pagamento - só se ainda não pago */}
                  {boletoUrl && order.status === "PENDING_PAYMENT" && (
                    <a
                      href={boletoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        background: "linear-gradient(135deg, #F59E0B, #D97706)",
                        color: "#fff", padding: "8px 14px",
                        borderRadius: 8, fontSize: ".82rem", fontWeight: 700,
                        textDecoration: "none", boxShadow: "0 3px 10px rgba(245,158,11,0.3)",
                      }}
                    >
                      💳 Pagar Agora <ExternalLink size={13} />
                    </a>
                  )}
                  {(order.status === "PAID" || order.status === "CONFIRMED" || order.status === "DELIVERED") && (
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      color: "#22C55E", fontWeight: 700, fontSize: ".85rem",
                    }}>
                      <CheckCircle2 size={16} /> Pagamento confirmado
                    </span>
                  )}
                  {(order.status === "CANCELADO" || order.status === "CANCELLED") && (
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      color: "#EF4444", fontWeight: 700, fontSize: ".85rem",
                    }}>
                      <XCircle size={16} /> Pedido cancelado
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
