"use client";
import { useState, useMemo } from "react";
import {
  TrendingUp, TrendingDown, DollarSign, ShoppingBag,
  BarChart2, ArrowUpRight, ArrowDownRight, Download, Filter,
  Package, Truck, CreditCard, Percent, Users
} from "lucide-react";
import { calcMensalidade, FIREHUB_PLAN } from "@/lib/firehub-billing";

type OrderItem = { quantity: number; price: number; cost: number; name: string };
type Order = {
  id: string; totalAmount: number; deliveryFee: number; motoboyFee: number;
  deliveryDistance: number; status: string; deliveryType: string;
  paymentMethod: string; source: string; createdAt: string;
  items: OrderItem[]; motoboy: any;
};

// Configura taxa por forma de pagamento (padrão FireHub)
const DEFAULT_GATEWAY_FEES: Record<string, number> = {
  PIX: 0.5, CREDITO: 2.99, DEBITO: 1.5, DINHEIRO: 0, VOUCHER: 5.0
};

// Plataforma FireHub — Pay as You Grow
// < R$6.250/mês: 4% (mín R$60) | ≥ R$6.250/mês: R$250 fixo
function calcPlatformFee(total: number): number {
  return calcMensalidade(total).mensalidade;
}

const PERIOD_PRESETS = [
  { label: "Hoje", days: 0 },
  { label: "7 dias", days: 7 },
  { label: "15 dias", days: 15 },
  { label: "30 dias", days: 30 },
  { label: "90 dias", days: 90 },
  { label: "Este mês", days: -1 },
];

function getRange(preset: number): { from: Date; to: Date } {
  const to = new Date();
  if (preset === 0) {
    const from = new Date(to); from.setHours(0, 0, 0, 0);
    return { from, to };
  }
  if (preset === -1) {
    const from = new Date(to.getFullYear(), to.getMonth(), 1);
    return { from, to };
  }
  const from = new Date(to); from.setDate(to.getDate() - preset);
  return { from, to };
}

