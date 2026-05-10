"use client";
import { useState } from "react";
import { Check, X, Zap, TrendingUp, CreditCard, Smartphone, Star, ArrowRight, Calculator } from "lucide-react";
import { calcMensalidade, FIREHUB_PLAN } from "@/lib/firehub-billing";

const FEATURES = [
  { label: "Cardápio digital com link próprio", firehub: true, brendi: true },
  { label: "Pedidos via WhatsApp + IA", firehub: true, brendi: true },
  { label: "Pagamento PIX online", firehub: true, brendi: true },
  { label: "Pagamento Cartão online", firehub: true, brendi: true },
  { label: "Voucher VR / Alelo / Ticket online", firehub: true, brendi: false },
  { label: "Recebimento cartão crédito", firehub: "D+2", brendi: "D+14" },
  { label: "Teto de mensalidade", firehub: "R$250/mês", brendi: "R$300/mês" },
  { label: "Alta Demanda (Surge Pricing)", firehub: true, brendi: true },
  { label: "Log de auditoria de operações", firehub: true, brendi: false },
  { label: "Agendar pausa / Férias", firehub: true, brendi: true },
  { label: "Facebook Pixel automático", firehub: true, brendi: true },
  { label: "Auto-aceitar pedidos", firehub: true, brendi: true },
  { label: "Som de alerta configurável", firehub: true, brendi: true },
  { label: "DRE financeiro completo", firehub: true, brendi: true },
  { label: "Programa de fidelidade / Cashback", firehub: true, brendi: true },
  { label: "Cupons de desconto por loja", firehub: true, brendi: true },
  { label: "Suporte em português (BR)", firehub: true, brendi: true },
];

const PAYMENT_FEES = [
  { method: "PIX", icon: "⚡", fee: "0,5% + R$0,40", settlement: "D+0 — na hora", color: "#00BFA5" },
  { method: "Cartão Crédito", icon: "💳", fee: "3,99%", settlement: "D+2 úteis", color: "#9C27B0" },
  { method: "Cartão Débito", icon: "💳", fee: "1,49%", settlement: "D+1 útil", color: "#2196F3" },
  { method: "Voucher VR / Alelo", icon: "🎫", fee: "2,49%", settlement: "D+1 útil", color: "#FF6F00" },
  { method: "Dinheiro / Maquininha", icon: "💵", fee: "Sem taxa", settlement: "Pagamento presencial", color: "#4CAF50" },
];

