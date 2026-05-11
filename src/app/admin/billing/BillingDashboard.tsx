"use client";
import { useState, useEffect, useCallback } from "react";
import { DollarSign, TrendingDown, CheckCircle, Clock, AlertCircle, ChevronDown, ChevronUp, ExternalLink, RefreshCw, X } from "lucide-react";

type Cycle = {
  id: string;
  franchiseeId: string;
  franchiseeName: string;
  franchiseeEmail: string;
  city: string | null;
  planPercent: number;
  totalSales: number;
  amountDue: number;
  amountOffset: number;
  amountPending: number;
  status: string;
  closedAt: string | null;
  asaasBoletoUrl: string | null;
  asaasBoletoCode: string | null;
  offsetLog: any[] | null;
};

type WithoutCycle = {
  id: string; name: string; email: string; city: string | null; planPercent: number;
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  OPEN:     { label: "Em andamento", color: "#1565C0", bg: "#E3F2FD", icon: <Clock size={13} /> },
  CLOSED:   { label: "Fechado",      color: "#D97706", bg: "#FEF3C7", icon: <AlertCircle size={13} /> },
  PAID:     { label: "Pago",         color: "#15803D", bg: "#DCFCE7", icon: <CheckCircle size={13} /> },
  FORGIVEN: { label: "Zerado",       color: "#7C3AED", bg: "#F5F3FF", icon: <TrendingDown size={13} /> },
};

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function getYearMonth() {
  return new Date().toISOString().slice(0, 7);
}

