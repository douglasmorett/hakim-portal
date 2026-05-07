"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Clock, MapPin, Phone, User, ChevronDown, ChevronUp, Search, ShoppingBag, ExternalLink, Settings, Store, Package, Bell, ToggleLeft, ToggleRight } from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; emoji: string; color: string; bg: string }> = {
  NOVO: { label: "Novos Pedidos", emoji: "🔔", color: "#3B82F6", bg: "#EFF6FF" },
  ACEITO: { label: "Aceito", emoji: "✅", color: "#10B981", bg: "#ECFDF5" },
  PREPARANDO: { label: "Em Preparo", emoji: "👨‍🍳", color: "#F59E0B", bg: "#FFFBEB" },
  SAIU_ENTREGA: { label: "Em Transporte/Finalizados", emoji: "🛵", color: "#8B5CF6", bg: "#F5F3FF" },
  ENTREGUE: { label: "Entregue", emoji: "📦", color: "#10B981", bg: "#ECFDF5" },
  CANCELADO: { label: "Cancelado", emoji: "❌", color: "#EF4444", bg: "#FEF2F2" },
};

function isStoreOpen(hours: any[]): { open: boolean; text: string } {
  if (!hours || !Array.isArray(hours)) return { open: true, text: "Sem horário" };
  const now = new Date();
  const dayIdx = now.getDay() === 0 ? 6 : now.getDay() - 1;
  const today = hours[dayIdx];
  if (!today || !today.active) return { open: false, text: "Fechado hoje" };
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const [oh, om] = today.open.split(":").map(Number);
  const [ch, cm] = today.close.split(":").map(Number);
  if (nowMin >= oh * 60 + om && nowMin <= ch * 60 + cm) return { open: true, text: `Aberto até ${today.close}` };
  return { open: false, text: "Fechado" };
}