function SimuladorMensalidade() {
  const [faturamento, setFaturamento] = useState(5000);
  const result = calcMensalidade(faturamento);
  const brendiResult = faturamento === 0 ? 0 : faturamento >= 7500 ? 300 : Math.max(60, faturamento * 0.04);

  const modeloLabel = result.modelo === "zero"
    ? "✅ Mês sem vendas = R$0"
    : result.modelo === "fixo"
    ? `✅ Teto fixo (≥ R$${FIREHUB_PLAN.THRESHOLD.toLocaleString("pt-BR")})`
    : `4% do faturamento (mín. R$${FIREHUB_PLAN.MIN_MONTHLY})`;

  return (
    <div style={{ background: "#0F172A", borderRadius: "20px", padding: "2rem", color: "#fff" }}>
      <h3 style={{ fontWeight: 800, fontSize: "1.2rem", marginBottom: "0.5rem" }}>
        🧮 Simulador de Mensalidade
      </h3>
      <p style={{ fontSize: "0.85rem", color: "#94A3B8", marginBottom: "1.5rem" }}>
        Arraste para ver quanto você pagaria com base no seu faturamento
      </p>

      <div style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
          <span style={{ fontSize: "0.85rem", color: "#94A3B8" }}>Faturamento mensal:</span>
          <strong style={{ color: "#F59E0B", fontSize: "1.1rem" }}>
            {faturamento === 0 ? "R$ 0 (sem vendas)" : `R$ ${faturamento.toLocaleString("pt-BR")}`}
          </strong>
        </div>
        <input type="range" min={0} max={30000} step={500} value={faturamento}
          onChange={e => setFaturamento(Number(e.target.value))}
          style={{ width: "100%", accentColor: "#E63946" }} />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "#475569" }}>
          <span>R$0</span><span>R$30.000</span>
        </div>
      </div>

      {/* Aviso zero */}
      {faturamento === 0 && (
        <div style={{ background: "#16A34A20", border: "1px solid #16A34A40", borderRadius: "10px", padding: "10px 14px", marginBottom: "1rem", textAlign: "center" }}>
          <span style={{ color: "#4ADE80", fontWeight: 700, fontSize: "0.9rem" }}>
            🎉 Mês sem vendas online = R$0 de mensalidade
          </span>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "1.5rem" }}>
        <div style={{ background: "#1E293B", borderRadius: "14px", padding: "1.25rem", border: "2px solid #E63946" }}>
          <p style={{ fontSize: "0.75rem", color: "#94A3B8", margin: "0 0 4px" }}>🔥 FireHub</p>
          <p style={{ fontSize: "2rem", fontWeight: 900, color: result.modelo === "zero" ? "#4ADE80" : "#E63946", margin: 0 }}>
            {result.modelo === "zero" ? "R$0" : `R$${result.mensalidade.toFixed(0)}`}
          </p>
          <p style={{ fontSize: "0.72rem", color: "#64748B", margin: "4px 0 0" }}>
            {modeloLabel}
          </p>
        </div>
        <div style={{ background: "#1E293B", borderRadius: "14px", padding: "1.25rem", opacity: 0.7 }}>
          <p style={{ fontSize: "0.75rem", color: "#94A3B8", margin: "0 0 4px" }}>Concorrente</p>
          <p style={{ fontSize: "2rem", fontWeight: 900, color: "#94A3B8", margin: 0 }}>
            R${brendiResult.toFixed(0)}
          </p>
          <p style={{ fontSize: "0.72rem", color: "#64748B", margin: "4px 0 0" }}>
            {faturamento === 0 ? "Mês sem vendas = R$0" : faturamento >= 7500 ? "Teto fixo (≥ R$7.500)" : "4% do faturamento"}
          </p>
        </div>
      </div>

      {result.economia > 0 && (
        <div style={{ marginTop: "1rem", background: "#16A34A20", border: "1px solid #16A34A40", borderRadius: "10px", padding: "10px 14px", textAlign: "center" }}>
          <span style={{ color: "#4ADE80", fontWeight: 700, fontSize: "0.9rem" }}>
            💰 Você economiza R${result.economia.toFixed(0)}/mês com o FireHub
          </span>
        </div>
      )}

      <div style={{ marginTop: "1rem", fontSize: "0.75rem", color: "#475569", lineHeight: 1.6 }}>
        <strong style={{ color: "#94A3B8" }}>Como funciona:</strong><br />
        • Mês sem vendas online → <strong style={{ color: "#4ADE80" }}>R$0 cobrado</strong><br />
        • Faturamento &gt; R$0 → mínimo de <strong>R${FIREHUB_PLAN.MIN_MONTHLY}</strong>/mês<br />
        • Faturamento &lt; R${FIREHUB_PLAN.THRESHOLD.toLocaleString("pt-BR")}/mês → {FIREHUB_PLAN.PERCENT_RATE}% do valor<br />
        • Faturamento ≥ R${FIREHUB_PLAN.THRESHOLD.toLocaleString("pt-BR")}/mês → R${FIREHUB_PLAN.MAX_MONTHLY} fixo (teto)<br />
        • Só conta pedidos do FireHub (iFood não entra)<br />
        • 1ª cobrança após {FIREHUB_PLAN.TRIAL_DAYS} dias grátis<br />
        • Débito automático do saldo online
      </div>
    </div>
  );
}