export default function BillingDashboard() {
  const [yearMonth, setYearMonth] = useState(getYearMonth());
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [withoutCycle, setWithoutCycle] = useState<WithoutCycle[]>([]);
  const [loading, setLoading] = useState(false);
  const [closingId, setClosingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [planModal, setPlanModal] = useState<{ id: string; name: string; current: number } | null>(null);
  const [planValue, setPlanValue] = useState("");
  const [savingPlan, setSavingPlan] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: "ok" | "err" } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/billing/close-month?yearMonth=${yearMonth}`);
      const data = await res.json();
      setCycles(data.cycles ?? []);
      setWithoutCycle(data.withoutCycle ?? []);
    } finally {
      setLoading(false);
    }
  }, [yearMonth]);

  useEffect(() => { load(); }, [load]);

  const closeAll = async () => {
    if (!confirm(`Fechar o mês ${yearMonth} para todos os franqueados OPEN? Serão gerados links de cobrança onde necessário.`)) return;
    setClosingId("ALL");
    try {
      const res = await fetch("/api/billing/close-month", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ yearMonth }),
      });
      const data = await res.json();
      const errs = (data.results ?? []).filter((r: any) => !r.success);
      setMsg({ text: errs.length ? `Fechado com ${errs.length} erro(s)` : "Mês fechado com sucesso!", type: errs.length ? "err" : "ok" });
      load();
    } finally {
      setClosingId(null);
    }
  };

  const closeOne = async (franchiseeId: string) => {
    setClosingId(franchiseeId);
    try {
      const res = await fetch("/api/billing/close-month", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ franchiseeId, yearMonth }),
      });
      const data = await res.json();
      setMsg({ text: data.message ?? "Fechado!", type: "ok" });
      load();
    } catch { setMsg({ text: "Erro ao fechar.", type: "err" }); }
    finally { setClosingId(null); }
  };

  const savePlan = async () => {
    if (!planModal) return;
    setSavingPlan(true);
    try {
      await fetch("/api/billing/plan-percent", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ franchiseeId: planModal.id, planPercent: parseFloat(planValue) }),
      });
      setMsg({ text: `% atualizado para ${planValue}%`, type: "ok" });
      setPlanModal(null);
      load();
    } finally { setSavingPlan(false); }
  };

  // Totalizadores
  const totalDue     = cycles.reduce((s, c) => s + c.amountDue, 0);
  const totalOffset  = cycles.reduce((s, c) => s + c.amountOffset, 0);
  const totalPending = cycles.reduce((s, c) => s + c.amountPending, 0);

  return (
    <div style={{ fontFamily: "var(--font-outfit, sans-serif)" }}>
      {/* Toast */}
      {msg && (
        <div style={{
          position: "fixed", top: 20, right: 20, zIndex: 999,
          background: msg.type === "ok" ? "#DCFCE7" : "#FEE2E2",
          border: `1px solid ${msg.type === "ok" ? "#16A34A" : "#EF4444"}`,
          color: msg.type === "ok" ? "#15803D" : "#B91C1C",
          padding: "0.75rem 1.25rem", borderRadius: 12, fontWeight: 600,
          display: "flex", alignItems: "center", gap: 10,
          boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
        }}>
          {msg.text}
          <button onClick={() => setMsg(null)} style={{ background: "none", border: "none", cursor: "pointer" }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 800, margin: 0 }}>💰 Faturamento — Use First, Pay Later</h1>
          <p style={{ color: "#64748B", fontSize: "0.88rem", margin: "4px 0 0" }}>
            Pagamentos online abatidos em tempo real · Fechamento cobra só a diferença
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", flexWrap: "wrap" }}>
          <input
            type="month"
            value={yearMonth}
            onChange={e => setYearMonth(e.target.value)}
            style={{ padding: "0.55rem 0.85rem", borderRadius: 10, border: "1.5px solid #E2E8F0", fontSize: "0.9rem", outline: "none" }}
          />
          <button onClick={load} disabled={loading} style={{ padding: "0.55rem 0.85rem", borderRadius: 10, border: "1.5px solid #E2E8F0", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontWeight: 600, fontSize: "0.85rem" }}>
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Atualizar
          </button>
          <button
            onClick={closeAll}
            disabled={closingId === "ALL" || cycles.every(c => c.status !== "OPEN")}
            style={{ padding: "0.55rem 1.1rem", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #1565C0, #1976D2)", color: "#fff", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", opacity: cycles.every(c => c.status !== "OPEN") ? 0.5 : 1 }}
          >
            {closingId === "ALL" ? "Fechando..." : `Fechar Mês ${yearMonth}`}
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        {[
          { label: "Total Vendas Online", value: fmt(cycles.reduce((s,c)=>s+c.totalSales,0)), color: "#1565C0", icon: "📦" },
          { label: "Total Devido",        value: fmt(totalDue),     color: "#D97706", icon: "💸" },
          { label: "Já Abatido",          value: fmt(totalOffset),  color: "#15803D", icon: "✅" },
          { label: "Ainda Pendente",      value: fmt(totalPending), color: "#DC2626", icon: "⚠️" },
        ].map(k => (
          <div key={k.label} style={{ background: "#fff", borderRadius: 14, padding: "1rem 1.25rem", border: "1px solid #E2E8F0", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
            <div style={{ fontSize: "1.4rem", marginBottom: 4 }}>{k.icon}</div>
            <div style={{ fontSize: "1.3rem", fontWeight: 900, color: k.color }}>{k.value}</div>
            <div style={{ fontSize: "0.75rem", color: "#64748B", fontWeight: 600 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Tabela de ciclos */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "#94A3B8" }}>Carregando...</div>
      ) : cycles.length === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "#94A3B8" }}>
          Nenhum ciclo registrado para {yearMonth}.<br />
          <span style={{ fontSize: "0.85rem" }}>Os ciclos são criados automaticamente ao primeiro pagamento do mês.</span>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "2rem" }}>
          {cycles.map(c => {
            const sc = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.OPEN;
            const pct = c.amountDue > 0 ? Math.min(100, (c.amountOffset / c.amountDue) * 100) : 100;
            const isExpanded = expanded === c.id;

            return (
              <div key={c.id} style={{ background: "#fff", borderRadius: 16, border: "1px solid #E2E8F0", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
                {/* Linha principal */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto auto auto", alignItems: "center", gap: "1rem", padding: "1rem 1.25rem", flexWrap: "wrap" }}>
                  {/* Nome */}
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>{c.franchiseeName}</div>
                    <div style={{ fontSize: "0.75rem", color: "#64748B" }}>{c.franchiseeEmail} {c.city && `· ${c.city}`}</div>
                  </div>
                  {/* % do plano */}
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "0.7rem", color: "#94A3B8", marginBottom: 2 }}>Taxa</div>
                    <button
                      onClick={() => setPlanModal({ id: c.franchiseeId, name: c.franchiseeName, current: c.planPercent })}
                      style={{ fontWeight: 800, fontSize: "0.95rem", color: "#1565C0", background: "#E3F2FD", border: "none", borderRadius: 8, padding: "3px 10px", cursor: "pointer" }}
                    >
                      {c.planPercent}%
                    </button>
                  </div>
                  {/* Vendas → Devido */}
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "0.7rem", color: "#94A3B8" }}>Devido</div>
                    <div style={{ fontWeight: 700, color: "#D97706" }}>{fmt(c.amountDue)}</div>
                  </div>
                  {/* Abatido */}
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "0.7rem", color: "#94A3B8" }}>Abatido</div>
                    <div style={{ fontWeight: 700, color: "#15803D" }}>{fmt(c.amountOffset)}</div>
                  </div>
                  {/* Pendente */}
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "0.7rem", color: "#94A3B8" }}>Pendente</div>
                    <div style={{ fontWeight: 900, color: c.amountPending > 0 ? "#DC2626" : "#15803D", fontSize: "1rem" }}>
                      {fmt(c.amountPending)}
                    </div>
                  </div>
                  {/* Status + ações */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 20, background: sc.bg, color: sc.color, fontWeight: 700, fontSize: "0.72rem" }}>
                      {sc.icon} {sc.label}
                    </span>
                    {c.status === "OPEN" && (
                      <button
                        onClick={() => closeOne(c.franchiseeId)}
                        disabled={closingId === c.franchiseeId}
                        style={{ fontSize: "0.72rem", fontWeight: 700, padding: "3px 10px", borderRadius: 8, border: "none", background: "#1565C0", color: "#fff", cursor: "pointer" }}
                      >
                        {closingId === c.franchiseeId ? "Fechando..." : "Fechar Agora"}
                      </button>
                    )}
                    {c.asaasBoletoUrl && (
                      <a href={c.asaasBoletoUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.72rem", fontWeight: 700, padding: "3px 10px", borderRadius: 8, background: "#DCFCE7", color: "#15803D", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
                        <ExternalLink size={11} /> Boleto
                      </a>
                    )}
                    <button onClick={() => setExpanded(isExpanded ? null : c.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94A3B8" }}>
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                  </div>
                </div>

                {/* Barra de progresso do abatimento */}
                <div style={{ padding: "0 1.25rem 0.85rem" }}>
                  <div style={{ height: 6, background: "#F1F5F9", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: pct >= 100 ? "linear-gradient(90deg,#16A34A,#22C55E)" : "linear-gradient(90deg,#1565C0,#42A5F5)", borderRadius: 4, transition: "width 0.5s" }} />
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "#94A3B8", marginTop: 3 }}>
                    {pct.toFixed(0)}% coberto por recebimentos online · Vendas totais: {fmt(c.totalSales)}
                  </div>
                </div>

                {/* Detalhes expandidos */}
                {isExpanded && (
                  <div style={{ borderTop: "1px solid #F1F5F9", padding: "1rem 1.25rem", background: "#FAFAFA" }}>
                    <h4 style={{ fontWeight: 700, fontSize: "0.85rem", marginBottom: "0.75rem", color: "#475569" }}>
                      📋 Log de Abatimentos ({(c.offsetLog ?? []).length} recebimentos)
                    </h4>
                    {!c.offsetLog || c.offsetLog.length === 0 ? (
                      <p style={{ fontSize: "0.8rem", color: "#94A3B8" }}>Nenhum pagamento online recebido ainda.</p>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", maxHeight: 200, overflowY: "auto" }}>
                        {(c.offsetLog as any[]).map((log: any, i: number) => (
                          <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", padding: "0.35rem 0.65rem", background: "#fff", borderRadius: 8, border: "1px solid #E2E8F0" }}>
                            <span style={{ color: "#475569" }}>{new Date(log.date).toLocaleString("pt-BR")} · Pedido #{log.orderId?.slice(-6).toUpperCase()}</span>
                            <span style={{ fontWeight: 700, color: "#15803D" }}>+{fmt(log.amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {c.asaasBoletoCode && (
                      <div style={{ marginTop: "0.75rem", padding: "0.65rem", background: "#E3F2FD", borderRadius: 8, fontSize: "0.75rem", fontFamily: "monospace", color: "#1565C0", wordBreak: "break-all" }}>
                        Código de barras: {c.asaasBoletoCode}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Franqueados sem ciclo */}
      {withoutCycle.length > 0 && (
        <div style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#64748B", marginBottom: "0.75rem" }}>
            👤 Sem movimentação em {yearMonth} ({withoutCycle.length})
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "0.6rem" }}>
            {withoutCycle.map(f => (
              <div key={f.id} style={{ background: "#F8FAFC", borderRadius: 12, padding: "0.85rem 1rem", border: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "0.88rem" }}>{f.name}</div>
                  <div style={{ fontSize: "0.72rem", color: "#94A3B8" }}>{f.city ?? "—"}</div>
                </div>
                <button
                  onClick={() => setPlanModal({ id: f.id, name: f.name, current: f.planPercent ?? 0 })}
                  style={{ fontSize: "0.75rem", fontWeight: 700, padding: "3px 10px", borderRadius: 8, border: "none", background: f.planPercent ? "#E3F2FD" : "#FEE2E2", color: f.planPercent ? "#1565C0" : "#DC2626", cursor: "pointer" }}
                >
                  {f.planPercent ? `${f.planPercent}%` : "Sem %"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: editar % do plano */}
      {planModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div style={{ background: "#fff", borderRadius: 20, padding: "1.75rem", maxWidth: 400, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
              <h3 style={{ fontWeight: 800, fontSize: "1.1rem" }}>💳 Definir % do Plano</h3>
              <button onClick={() => setPlanModal(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={20} /></button>
            </div>
            <p style={{ color: "#64748B", fontSize: "0.85rem", marginBottom: "1rem" }}>
              <strong>{planModal.name}</strong><br />
              % atual: <strong>{planModal.current}%</strong>
            </p>
            <label style={{ fontWeight: 600, fontSize: "0.85rem", display: "block", marginBottom: "0.5rem" }}>
              Novo % (ex: 5 para 5% sobre vendas online)
            </label>
            <input
              type="number"
              step="0.5"
              min="0"
              max="100"
              value={planValue}
              onChange={e => setPlanValue(e.target.value)}
              placeholder={String(planModal.current)}
              style={{ width: "100%", padding: "0.75rem", borderRadius: 10, border: "1.5px solid #E2E8F0", fontSize: "1rem", outline: "none", boxSizing: "border-box" }}
            />
            <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.25rem" }}>
              <button onClick={() => setPlanModal(null)} style={{ flex: 1, padding: "0.75rem", borderRadius: 10, border: "1.5px solid #E2E8F0", background: "#fff", fontWeight: 600, cursor: "pointer" }}>
                Cancelar
              </button>
              <button onClick={savePlan} disabled={savingPlan || !planValue} style={{ flex: 1, padding: "0.75rem", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#1565C0,#1976D2)", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
                {savingPlan ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