export default function StoreOrdersDashboard({ user, orders: initialOrders, isFranqueado }: { user: any; orders: any[]; isFranqueado: boolean }) {
  const router = useRouter();
  const [orders, setOrders] = useState(initialOrders);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [now, setNow] = useState(new Date());
  const [autoAccept, setAutoAccept] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem("autoAcceptOrders") === "true";
    return false;
  });
  const prevOrderCount = useRef(initialOrders.filter(o => o.status === "NOVO").length);

  const storeName = user.storeName || user.name;
  const storeStatus = isStoreOpen(user.storeHours as any);
  const storeUrl = user.slug ? `https://hakim-portal.vercel.app/loja/${user.slug}` : null;

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // FAST POLLING — 1s via lightweight API
  useEffect(() => {
    let active = true;
    const poll = async () => {
      try {
        const res = await fetch("/api/customer-order/poll");
        if (res.ok && active) {
          const data = await res.json();
          setOrders(data);
        }
      } catch {}
      if (active) setTimeout(poll, 1000);
    };
    const timeout = setTimeout(poll, 1000);
    return () => { active = false; clearTimeout(timeout); };
  }, []);

  useEffect(() => { setOrders(initialOrders); }, [initialOrders]);

  // Auto-accept logic
  useEffect(() => {
    if (!autoAccept) return;
    const novos = orders.filter(o => o.status === "NOVO");
    novos.forEach(o => {
      updateStatus(o.id, "ACEITO");
    });
  }, [orders, autoAccept]);

  // Toggle auto accept
  const toggleAutoAccept = () => {
    const next = !autoAccept;
    setAutoAccept(next);
    localStorage.setItem("autoAcceptOrders", next.toString());
  };

  // Sound notification for new orders
  useEffect(() => {
    const currentNewCount = orders.filter(o => o.status === "NOVO").length;
    if (currentNewCount > prevOrderCount.current) {
      // Play notification sound
      try {
        const audio = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbsGczFj2markup+");
        audio.volume = 0.5;
        audio.play().catch(() => {});
      } catch {}
    }
    prevOrderCount.current = currentNewCount;
  }, [orders]);

  const updateStatus = async (orderId: string, newStatus: string) => {
    setLoadingId(orderId);
    try {
      const res = await fetch("/api/customer-order/status", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status: newStatus })
      });
      if (res.ok) {
        // Optimistic update
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
        router.refresh();
      }
      else alert("Erro ao atualizar.");
    } catch { alert("Erro."); } finally { setLoadingId(null); }
  };

  const filteredOrders = orders.filter(o => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return o.customerName?.toLowerCase().includes(s) || o.customerPhone?.includes(s) || o.customerAddress?.toLowerCase().includes(s) || o.id.includes(s);
  });

  const novos = filteredOrders.filter(o => o.status === "NOVO");
  const preparo = filteredOrders.filter(o => o.status === "ACEITO" || o.status === "PREPARANDO");
  const transporte = filteredOrders.filter(o => o.status === "SAIU_ENTREGA" || o.status === "ENTREGUE");

  const OrderCard = ({ order }: { order: any }) => {
    const expanded = expandedId === order.id;
    const st = STATUS_CONFIG[order.status] || STATUS_CONFIG.NOVO;
    const isLoading = loadingId === order.id;
    const mins = Math.floor((now.getTime() - new Date(order.createdAt).getTime()) / 60000);

    return (
      <div style={{ background: "#fff", borderRadius: "10px", border: `1.5px solid ${st.color}20`, marginBottom: "0.5rem", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <div onClick={() => setExpandedId(expanded ? null : order.id)} style={{ padding: "0.75rem 1rem", cursor: "pointer" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>#{order.id.slice(-6).toUpperCase()}</span>
              <span style={{ marginLeft: "0.5rem", fontSize: "0.75rem", color: "#64748B" }}>{mins < 60 ? `${mins}min` : `${Math.floor(mins/60)}h${mins%60}min`}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontWeight: 800, color: st.color }}>R$ {order.totalAmount.toFixed(2)}</span>
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.75rem", marginTop: "4px", fontSize: "0.8rem", color: "#64748B" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "3px" }}><User size={12} /> {order.customerName}</span>
            <span>{order.deliveryType === "DELIVERY" ? "🛵 Entrega" : "🏪 Retirada"}</span>
          </div>
        </div>

        {expanded && (
          <div style={{ padding: "0 1rem 0.75rem", borderTop: "1px solid #F1F5F9" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", margin: "0.75rem 0", fontSize: "0.82rem" }}>
              <div><span style={{ color: "#94A3B8" }}>Tel:</span> <a href={`https://wa.me/55${order.customerPhone?.replace(/\D/g,'')}`} target="_blank" style={{ color: "#25D366", fontWeight: 600 }}>{order.customerPhone}</a></div>
              {order.customerAddress && <div><span style={{ color: "#94A3B8" }}>End:</span> <strong>{order.customerAddress}</strong></div>}
            </div>
            {order.paymentMethod && <div style={{ fontSize: "0.78rem", color: "#64748B", marginBottom: "0.25rem" }}>💳 {order.paymentMethod}</div>}
            {order.notes && <div style={{ padding: "0.4rem 0.6rem", background: "#FFF7ED", borderRadius: "6px", fontSize: "0.8rem", marginBottom: "0.5rem" }}>💬 {order.notes}</div>}
            <div style={{ fontSize: "0.82rem", marginBottom: "0.5rem" }}>
              {order.items?.map((item: any) => (
                <div key={item.id} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
                  <span>{item.quantity}x {item.menuProduct?.name}</span>
                  <span style={{ fontWeight: 600 }}>R$ {(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            {order.status !== "ENTREGUE" && order.status !== "CANCELADO" && (
              <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                {order.status === "NOVO" && <>
                  <button disabled={isLoading} onClick={() => updateStatus(order.id, "ACEITO")} style={{ flex: 1, padding: "0.6rem 1rem", borderRadius: "8px", border: "none", background: "#10B981", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: "0.85rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>✅ Aceitar Pedido</button>
                  <button disabled={isLoading} onClick={() => updateStatus(order.id, "CANCELADO")} style={{ padding: "0.6rem 0.75rem", borderRadius: "8px", border: "1px solid #FCA5A5", background: "#fff", color: "#EF4444", fontWeight: 600, cursor: "pointer", fontSize: "0.82rem" }}>❌</button>
                </>}
                {order.status === "ACEITO" && <button disabled={isLoading} onClick={() => updateStatus(order.id, "PREPARANDO")} style={{ flex: 1, padding: "0.5rem", borderRadius: "8px", border: "none", background: "#F59E0B", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: "0.82rem" }}>👨‍🍳 Preparar</button>}
                {order.status === "PREPARANDO" && <button disabled={isLoading} onClick={() => updateStatus(order.id, "SAIU_ENTREGA")} style={{ flex: 1, padding: "0.5rem", borderRadius: "8px", border: "none", background: "#8B5CF6", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: "0.82rem" }}>🛵 Saiu Entrega</button>}
                {order.status === "SAIU_ENTREGA" && <button disabled={isLoading} onClick={() => updateStatus(order.id, "ENTREGUE")} style={{ flex: 1, padding: "0.5rem", borderRadius: "8px", border: "none", background: "#10B981", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: "0.82rem" }}>📦 Entregue</button>}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const Column = ({ title, emoji, color, count, children, headerExtra }: { title: string; emoji: string; color: string; count: number; children: React.ReactNode; headerExtra?: React.ReactNode }) => (
    <div style={{ flex: 1, minWidth: "300px", background: "#FAFAFA", borderRadius: "14px", border: "1px solid #E2E8F0", display: "flex", flexDirection: "column", minHeight: "calc(100vh - 175px)", maxHeight: "calc(100vh - 175px)" }}>
      <div style={{ padding: "0.85rem 1.25rem", borderBottom: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", borderRadius: "14px 14px 0 0", gap: "0.5rem" }}>
        <h3 style={{ fontWeight: 700, fontSize: "1.05rem", margin: 0 }}>{emoji} {title}</h3>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {headerExtra}
          <span style={{ background: color, color: "#fff", borderRadius: "20px", padding: "3px 12px", fontSize: "0.85rem", fontWeight: 700, minWidth: "28px", textAlign: "center" }}>{count}</span>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "0.75rem" }}>
        {count === 0 ? (
          <div style={{ textAlign: "center", padding: "4rem 0", color: "#94A3B8", fontSize: "0.9rem" }}>
            <Package size={40} style={{ opacity: 0.25, marginBottom: "0.75rem" }} />
            <p>Nenhum pedido</p>
          </div>
        ) : children}
      </div>
    </div>
  );

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* FILTER BAR */}
      <div style={{ background: "#fff", borderBottom: "1px solid #E2E8F0", padding: "0.5rem 1.5rem" }}>
        <div style={{ maxWidth: "1400px", margin: "0 auto", display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: 1, maxWidth: "400px" }}>
            <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94A3B8" }} />
            <input
              type="text" placeholder="Nome, número, telefone, endereço..."
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              style={{ width: "100%", padding: "0.5rem 0.5rem 0.5rem 36px", borderRadius: "10px", border: "1.5px solid #E2E8F0", fontSize: "0.85rem", outline: "none" }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginLeft: "auto" }}>
            <span style={{ fontSize: "0.8rem", color: "#64748B" }}>{user.city || ""}</span>
            <span style={{ fontSize: "1.1rem", fontWeight: 700 }}>
              {now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
            <span style={{ fontSize: "0.75rem", color: "#94A3B8" }}>
              {now.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
            </span>
          </div>
        </div>
      </div>

      {/* 3 COLUMNS */}
      <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "0.75rem 1.25rem" }}>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <Column
            title="Novos Pedidos" emoji="🔔" color="#3B82F6" count={novos.length}
            headerExtra={
              <button
                onClick={toggleAutoAccept}
                title={autoAccept ? "Auto-aceitar ATIVO" : "Auto-aceitar DESLIGADO"}
                style={{
                  display: "flex", alignItems: "center", gap: "4px", padding: "3px 8px",
                  borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "0.68rem", fontWeight: 700,
                  background: autoAccept ? "#DCFCE7" : "#F1F5F9",
                  color: autoAccept ? "#16A34A" : "#94A3B8",
                  transition: "all 0.2s"
                }}
              >
                {autoAccept ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                Auto
              </button>
            }
          >
            {novos.map(o => <OrderCard key={o.id} order={o} />)}
          </Column>
          <Column title="Em Preparo" emoji="👨‍🍳" color="#F59E0B" count={preparo.length}>
            {preparo.map(o => <OrderCard key={o.id} order={o} />)}
          </Column>
          <Column title="Em Transporte/Finalizados" emoji="🛵" color="#8B5CF6" count={transporte.length}>
            {transporte.map(o => <OrderCard key={o.id} order={o} />)}
          </Column>
        </div>
      </div>

      <style>{`
        @media(max-width: 900px) {
          div > div[style*="min-width: 300px"] { min-width: 100% !important; min-height: 300px !important; max-height: 50vh !important; }
        }
      `}</style>
    </div>
  );
}
