"use client";
import { useState, useMemo } from "react";
import { Search, TrendingUp, Store, Clock, AlertCircle, CheckCircle, DollarSign, ExternalLink } from "lucide-react";

type Lojista = {
  id: string; name: string; email: string; storeName: string;
  slug: string; city: string; createdAt: string;
  diasDesde: number; emTrial: boolean; diasTrialRestantes: number;
  faturamentoMes: number; mensalidade: number; modelo: string;
  status: "trial" | "ativo" | "zero";
  storeOpen: boolean; pagarmeRecipientId: string | null;
};

function fmtR(v: number) { return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`; }

const STATUS_CONFIG = {
  trial:  { label: "Em Trial",    bg: "#EFF6FF", color: "#1D4ED8", border: "#BFDBFE", icon: "⏳" },
  ativo:  { label: "Ativo",       bg: "#F0FDF4", color: "#16A34A", border: "#BBF7D0", icon: "✅" },
  zero:   { label: "Sem Vendas",  bg: "#FFF7ED", color: "#C2410C", border: "#FED7AA", icon: "⚠️" },
};

export default function LojistasAdminClient({ lojistas }: { lojistas: Lojista[] }) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"todos" | "trial" | "ativo" | "zero">("todos");
  const [sort, setSort] = useState<"nome" | "faturamento" | "criacao">("criacao");

  const filtered = useMemo(() => {
    let list = lojistas;
    if (search) list = list.filter(l =>
      l.storeName.toLowerCase().includes(search.toLowerCase()) ||
      l.email.toLowerCase().includes(search.toLowerCase()) ||
      l.city.toLowerCase().includes(search.toLowerCase())
    );
    if (filterStatus !== "todos") list = list.filter(l => l.status === filterStatus);
    if (sort === "nome") list = [...list].sort((a, b) => a.storeName.localeCompare(b.storeName));
    if (sort === "faturamento") list = [...list].sort((a, b) => b.faturamentoMes - a.faturamentoMes);
    return list;
  }, [lojistas, search, filterStatus, sort]);

  // KPIs totais
  const totalFaturamento = lojistas.reduce((s, l) => s + l.faturamentoMes, 0);
  const totalMensalidade = lojistas.reduce((s, l) => s + l.mensalidade, 0);
  const emTrial = lojistas.filter(l => l.status === "trial").length;
  const ativos = lojistas.filter(l => l.status === "ativo").length;
  const semVendas = lojistas.filter(l => l.status === "zero").length;

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: "#F8FAFC", minHeight: "100vh", padding: "1.5rem" }}>
      <div style={{ maxWidth: 1300, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: "1.5rem" }}>
          <h1 style={{ fontWeight: 900, fontSize: "1.7rem", color: "#0F172A", margin: 0 }}>
            🏪 Painel de Lojistas
          </h1>
          <p style={{ color: "#64748B", fontSize: "0.87rem", margin: "4px 0 0" }}>
            {lojistas.length} lojistas cadastrados · Mês atual
          </p>
        </div>

        {/* KPI Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
          {[
            { icon: "🏪", label: "Total de Lojistas", value: String(lojistas.length), color: "#6366F1" },
            { icon: "⏳", label: "Em Trial", value: String(emTrial), color: "#3B82F6" },
            { icon: "✅", label: "Ativos (vendendo)", value: String(ativos), color: "#16A34A" },
            { icon: "⚠️", label: "Sem Vendas", value: String(semVendas), color: "#F59E0B" },
            { icon: "💰", label: "Faturamento Total", value: fmtR(totalFaturamento), color: "#10B981" },
            { icon: "📊", label: "Mensalidade Total", value: fmtR(totalMensalidade), color: "#8B5CF6" },
          ].map((kpi, i) => (
            <div key={i} style={{ background: "#fff", borderRadius: "14px", padding: "16px 20px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", border: "1px solid #F1F5F9" }}>
              <div style={{ fontSize: "1.4rem", marginBottom: "6px" }}>{kpi.icon}</div>
              <p style={{ fontSize: "0.75rem", color: "#64748B", margin: 0 }}>{kpi.label}</p>
              <p style={{ fontSize: "1.25rem", fontWeight: 800, color: kpi.color, margin: 0 }}>{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div style={{ background: "#fff", borderRadius: "14px", padding: "1rem 1.25rem", marginBottom: "1rem", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", border: "1px solid #F1F5F9", display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: "200px", background: "#F8FAFC", borderRadius: "10px", border: "1.5px solid #E2E8F0", padding: "8px 12px" }}>
            <Search size={16} color="#94A3B8" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar lojista, email ou cidade..."
              style={{ border: "none", outline: "none", background: "transparent", fontSize: "0.85rem", width: "100%", fontFamily: "inherit" }}
            />
          </div>

          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {(["todos", "trial", "ativo", "zero"] as const).map(s => (
              <button key={s} onClick={() => setFilterStatus(s)} style={{
                padding: "7px 14px", borderRadius: "8px", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                border: filterStatus === s ? "none" : "1.5px solid #E2E8F0",
                background: filterStatus === s ? "#0F172A" : "#F8FAFC",
                color: filterStatus === s ? "#fff" : "#475569",
              }}>
                {s === "todos" ? "Todos" : STATUS_CONFIG[s].label}
              </button>
            ))}
          </div>

          <select value={sort} onChange={e => setSort(e.target.value as any)}
            style={{ padding: "8px 12px", borderRadius: "10px", border: "1.5px solid #E2E8F0", fontSize: "0.82rem", fontFamily: "inherit", background: "#F8FAFC", color: "#475569", cursor: "pointer" }}>
            <option value="criacao">Mais recentes</option>
            <option value="faturamento">Maior faturamento</option>
            <option value="nome">Nome A-Z</option>
          </select>
        </div>

        {/* Tabela */}
        <div style={{ background: "#fff", borderRadius: "16px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", border: "1px solid #F1F5F9", overflow: "hidden" }}>
          {/* Header da tabela */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr 1fr", gap: "0", padding: "12px 20px", background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
            {["Lojista", "Status", "Trial", "Faturamento Mês", "Mensalidade", "Pagar.me", "Ações"].map((h, i) => (
              <span key={i} style={{ fontSize: "0.72rem", fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</span>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "#94A3B8" }}>
              <p style={{ fontSize: "1.5rem" }}>🔍</p>
              <p>Nenhum lojista encontrado</p>
            </div>
          ) : (
            filtered.map((l, idx) => {
              const sc = STATUS_CONFIG[l.status];
              return (
                <div key={l.id} style={{
                  display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr 1fr",
                  gap: "0", padding: "14px 20px", alignItems: "center",
                  borderBottom: idx < filtered.length - 1 ? "1px solid #F1F5F9" : "none",
                  background: idx % 2 === 0 ? "#fff" : "#FAFBFC",
                  transition: "background 0.1s",
                }}>
                  {/* Lojista */}
                  <div>
                    <p style={{ fontWeight: 700, fontSize: "0.88rem", color: "#0F172A", margin: 0 }}>{l.storeName}</p>
                    <p style={{ fontSize: "0.72rem", color: "#64748B", margin: 0 }}>{l.email}</p>
                    {l.city && <p style={{ fontSize: "0.68rem", color: "#94A3B8", margin: 0 }}>📍 {l.city}</p>}
                  </div>

                  {/* Status */}
                  <div>
                    <span style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, borderRadius: "6px", padding: "3px 8px", fontSize: "0.72rem", fontWeight: 700 }}>
                      {sc.icon} {sc.label}
                    </span>
                  </div>

                  {/* Trial */}
                  <div>
                    {l.emTrial ? (
                      <span style={{ fontSize: "0.78rem", color: "#3B82F6", fontWeight: 700 }}>
                        {l.diasTrialRestantes}d restantes
                      </span>
                    ) : (
                      <span style={{ fontSize: "0.75rem", color: "#94A3B8" }}>
                        {l.diasDesde}d ativo
                      </span>
                    )}
                  </div>

                  {/* Faturamento */}
                  <div>
                    <span style={{ fontSize: "0.88rem", fontWeight: 800, color: l.faturamentoMes > 0 ? "#16A34A" : "#94A3B8" }}>
                      {fmtR(l.faturamentoMes)}
                    </span>
                  </div>

                  {/* Mensalidade */}
                  <div>
                    {l.emTrial ? (
                      <span style={{ fontSize: "0.75rem", color: "#3B82F6", fontWeight: 600 }}>Trial</span>
                    ) : (
                      <div>
                        <span style={{ fontSize: "0.88rem", fontWeight: 800, color: l.mensalidade === 0 ? "#94A3B8" : "#8B5CF6" }}>
                          {fmtR(l.mensalidade)}
                        </span>
                        <p style={{ fontSize: "0.65rem", color: "#94A3B8", margin: 0, textTransform: "capitalize" }}>
                          {l.modelo === "zero" ? "isento" : l.modelo}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Pagar.me */}
                  <div>
                    {l.pagarmeRecipientId ? (
                      <span style={{ fontSize: "0.72rem", background: "#F0FDF4", color: "#16A34A", border: "1px solid #BBF7D0", borderRadius: "5px", padding: "2px 7px", fontWeight: 700 }}>
                        ✅ Vinculado
                      </span>
                    ) : (
                      <span style={{ fontSize: "0.72rem", background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA", borderRadius: "5px", padding: "2px 7px", fontWeight: 700 }}>
                        ❌ Pendente
                      </span>
                    )}
                  </div>

                  {/* Ações */}
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    {l.slug && (
                      <a href={`/loja/${l.slug}`} target="_blank" rel="noreferrer"
                        style={{ fontSize: "0.7rem", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "6px", padding: "4px 8px", color: "#475569", textDecoration: "none", fontWeight: 600, display: "flex", alignItems: "center", gap: "3px" }}>
                        <ExternalLink size={10} /> Ver loja
                      </a>
                    )}
                    <a href={`/admin/franchisees`}
                      style={{ fontSize: "0.7rem", background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: "6px", padding: "4px 8px", color: "#1D4ED8", textDecoration: "none", fontWeight: 600 }}>
                      Gerenciar
                    </a>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <p style={{ fontSize: "0.72rem", color: "#94A3B8", textAlign: "center", marginTop: "1rem" }}>
          Faturamento e mensalidade calculados com pedidos do mês atual (não cancelados) · Regra FireHub Pay as You Grow
        </p>
      </div>
    </div>
  );
}
