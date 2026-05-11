"use client";
import { useState, useEffect } from "react";
import {
  Zap, BarChart2, Play, Pause, Settings,
  CheckCircle, AlertCircle, TrendingUp, MousePointer,
  Eye, ShoppingBag, ChevronRight, Activity, PauseCircle
} from "lucide-react";

type Campaign = {
  id: string; status: string; weeklyBudget: number; radiusKm: number;
  adCopy: string; adImageUrl: string; spend: number; impressions: number;
  clicks: number; ordersGenerated: number; revenue: number;
  createdAt: string;
};

const fmtR = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function MetaAdsPage() {
  const [campaign, setCampaign]   = useState<Campaign | null>(null);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading]     = useState(true);
  const [step, setStep]           = useState<"loading" | "connect" | "setup" | "dashboard">("loading");

  // form
  const [weeklyBudget, setWeeklyBudget] = useState(100);
  const [radiusKm, setRadiusKm]         = useState(3);
  const [adCopy, setAdCopy]             = useState("");
  const [creating, setCreating]         = useState(false);
  const [toggling, setToggling]         = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("connected") === "true") setConnected(true);

    fetch("/api/meta-ads/campaign")
      .then(r => r.json())
      .then(d => {
        if (d.campaign) {
          setCampaign(d.campaign);
          setConnected(true);
          setStep("dashboard");
        } else {
          // verifica se tem facebook conectado
          fetch("/api/store-settings")
            .then(r => r.json())
            .then(s => {
              if (s.metaAdsEnabled && s.metaFbPageId) {
                setConnected(true);
                setStep("setup");
              } else {
                setStep("connect");
              }
            });
        }
      })
      .catch(() => setStep("connect"))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreateCampaign() {
    setCreating(true);
    try {
      const r = await fetch("/api/meta-ads/campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weeklyBudget, radiusKm, adCopy }),
      });
      const d = await r.json();
      if (d.campaign) { setCampaign(d.campaign); setStep("dashboard"); }
    } finally { setCreating(false); }
  }

  async function handleToggle() {
    if (!campaign) return;
    setToggling(true);
    const action = campaign.status === "ACTIVE" ? "pause" : "resume";
    await fetch("/api/meta-ads/campaign", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setCampaign(c => c ? { ...c, status: action === "pause" ? "PAUSED" : "ACTIVE" } : c);
    setToggling(false);
  }

  const roi = campaign && campaign.spend > 0
    ? (campaign.revenue / campaign.spend).toFixed(1)
    : "—";
  const cpp = campaign && campaign.ordersGenerated > 0
    ? fmtR(campaign.spend / campaign.ordersGenerated)
    : "—";

  if (loading || step === "loading") {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 40, height: 40, border: "3px solid #E2E8F0", borderTopColor: "#1877F2", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
          <p style={{ color: "#64748B", fontSize: "0.875rem" }}>Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "1.5rem 1rem", fontFamily: "Inter, sans-serif" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:.5 } }`}</style>

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #1877F2, #0052CC)", borderRadius: 20, padding: "1.75rem", color: "#fff", marginBottom: "1.5rem", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -20, right: -20, width: 120, height: 120, background: "rgba(255,255,255,0.05)", borderRadius: "50%" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <div style={{ background: "rgba(255,255,255,0.2)", borderRadius: 12, padding: 8 }}>
            <Zap size={22} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontWeight: 900, fontSize: "1.25rem" }}>Tráfego Pago com IA</h1>
            <p style={{ margin: 0, fontSize: "0.8rem", opacity: 0.8 }}>Meta Ads • Facebook & Instagram</p>
          </div>
          {campaign && (
            <div style={{ marginLeft: "auto", background: campaign.status === "ACTIVE" ? "#16A34A" : "#475569", borderRadius: 20, padding: "4px 12px", fontSize: "0.75rem", fontWeight: 700 }}>
              {campaign.status === "ACTIVE" ? "🟢 Ativo" : "⏸ Pausado"}
            </div>
          )}
        </div>
        <p style={{ margin: 0, fontSize: "0.85rem", opacity: 0.85, lineHeight: 1.6 }}>
          Anúncios criados automaticamente por IA no Facebook e Instagram — direcionando clientes direto pro seu cardápio.
        </p>

        {/* Preço */}
        <div style={{ display: "flex", gap: 12, marginTop: "1rem", flexWrap: "wrap" }}>
          {[
            { label: "Taxa de gestão", value: "R$50/semana" },
            { label: "Verba mínima", value: "R$100/semana" },
            { label: "100% da verba", value: "vai pro Meta" },
          ].map((item, i) => (
            <div key={i} style={{ background: "rgba(255,255,255,0.15)", borderRadius: 10, padding: "6px 12px", fontSize: "0.75rem" }}>
              <span style={{ opacity: 0.75 }}>{item.label}: </span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      </div>

      {/* ===== PASSO 1: CONECTAR FACEBOOK ===== */}
      {step === "connect" && (
        <div style={{ background: "#fff", borderRadius: 16, padding: "2rem", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", textAlign: "center", border: "1px solid #E2E8F0" }}>
          <div style={{ width: 64, height: 64, background: "#EBF2FF", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" }}>
            <Facebook size={32} color="#1877F2" />
          </div>
          <h2 style={{ fontWeight: 800, fontSize: "1.1rem", margin: "0 0 0.5rem" }}>Conecte sua conta do Facebook</h2>
          <p style={{ color: "#64748B", fontSize: "0.875rem", margin: "0 0 1.5rem", lineHeight: 1.7, maxWidth: 400, marginLeft: "auto", marginRight: "auto" }}>
            Para rodar anúncios, precisamos acessar sua Página do Facebook e conta de anúncios. O processo leva menos de 2 minutos.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 360, margin: "0 auto 1.5rem" }}>
            {["Conectar Página do Facebook", "Configurar conta de anúncios", "Criar primeira campanha com IA"].map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, background: "#F8FAFC", borderRadius: 10, padding: "10px 14px", fontSize: "0.82rem" }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#1877F2", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "0.7rem", flexShrink: 0 }}>{i + 1}</div>
                {s}
              </div>
            ))}
          </div>

          <a href="/api/meta-ads/auth" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 28px", borderRadius: 12, background: "#1877F2", color: "#fff", fontWeight: 700, fontSize: "0.95rem", textDecoration: "none" }}>
            <Facebook size={18} />
            Conectar Facebook
            <ChevronRight size={16} />
          </a>

          <p style={{ fontSize: "0.72rem", color: "#94A3B8", marginTop: "1rem" }}>
            🔒 Acesso seguro via OAuth oficial do Facebook. Nunca acessamos sua senha.
          </p>
        </div>
      )}

      {/* ===== PASSO 2: CONFIGURAR CAMPANHA ===== */}
      {step === "setup" && (
        <div style={{ background: "#fff", borderRadius: 16, padding: "1.75rem", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: "1px solid #E2E8F0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1.5rem" }}>
            <CheckCircle size={20} color="#16A34A" />
            <span style={{ fontSize: "0.875rem", color: "#16A34A", fontWeight: 700 }}>Facebook conectado!</span>
          </div>

          <h2 style={{ fontWeight: 800, fontSize: "1.1rem", margin: "0 0 1.5rem" }}>⚙️ Configure sua campanha</h2>

          {/* Orçamento */}
          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ fontWeight: 700, fontSize: "0.875rem", display: "block", marginBottom: 8 }}>
              💰 Verba semanal em anúncios
            </label>
            <p style={{ fontSize: "0.78rem", color: "#64748B", margin: "0 0 10px" }}>100% vai pro Facebook. Mínimo R$100/semana.</p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {[100, 200, 300, 500, 700].map(v => (
                <button key={v} onClick={() => setWeeklyBudget(v)} style={{ padding: "8px 16px", borderRadius: 10, border: weeklyBudget === v ? "2px solid #1877F2" : "1px solid #E2E8F0", background: weeklyBudget === v ? "#EBF2FF" : "#fff", color: weeklyBudget === v ? "#1877F2" : "#0F172A", fontWeight: weeklyBudget === v ? 800 : 500, cursor: "pointer", fontSize: "0.875rem" }}>
                  R${v}
                </button>
              ))}
              <input type="number" min={100} value={weeklyBudget} onChange={e => setWeeklyBudget(Number(e.target.value))} style={{ width: 90, padding: "8px 12px", borderRadius: 10, border: "1px solid #E2E8F0", fontSize: "0.875rem" }} placeholder="Outro" />
            </div>
          </div>

          {/* Raio */}
          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ fontWeight: 700, fontSize: "0.875rem", display: "block", marginBottom: 8 }}>
              📍 Raio de entrega (km) — {radiusKm}km
            </label>
            <input type="range" min={1} max={10} value={radiusKm} onChange={e => setRadiusKm(Number(e.target.value))} style={{ width: "100%", accentColor: "#1877F2" }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "#94A3B8", marginTop: 4 }}>
              <span>1km</span><span>5km (recomendado)</span><span>10km</span>
            </div>
          </div>

          {/* Copy */}
          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ fontWeight: 700, fontSize: "0.875rem", display: "block", marginBottom: 8 }}>
              ✍️ Texto do anúncio (opcional — IA gera automaticamente)
            </label>
            <textarea value={adCopy} onChange={e => setAdCopy(e.target.value)} rows={3} placeholder="Ex: 🍔 Delivery mais saboroso da região! Peça agora e receba em casa. Clique no link!" style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid #E2E8F0", fontSize: "0.875rem", resize: "vertical", boxSizing: "border-box" }} />
          </div>

          {/* Resumo de custo */}
          <div style={{ background: "#F8FAFC", borderRadius: 12, padding: "1rem", marginBottom: "1.5rem", border: "1px solid #E2E8F0" }}>
            <p style={{ fontWeight: 700, fontSize: "0.82rem", margin: "0 0 8px" }}>📋 Resumo mensal estimado:</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {[
                { label: "Verba de anúncios (4 semanas)", value: fmtR(weeklyBudget * 4), sub: "100% vai pro Meta" },
                { label: "Taxa de gestão FireHub", value: "R$200/mês", sub: "R$50/semana × 4" },
                { label: "Total investido", value: fmtR(weeklyBudget * 4 + 200), bold: true },
              ].map((r, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem" }}>
                  <span style={{ color: "#64748B" }}>{r.label} {r.sub && <span style={{ color: "#94A3B8", fontSize: "0.7rem" }}>({r.sub})</span>}</span>
                  <strong style={{ color: r.bold ? "#0F172A" : "#475569" }}>{r.value}</strong>
                </div>
              ))}
            </div>
          </div>

          <button onClick={handleCreateCampaign} disabled={creating} style={{ width: "100%", padding: "14px", borderRadius: 12, background: creating ? "#94A3B8" : "#1877F2", color: "#fff", border: "none", fontWeight: 800, fontSize: "1rem", cursor: creating ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {creating ? "Criando campanha com IA..." : <><Zap size={18} /> Ativar Campanha Agora</>}
          </button>
        </div>
      )}

      {/* ===== PASSO 3: DASHBOARD ===== */}
      {step === "dashboard" && campaign && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Status bar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff", borderRadius: 14, padding: "1rem 1.25rem", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", border: "1px solid #E2E8F0", flexWrap: "wrap", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {campaign.status === "ACTIVE"
                ? <Activity size={18} color="#16A34A" />
                : <PauseCircle size={18} color="#94A3B8" />}
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: "0.875rem" }}>
                  {campaign.status === "ACTIVE" ? "Campanha ativa e rodando" : "Campanha pausada"}
                </p>
                <p style={{ margin: 0, fontSize: "0.72rem", color: "#94A3B8" }}>
                  Raio: {campaign.radiusKm}km · Verba: {fmtR(campaign.weeklyBudget)}/semana
                </p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={handleToggle} disabled={toggling} style={{ padding: "8px 16px", borderRadius: 10, border: "1px solid #E2E8F0", background: campaign.status === "ACTIVE" ? "#FFF7ED" : "#F0FDF4", color: campaign.status === "ACTIVE" ? "#C2410C" : "#16A34A", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                {campaign.status === "ACTIVE" ? <><Pause size={14} /> Pausar</> : <><Play size={14} /> Retomar</>}
              </button>
              <button onClick={() => setStep("setup")} style={{ padding: "8px 14px", borderRadius: 10, border: "1px solid #E2E8F0", background: "#fff", color: "#475569", fontWeight: 600, fontSize: "0.8rem", cursor: "pointer" }}>
                <Settings size={14} />
              </button>
            </div>
          </div>

          {/* KPIs */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.75rem" }}>
            {[
              { icon: <BarChart2 size={18} color="#1877F2" />, label: "Investido", value: fmtR(campaign.spend), sub: "últimos 30 dias", bg: "#EBF2FF" },
              { icon: <Eye size={18} color="#7C3AED" />, label: "Impressões", value: campaign.impressions.toLocaleString("pt-BR"), sub: "visualizações", bg: "#F3F0FF" },
              { icon: <MousePointer size={18} color="#0891B2" />, label: "Cliques", value: campaign.clicks.toLocaleString("pt-BR"), sub: "no cardápio", bg: "#ECFEFF" },
              { icon: <ShoppingBag size={18} color="#16A34A" />, label: "Pedidos", value: campaign.ordersGenerated.toString(), sub: "via anúncio", bg: "#F0FDF4" },
              { icon: <TrendingUp size={18} color="#D97706" />, label: "ROI", value: `${roi}x`, sub: "retorno", bg: "#FFFBEB" },
              { icon: <ShoppingBag size={18} color="#E63946" />, label: "Custo/pedido", value: cpp, sub: "médio", bg: "#FFF1F2" },
            ].map((kpi, i) => (
              <div key={i} style={{ background: "#fff", borderRadius: 14, padding: "1rem", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", border: "1px solid #E2E8F0" }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: kpi.bg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
                  {kpi.icon}
                </div>
                <p style={{ margin: 0, fontSize: "0.72rem", color: "#94A3B8" }}>{kpi.label}</p>
                <p style={{ margin: "2px 0 0", fontWeight: 900, fontSize: "1.1rem" }}>{kpi.value}</p>
                <p style={{ margin: 0, fontSize: "0.68rem", color: "#94A3B8" }}>{kpi.sub}</p>
              </div>
            ))}
          </div>

          {/* Copy do anúncio */}
          {campaign.adCopy && (
            <div style={{ background: "#fff", borderRadius: 14, padding: "1.25rem", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", border: "1px solid #E2E8F0" }}>
              <p style={{ fontWeight: 700, fontSize: "0.875rem", margin: "0 0 8px" }}>📢 Anúncio ativo</p>
              <div style={{ background: "#F8FAFC", borderRadius: 10, padding: "0.75rem 1rem", fontSize: "0.85rem", color: "#334155", lineHeight: 1.7, border: "1px solid #E2E8F0" }}>
                {campaign.adCopy}
              </div>
            </div>
          )}

          {/* Info de cobrança */}
          <div style={{ background: "linear-gradient(135deg,#0F172A,#1E293B)", borderRadius: 14, padding: "1.25rem", color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: "0.875rem" }}>💳 Próxima cobrança de gestão</p>
              <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "#94A3B8" }}>R$50/semana · Taxa FireHub · Automático</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ margin: 0, fontWeight: 900, fontSize: "1.25rem", color: "#F59E0B" }}>R$ 50,00</p>
              <p style={{ margin: 0, fontSize: "0.7rem", color: "#94A3B8" }}>em 7 dias</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