export default function PlanosPage() {
  const [activeTab, setActiveTab] = useState<"mensalidade" | "taxas" | "comparativo">("mensalidade");

  const tabStyle = (t: string) => ({
    padding: "10px 24px", borderRadius: "12px", border: "none", cursor: "pointer",
    fontWeight: 700, fontSize: "0.9rem", fontFamily: "inherit",
    background: activeTab === t ? "#E63946" : "transparent",
    color: activeTab === t ? "#fff" : "#64748B",
    transition: "all 0.2s",
  });

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: "#F8FAFC", minHeight: "100vh" }}>

      {/* HERO */}
      <div style={{ background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)", color: "#fff", padding: "4rem 1.5rem 3rem", textAlign: "center" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "#E6394620", border: "1px solid #E6394640", borderRadius: "100px", padding: "6px 16px", marginBottom: "1.5rem" }}>
            <Zap size={14} color="#E63946" />
            <span style={{ fontSize: "0.8rem", color: "#E63946", fontWeight: 700 }}>Pague só pelo que usar</span>
          </div>
          <h1 style={{ fontWeight: 900, fontSize: "clamp(2rem, 5vw, 3.2rem)", marginBottom: "1rem", lineHeight: 1.1 }}>
            Preços justos.<br />
            <span style={{ color: "#E63946" }}>Sem surpresas.</span>
          </h1>
          <p style={{ fontSize: "1.1rem", color: "#94A3B8", maxWidth: 540, margin: "0 auto 2rem" }}>
            Nosso modelo cresce com você. Quanto mais você fatura, mais sentido faz — com teto máximo de <strong style={{ color: "#fff" }}>R$250/mês</strong>.
          </p>
          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
            <a href="/login" style={{ padding: "14px 32px", borderRadius: "14px", background: "#E63946", color: "#fff", fontWeight: 800, fontSize: "1rem", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "8px" }}>
              Começar Grátis — 15 dias <ArrowRight size={18} />
            </a>
            <a href="#simulador" style={{ padding: "14px 32px", borderRadius: "14px", border: "1.5px solid #334155", color: "#94A3B8", fontWeight: 700, fontSize: "1rem", textDecoration: "none" }}>
              Ver Simulador
            </a>
          </div>
        </div>
      </div>

      {/* NÚMEROS RÁPIDOS */}
      <div style={{ background: "#fff", borderBottom: "1px solid #E2E8F0" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "2rem 1.5rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "2rem", textAlign: "center" }}>
          {[
            { value: "R$60", label: "Mínimo por mês", sub: "Para quem está começando" },
            { value: "4%", label: "Taxa sobre faturamento", sub: "Só pedidos FireHub" },
            { value: "R$250", label: "Teto máximo", sub: "Nunca paga mais que isso" },
            { value: "15 dias", label: "Trial gratuito", sub: "Sem cartão de crédito" },
          ].map((item, i) => (
            <div key={i}>
              <p style={{ fontSize: "2rem", fontWeight: 900, color: "#E63946", margin: "0 0 4px" }}>{item.value}</p>
              <p style={{ fontWeight: 700, fontSize: "0.9rem", margin: "0 0 4px" }}>{item.label}</p>
              <p style={{ fontSize: "0.75rem", color: "#94A3B8", margin: 0 }}>{item.sub}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "2.5rem 1.5rem" }}>

        {/* TABS */}
        <div style={{ display: "flex", gap: "4px", background: "#F1F5F9", borderRadius: "14px", padding: "5px", marginBottom: "2rem", width: "fit-content" }}>
          <button style={tabStyle("mensalidade")} onClick={() => setActiveTab("mensalidade")}>💰 Mensalidade</button>
          <button style={tabStyle("taxas")} onClick={() => setActiveTab("taxas")}>💳 Taxas por Pagamento</button>
          <button style={tabStyle("comparativo")} onClick={() => setActiveTab("comparativo")}>⚖️ Comparativo</button>
        </div>

        {/* ===== ABA MENSALIDADE ===== */}
        {activeTab === "mensalidade" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", alignItems: "start" }}>
            {/* Explicação */}
            <div>
              <h2 style={{ fontWeight: 800, fontSize: "1.5rem", marginBottom: "0.5rem" }}>Mensalidade que cresce com você</h2>
              <p style={{ color: "#64748B", marginBottom: "1.5rem", lineHeight: 1.7 }}>
                Você não paga um valor fixo alto antes de faturar. Começa pequeno e só paga mais quando ganhar mais.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {[
                  { fatur: "R$1.500/mês", mensalidade: "R$60", desc: "Mínimo — para quem está começando" },
                  { fatur: "R$3.000/mês", mensalidade: "R$120", desc: "4% de R$3.000" },
                  { fatur: "R$5.000/mês", mensalidade: "R$200", desc: "4% de R$5.000" },
                  { fatur: "R$6.250+/mês", mensalidade: "R$250", desc: "✅ Teto máximo — nunca paga mais" },
                ].map((row, i) => (
                  <div key={i} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "14px 18px", borderRadius: "12px",
                    background: i === 3 ? "#FFF1F2" : "#F8FAFC",
                    border: i === 3 ? "2px solid #E63946" : "1px solid #E2E8F0"
                  }}>
                    <div>
                      <p style={{ fontWeight: 700, margin: 0, fontSize: "0.9rem" }}>{row.fatur}</p>
                      <p style={{ fontSize: "0.75rem", color: "#94A3B8", margin: 0 }}>{row.desc}</p>
                    </div>
                    <span style={{ fontWeight: 900, fontSize: "1.1rem", color: i === 3 ? "#E63946" : "#0F172A" }}>
                      {row.mensalidade}
                    </span>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: "1.5rem", background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: "12px", padding: "1rem 1.25rem" }}>
                <p style={{ fontWeight: 800, color: "#16A34A", margin: "0 0 8px", fontSize: "0.9rem" }}>✅ Regras importantes:</p>
                <ul style={{ margin: 0, paddingLeft: "1.25rem", fontSize: "0.82rem", color: "#475569", lineHeight: 2 }}>
                  <li>Só contam pedidos feitos <strong>pelo FireHub</strong> (iFood, 99Food não entram)</li>
                  <li>1ª cobrança só após os <strong>15 dias de trial gratuito</strong></li>
                  <li>Débito automático do <strong>saldo online</strong> (sem boleto)</li>
                  <li>Teto de <strong>R$250/mês</strong> — nunca vai além disso</li>
                </ul>
              </div>
            </div>

            {/* Simulador */}
            <div id="simulador">
              <SimuladorMensalidade />
            </div>
          </div>
        )}

        {/* ===== ABA TAXAS ===== */}
        {activeTab === "taxas" && (
          <div>
            <h2 style={{ fontWeight: 800, fontSize: "1.3rem", marginBottom: "0.5rem" }}>Taxas por forma de pagamento</h2>
            <p style={{ color: "#64748B", marginBottom: "1.5rem" }}>
              Cobradas por pedido pago online. Transparente, sem taxas escondidas.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {PAYMENT_FEES.map((f, i) => (
                <div key={i} style={{ background: "#fff", borderRadius: "14px", padding: "1.25rem 1.5rem", border: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ width: 44, height: 44, borderRadius: "12px", background: f.color + "20", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem" }}>
                      {f.icon}
                    </div>
                    <div>
                      <p style={{ fontWeight: 700, margin: 0 }}>{f.method}</p>
                      <p style={{ fontSize: "0.75rem", color: "#94A3B8", margin: 0 }}>{f.settlement}</p>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ fontWeight: 900, fontSize: "1.2rem", color: f.color, margin: 0 }}>{f.fee}</p>
                    <p style={{ fontSize: "0.72rem", color: "#94A3B8", margin: 0 }}>por transação</p>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: "1.5rem", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: "12px", padding: "1rem 1.25rem", fontSize: "0.82rem", color: "#92400E" }}>
              🎫 <strong>Voucher VR, Alelo, Ticket, Ben e Sodexo</strong> são aceitos online — diferencial exclusivo FireHub que a maioria das plataformas não oferece.
            </div>
          </div>
        )}

        {/* ===== ABA COMPARATIVO ===== */}
        {activeTab === "comparativo" && (
          <div>
            <h2 style={{ fontWeight: 800, fontSize: "1.3rem", marginBottom: "0.5rem" }}>FireHub vs Concorrentes</h2>
            <p style={{ color: "#64748B", marginBottom: "1.5rem" }}>Compare e decida com informação.</p>
            <div style={{ background: "#fff", borderRadius: "16px", overflow: "hidden", border: "1px solid #E2E8F0" }}>
              {/* Header */}
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", background: "#0F172A", padding: "14px 20px", gap: "1rem" }}>
                <span style={{ fontWeight: 700, fontSize: "0.8rem", color: "#94A3B8" }}>Funcionalidade</span>
                <span style={{ fontWeight: 800, fontSize: "0.85rem", color: "#E63946", textAlign: "center" }}>🔥 FireHub</span>
                <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "#64748B", textAlign: "center" }}>Concorrente</span>
              </div>
              {FEATURES.map((f, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", padding: "12px 20px", gap: "1rem", borderBottom: "1px solid #F1F5F9", background: i % 2 === 0 ? "#fff" : "#FAFAFA", alignItems: "center" }}>
                  <span style={{ fontSize: "0.85rem", color: "#475569" }}>{f.label}</span>
                  <div style={{ textAlign: "center" }}>
                    {f.firehub === true
                      ? <Check size={18} color="#16A34A" />
                      : f.firehub === false
                      ? <X size={18} color="#DC2626" />
                      : <span style={{ fontWeight: 700, fontSize: "0.8rem", color: "#16A34A" }}>{f.firehub}</span>
                    }
                  </div>
                  <div style={{ textAlign: "center" }}>
                    {f.brendi === true
                      ? <Check size={18} color="#94A3B8" />
                      : f.brendi === false
                      ? <X size={18} color="#DC2626" />
                      : <span style={{ fontWeight: 700, fontSize: "0.8rem", color: "#DC2626" }}>{f.brendi}</span>
                    }
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA FINAL */}
        <div style={{ marginTop: "3rem", background: "linear-gradient(135deg, #E63946, #C62828)", borderRadius: "20px", padding: "2.5rem", textAlign: "center", color: "#fff" }}>
          <h2 style={{ fontWeight: 900, fontSize: "1.6rem", marginBottom: "0.5rem" }}>Pronto para começar?</h2>
          <p style={{ color: "rgba(255,255,255,0.8)", marginBottom: "1.5rem" }}>15 dias grátis. Sem cartão. Cancele quando quiser.</p>
          <a href="/login" style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "14px 36px", borderRadius: "14px", background: "#fff", color: "#E63946", fontWeight: 800, fontSize: "1rem", textDecoration: "none" }}>
            Começar Agora <ArrowRight size={18} />
          </a>
        </div>

      </div>

      <style>{`
        @media (max-width: 768px) {
          div[style*="grid-template-columns: 1fr 1fr"] { grid-template-columns: 1fr !important; }
          div[style*="grid-template-columns: 2fr 1fr 1fr"] { grid-template-columns: 1.5fr 1fr 1fr !important; }
        }
      `}</style>
    </div>
  );
}