function fmtR(v: number) { return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`; }
function fmtPct(v: number) { return `${v.toFixed(1)}%`; }

function KPICard({ icon, label, value, sub, color, trend }: any) {
  return (
    <div style={{
      background: "#fff", borderRadius: "16px", padding: "20px 22px",
      boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: "1px solid #F1F5F9",
      display: "flex", flexDirection: "column", gap: "8px"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ width: 40, height: 40, borderRadius: "10px", background: color + "15", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {icon}
        </div>
        {trend !== undefined && (
          <span style={{ fontSize: "0.75rem", fontWeight: 700, color: trend >= 0 ? "#16A34A" : "#DC2626", display: "flex", alignItems: "center", gap: "2px" }}>
            {trend >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>
      <div>
        <p style={{ fontSize: "0.78rem", color: "#64748B", margin: 0 }}>{label}</p>
        <p style={{ fontSize: "1.35rem", fontWeight: 800, color: "#0F172A", margin: 0 }}>{value}</p>
        {sub && <p style={{ fontSize: "0.72rem", color: "#94A3B8", margin: 0 }}>{sub}</p>}
      </div>
    </div>
  );
}

function DRERow({ label, value, indent = 0, bold = false, color = "#0F172A", border = false }: any) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: `${border ? "12px" : "8px"} ${16 + indent * 16}px`,
      borderTop: border ? "2px solid #E2E8F0" : "1px solid #F1F5F9",
      fontWeight: bold ? 800 : 400, fontSize: bold ? "0.95rem" : "0.87rem"
    }}>
      <span style={{ color: "#475569" }}>{label}</span>
      <span style={{ color, fontWeight: bold ? 800 : 600 }}>{typeof value === "number" ? fmtR(value) : value}</span>
    </div>
  );
}

export default function DREClient({ orders, paymentFees, storeName, storeCreatedAt }: { orders: Order[]; paymentFees: any; storeName: string; storeCreatedAt?: string }) {
  const [preset, setPreset] = useState(1); // 7 dias default
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [activeTab, setActiveTab] = useState<"dre" | "extrato" | "pagamentos">("dre");

  const { from, to } = useMemo(() => {
    if (useCustom && customFrom && customTo) {
      return { from: new Date(customFrom + "T00:00"), to: new Date(customTo + "T23:59") };
    }
    return getRange(PERIOD_PRESETS[preset].days);
  }, [preset, useCustom, customFrom, customTo]);

  const filtered = useMemo(() =>
    orders.filter(o => {
      const d = new Date(o.createdAt);
      return d >= from && d <= to && o.status !== "CANCELADO";
    }), [orders, from, to]);

  const cancelled = useMemo(() => orders.filter(o => {
    const d = new Date(o.createdAt); return d >= from && d <= to && o.status === "CANCELADO";
  }), [orders, from, to]);

  const allInRange = useMemo(() => orders.filter(o => {
    const d = new Date(o.createdAt); return d >= from && d <= to;
  }), [orders, from, to]);

  // ===== CÁLCULOS DRE =====
  const dre = useMemo(() => {
    const receitaBruta = filtered.reduce((s, o) => s + o.totalAmount, 0);
    const totalFrete = filtered.reduce((s, o) => s + (o.deliveryFee || 0), 0);
    const receitaSemFrete = receitaBruta - totalFrete;

    // CMV (custo dos produtos)
    const cmv = filtered.reduce((s, o) =>
      s + o.items.reduce((si, i) => si + (i.cost || 0) * i.quantity, 0), 0);

    // Taxa de gateway por forma de pagamento
    const taxaGateway = filtered.reduce((s, o) => {
      const pm = (o.paymentMethod || "DINHEIRO").toUpperCase();
      const fees = paymentFees || {};
      let rate = 0;
      if (fees[pm] && typeof fees[pm] === "object") rate = fees[pm].rate || 0;
      else rate = DEFAULT_GATEWAY_FEES[pm] || 0;
      return s + (o.totalAmount * (rate / 100));
    }, 0);

    // Custo de motoboy
    const custoMotoboy = filtered
      .filter(o => o.deliveryType === "DELIVERY")
      .reduce((s, o) => s + (o.motoboyFee || 0), 0);

    // Taxa FireHub (Pay as You Grow)
    const taxaFireHub = calcPlatformFee(receitaBruta);

    // DRE
    const lucro1 = receitaSemFrete - cmv;  // Lucro Bruto
    const despesasOp = taxaGateway + custoMotoboy;
    const ebitda = lucro1 - despesasOp;
    const lucroLiquido = ebitda - taxaFireHub;

    // Totais
    const totalPedidos = filtered.length;
    const ticketMedio = totalPedidos > 0 ? receitaBruta / totalPedidos : 0;
    const delivery = filtered.filter(o => o.deliveryType === "DELIVERY").length;
    const retirada = filtered.filter(o => o.deliveryType === "RETIRADA").length;
    const margemLiquida = receitaBruta > 0 ? (lucroLiquido / receitaBruta) * 100 : 0;
    const margemCMV = receitaSemFrete > 0 ? (cmv / receitaSemFrete) * 100 : 0;

    return {
      receitaBruta, totalFrete, receitaSemFrete, cmv, taxaGateway,
      custoMotoboy, taxaFireHub, lucro1, despesasOp, ebitda, lucroLiquido,
      totalPedidos, ticketMedio, delivery, retirada, margemLiquida, margemCMV,
      cancelados: cancelled.length
    };
  }, [filtered, cancelled, paymentFees]);

  // Grupos por forma de pagamento
  const paymentGroups = useMemo(() => {
    const g: Record<string, { count: number; total: number }> = {};
    allInRange.forEach(o => {
      const pm = o.paymentMethod || "Não informado";
      if (!g[pm]) g[pm] = { count: 0, total: 0 };
      g[pm].count++;
      g[pm].total += o.totalAmount;
    });
    return Object.entries(g).sort((a, b) => b[1].total - a[1].total);
  }, [allInRange]);

  const tabStyle = (tab: string) => ({
    padding: "8px 20px", borderRadius: "10px", border: "none", cursor: "pointer",
    fontWeight: 700, fontSize: "0.85rem", fontFamily: "inherit",
    background: activeTab === tab ? "#0F172A" : "transparent",
    color: activeTab === tab ? "#fff" : "#64748B",
    transition: "all 0.2s"
  });

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: "#F8FAFC", minHeight: "100vh" }}>
      {/* HEADER */}
      <div style={{ background: "#fff", borderBottom: "1px solid #E2E8F0", padding: "1rem 1.5rem" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <h1 style={{ fontWeight: 800, fontSize: "1.4rem", margin: 0 }}>📊 DRE — Demonstrativo de Resultado</h1>
              <p style={{ fontSize: "0.8rem", color: "#64748B", margin: 0 }}>{storeName}</p>
            </div>
            {/* FILTROS DE PERÍODO */}
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
              {PERIOD_PRESETS.map((p, i) => (
                <button key={i}
                  onClick={() => { setPreset(i); setUseCustom(false); }}
                  style={{
                    padding: "6px 14px", borderRadius: "10px", border: "none", cursor: "pointer",
                    fontWeight: 700, fontSize: "0.8rem", fontFamily: "inherit",
                    background: !useCustom && preset === i ? "#0F172A" : "#F1F5F9",
                    color: !useCustom && preset === i ? "#fff" : "#475569",
                    transition: "all 0.2s"
                  }}>
                  {p.label}
                </button>
              ))}
              <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                <input type="date" value={customFrom} onChange={e => { setCustomFrom(e.target.value); setUseCustom(true); }}
                  style={{ padding: "5px 8px", borderRadius: "8px", border: "1.5px solid #E2E8F0", fontSize: "0.78rem" }} />
                <span style={{ fontSize: "0.75rem", color: "#94A3B8" }}>até</span>
                <input type="date" value={customTo} onChange={e => { setCustomTo(e.target.value); setUseCustom(true); }}
                  style={{ padding: "5px 8px", borderRadius: "8px", border: "1.5px solid #E2E8F0", fontSize: "0.78rem" }} />
              </div>
            </div>
          </div>

          {/* TABS */}
          <div style={{ display: "flex", gap: "4px", marginTop: "1rem", background: "#F8FAFC", borderRadius: "12px", padding: "4px", width: "fit-content" }}>
            <button style={tabStyle("dre")} onClick={() => setActiveTab("dre")}>📊 DRE</button>
            <button style={tabStyle("extrato")} onClick={() => setActiveTab("extrato")}>📋 Extrato</button>
            <button style={tabStyle("pagamentos")} onClick={() => setActiveTab("pagamentos")}>💳 Pagamentos</button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "1.5rem" }}>

        {/* ===== KPIs ===== */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
          <KPICard icon={<DollarSign size={18} color="#16A34A" />} label="Receita Bruta" value={fmtR(dre.receitaBruta)} sub={`${dre.totalPedidos} pedidos`} color="#16A34A" />
          <KPICard icon={<TrendingUp size={18} color="#3B82F6" />} label="Lucro Líquido" value={fmtR(dre.lucroLiquido)} sub={`Margem: ${fmtPct(dre.margemLiquida)}`} color="#3B82F6" />
          <KPICard icon={<ShoppingBag size={18} color="#8B5CF6" />} label="Ticket Médio" value={fmtR(dre.ticketMedio)} sub={`Delivery: ${dre.delivery} | Retirada: ${dre.retirada}`} color="#8B5CF6" />
          <KPICard icon={<Package size={18} color="#F59E0B" />} label="CMV (Custo Produto)" value={fmtR(dre.cmv)} sub={`${fmtPct(dre.margemCMV)} da receita`} color="#F59E0B" />
          <KPICard icon={<Truck size={18} color="#06B6D4" />} label="Custo Motoboy" value={fmtR(dre.custoMotoboy)} sub={`${dre.delivery} entregas`} color="#06B6D4" />
          <KPICard icon={<Users size={18} color="#EC4899" />} label="Cancelamentos" value={`${dre.cancelados}`} sub="pedidos cancelados" color="#EC4899" />
        </div>

        {/* ===== ABA DRE ===== */}
        {activeTab === "dre" && (
          <div style={{ background: "#fff", borderRadius: "16px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", overflow: "hidden" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #F1F5F9", display: "flex", alignItems: "center", gap: "8px" }}>
              <BarChart2 size={20} color="#0F172A" />
              <h2 style={{ fontWeight: 800, fontSize: "1.05rem", margin: 0 }}>
                Demonstrativo de Resultado — {from.toLocaleDateString("pt-BR")} a {to.toLocaleDateString("pt-BR")}
              </h2>
            </div>

            {/* RECEITAS */}
            <div style={{ padding: "12px 24px 4px", background: "#F0FDF4" }}>
              <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "#16A34A", letterSpacing: 1 }}>RECEITAS</span>
            </div>
            <DRERow label="(+) Receita Bruta Total" value={dre.receitaBruta} bold />
            <DRERow label="    Receita de Produtos" value={dre.receitaSemFrete} indent={1} />
            <DRERow label="    Taxa de Entrega Cobrada" value={dre.totalFrete} indent={1} />

            {/* CMV */}
            <div style={{ padding: "12px 24px 4px", background: "#FFF7ED" }}>
              <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "#EA580C", letterSpacing: 1 }}>CUSTO DOS PRODUTOS VENDIDOS</span>
            </div>
            <DRERow label="(-) CMV — Custo das Mercadorias" value={-dre.cmv} color={dre.cmv > 0 ? "#DC2626" : "#0F172A"} />
            <DRERow label="(=) LUCRO BRUTO" value={dre.lucro1} bold color={dre.lucro1 >= 0 ? "#16A34A" : "#DC2626"} border />

            {/* DESPESAS OPERACIONAIS */}
            <div style={{ padding: "12px 24px 4px", background: "#FFF1F2" }}>
              <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "#E11D48", letterSpacing: 1 }}>DESPESAS OPERACIONAIS</span>
            </div>
            <DRERow label="(-) Taxa de Pagamento (Gateway)" value={-dre.taxaGateway} color="#DC2626" />
            <DRERow label="(-) Custo de Entrega (Motoboy)" value={-dre.custoMotoboy} color="#DC2626" />
            <DRERow label="(=) EBITDA" value={dre.ebitda} bold color={dre.ebitda >= 0 ? "#16A34A" : "#DC2626"} border />

            {/* TAXA FIREHUB */}
            <div style={{ padding: "12px 24px 4px", background: "#F0F9FF" }}>
              <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "#0369A1", letterSpacing: 1 }}>PLATAFORMA FIREHUB</span>
            </div>
            <DRERow label={`(-) Mensalidade FireHub (4% · mín R$60 · teto R$${FIREHUB_PLAN.MAX_MONTHLY})`} value={-dre.taxaFireHub} color="#0369A1" />
            <div style={{ padding: "6px 24px 10px", background: "#F0F9FF" }}>
              <span style={{ fontSize: "0.72rem", color: "#0369A1" }}>
                {dre.receitaBruta >= FIREHUB_PLAN.THRESHOLD
                  ? `✅ Teto atingido — R$${FIREHUB_PLAN.MAX_MONTHLY} fixo (faturamento ≥ R$${FIREHUB_PLAN.THRESHOLD.toLocaleString("pt-BR")})`
                  : `📊 ${FIREHUB_PLAN.PERCENT_RATE}% de R$${dre.receitaBruta.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} — aumenta até R$${FIREHUB_PLAN.MAX_MONTHLY} teto`
                }
              </span>
            </div>
            <div style={{ background: dre.lucroLiquido >= 0 ? "#F0FDF4" : "#FFF1F2", borderTop: "2px solid #E2E8F0" }}>
              <DRERow label="(=) LUCRO LÍQUIDO FINAL" value={dre.lucroLiquido} bold color={dre.lucroLiquido >= 0 ? "#16A34A" : "#DC2626"} />
            </div>

            {/* Margem visual */}
            <div style={{ padding: "20px 24px", borderTop: "1px solid #F1F5F9" }}>
              <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap" }}>
                {[
                  { label: "Margem Bruta", val: dre.receitaBruta > 0 ? (dre.lucro1 / dre.receitaBruta) * 100 : 0, color: "#F59E0B" },
                  { label: "Margem EBITDA", val: dre.receitaBruta > 0 ? (dre.ebitda / dre.receitaBruta) * 100 : 0, color: "#3B82F6" },
                  { label: "Margem Líquida", val: dre.margemLiquida, color: "#16A34A" },
                ].map((m, i) => (
                  <div key={i} style={{ flex: 1, minWidth: 160 }}>
                    <p style={{ fontSize: "0.75rem", color: "#64748B", margin: "0 0 4px" }}>{m.label}</p>
                    <div style={{ background: "#F1F5F9", borderRadius: "6px", height: "8px", overflow: "hidden" }}>
                      <div style={{ width: `${Math.min(100, Math.max(0, m.val))}%`, height: "100%", background: m.color, borderRadius: "6px", transition: "width 0.5s" }} />
                    </div>
                    <p style={{ fontSize: "0.85rem", fontWeight: 800, color: m.color, margin: "4px 0 0" }}>{fmtPct(m.val)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===== ABA EXTRATO ===== */}
        {activeTab === "extrato" && (
          <div style={{ background: "#fff", borderRadius: "16px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", overflow: "hidden" }}>
            <div style={{ padding: "16px 24px", borderBottom: "1px solid #F1F5F9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontWeight: 800, fontSize: "1rem", margin: 0 }}>📋 Extrato de Pedidos ({allInRange.length})</h2>
              <span style={{ fontSize: "0.8rem", color: "#64748B" }}>
                Total: <strong style={{ color: "#16A34A" }}>{fmtR(filtered.reduce((s, o) => s + o.totalAmount, 0))}</strong>
              </span>
            </div>
            <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
              {allInRange.length === 0 ? (
                <div style={{ textAlign: "center", padding: "3rem", color: "#94A3B8" }}>Nenhum pedido neste período.</div>
              ) : allInRange.map(o => {
                const isCancelled = o.status === "CANCELADO";
                return (
                  <div key={o.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 24px", borderBottom: "1px solid #F8FAFC", opacity: isCancelled ? 0.5 : 1 }}>
                    <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                      <div style={{ width: 32, height: 32, borderRadius: "8px", background: isCancelled ? "#FEE2E2" : "#F0FDF4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.9rem" }}>
                        {isCancelled ? "❌" : o.deliveryType === "DELIVERY" ? "🛵" : "🏪"}
                      </div>
                      <div>
                        <p style={{ fontWeight: 700, fontSize: "0.85rem", margin: 0 }}>#{o.id.slice(-6).toUpperCase()}</p>
                        <p style={{ fontSize: "0.73rem", color: "#94A3B8", margin: 0 }}>
                          {new Date(o.createdAt).toLocaleString("pt-BR")} · {o.paymentMethod || "Não informado"}
                        </p>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ fontWeight: 800, fontSize: "0.9rem", color: isCancelled ? "#DC2626" : "#16A34A", margin: 0 }}>
                        {isCancelled ? "-" : "+"}{fmtR(o.totalAmount)}
                      </p>
                      {o.deliveryFee > 0 && <p style={{ fontSize: "0.7rem", color: "#94A3B8", margin: 0 }}>+{fmtR(o.deliveryFee)} frete</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ===== ABA PAGAMENTOS ===== */}
        {activeTab === "pagamentos" && (
          <div style={{ background: "#fff", borderRadius: "16px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", overflow: "hidden" }}>
            <div style={{ padding: "16px 24px", borderBottom: "1px solid #F1F5F9" }}>
              <h2 style={{ fontWeight: 800, fontSize: "1rem", margin: 0 }}>💳 Breakdown por Forma de Pagamento</h2>
            </div>
            {paymentGroups.length === 0 ? (
              <div style={{ textAlign: "center", padding: "3rem", color: "#94A3B8" }}>Nenhum dado neste período.</div>
            ) : (
              <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: "12px" }}>
                {paymentGroups.map(([pm, g], i) => {
                  const totalBruto = allInRange.reduce((s, o) => s + o.totalAmount, 0);
                  const pct = totalBruto > 0 ? (g.total / totalBruto) * 100 : 0;
                  const PM_COLORS: Record<string, string> = {
                    PIX: "#00BFA5", DINHEIRO: "#4CAF50", CREDITO: "#9C27B0",
                    DEBITO: "#2196F3", VOUCHER: "#E65100"
                  };
                  const color = PM_COLORS[(pm || "").toUpperCase()] || "#64748B";
                  return (
                    <div key={i}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                        <span style={{ fontWeight: 700, fontSize: "0.88rem" }}>{pm || "Não informado"}</span>
                        <div style={{ textAlign: "right" }}>
                          <span style={{ fontWeight: 800, color }}>{fmtR(g.total)}</span>
                          <span style={{ fontSize: "0.75rem", color: "#94A3B8", marginLeft: "8px" }}>{g.count} pedidos · {fmtPct(pct)}</span>
                        </div>
                      </div>
                      <div style={{ background: "#F1F5F9", borderRadius: "6px", height: "8px", overflow: "hidden" }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: "6px", transition: "width 0.5s" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 768px) {
          div[style*="grid-template-columns"] { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 480px) {
          div[style*="grid-template-columns"] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
