"use client";
import { useState, useEffect } from "react";
import { Calculator, TrendingUp, TrendingDown, AlertTriangle, PieChart, DollarSign } from "lucide-react";

type CmvEntry = {
  id: string;
  month: string;
  faturamento: number;
  custoInsumos: number;
  cmvPercent: number;
};

export default function CmvPage() {
  const [entries, setEntries] = useState<CmvEntry[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ month: new Date().toISOString().slice(0, 7), faturamento: 0, custoInsumos: 0 });

  useEffect(() => {
    const saved = localStorage.getItem("firehub_cmv");
    if (saved) {
      setEntries(JSON.parse(saved));
    } else {
      const demo: CmvEntry[] = [
        { id: "1", month: "2026-01", faturamento: 18500, custoInsumos: 5920, cmvPercent: 32 },
        { id: "2", month: "2026-02", faturamento: 22300, custoInsumos: 6690, cmvPercent: 30 },
        { id: "3", month: "2026-03", faturamento: 25800, custoInsumos: 8256, cmvPercent: 32 },
        { id: "4", month: "2026-04", faturamento: 28100, custoInsumos: 7867, cmvPercent: 28 },
        { id: "5", month: "2026-05", faturamento: 12500, custoInsumos: 3750, cmvPercent: 30 },
      ];
      setEntries(demo);
      localStorage.setItem("firehub_cmv", JSON.stringify(demo));
    }
  }, []);

  const save = (updated: CmvEntry[]) => {
    setEntries(updated);
    localStorage.setItem("firehub_cmv", JSON.stringify(updated));
  };

  const addEntry = () => {
    if (!form.faturamento) return;
    const cmv = form.faturamento > 0 ? Math.round((form.custoInsumos / form.faturamento) * 100) : 0;
    const entry: CmvEntry = {
      id: Date.now().toString(),
      month: form.month,
      faturamento: form.faturamento,
      custoInsumos: form.custoInsumos,
      cmvPercent: cmv,
    };
    save([...entries, entry].sort((a, b) => b.month.localeCompare(a.month)));
    setForm({ month: new Date().toISOString().slice(0, 7), faturamento: 0, custoInsumos: 0 });
    setShowAdd(false);
  };

  const lastMonth = entries[0];
  const prevMonth = entries[1];
  const avgCmv = entries.length > 0 ? Math.round(entries.reduce((a, e) => a + e.cmvPercent, 0) / entries.length) : 0;
  const cmvTrend = lastMonth && prevMonth ? lastMonth.cmvPercent - prevMonth.cmvPercent : 0;

  const getCmvColor = (pct: number) => pct <= 28 ? "#22C55E" : pct <= 33 ? "#F59E0B" : "#EF4444";
  const getCmvLabel = (pct: number) => pct <= 28 ? "Excelente" : pct <= 33 ? "Aceitável" : "Alto - Atenção!";

  const formatMonth = (m: string) => {
    const [y, mo] = m.split("-");
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    return `${months[parseInt(mo) - 1]}/${y}`;
  };

  const totalFat = entries.reduce((a, e) => a + e.faturamento, 0);
  const totalCusto = entries.reduce((a, e) => a + e.custoInsumos, 0);
  const lucroBruto = lastMonth ? lastMonth.faturamento - lastMonth.custoInsumos : 0;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, display: "flex", alignItems: "center", gap: 10 }}>
            <Calculator size={28} /> CMV — Custo de Mercadoria Vendida
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: ".85rem" }}>Controle automático do custo sobre vendas</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          + Registrar Mês
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: 20, textAlign: "center" }}>
          <PieChart size={24} style={{ color: lastMonth ? getCmvColor(lastMonth.cmvPercent) : "#6B7280", marginBottom: 8 }} />
          <p style={{ fontSize: "2.2rem", fontWeight: 900, color: lastMonth ? getCmvColor(lastMonth.cmvPercent) : "#6B7280" }}>
            {lastMonth ? `${lastMonth.cmvPercent}%` : "—"}
          </p>
          <p style={{ fontSize: ".8rem", color: "var(--text-muted)" }}>CMV Atual</p>
          {lastMonth && <p style={{ fontSize: ".72rem", color: getCmvColor(lastMonth.cmvPercent), fontWeight: 600 }}>{getCmvLabel(lastMonth.cmvPercent)}</p>}
        </div>
        <div className="card" style={{ padding: 20, textAlign: "center" }}>
          <TrendingUp size={24} style={{ color: "#3B82F6", marginBottom: 8 }} />
          <p style={{ fontSize: "2.2rem", fontWeight: 900 }}>{avgCmv}%</p>
          <p style={{ fontSize: ".8rem", color: "var(--text-muted)" }}>Média Histórica</p>
        </div>
        <div className="card" style={{ padding: 20, textAlign: "center" }}>
          <DollarSign size={24} style={{ color: "#22C55E", marginBottom: 8 }} />
          <p style={{ fontSize: "1.6rem", fontWeight: 900, color: "#22C55E" }}>R$ {lucroBruto.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}</p>
          <p style={{ fontSize: ".8rem", color: "var(--text-muted)" }}>Lucro Bruto (último mês)</p>
        </div>
        <div className="card" style={{ padding: 20, textAlign: "center" }}>
          {cmvTrend <= 0 ? (
            <TrendingDown size={24} style={{ color: "#22C55E", marginBottom: 8 }} />
          ) : (
            <TrendingUp size={24} style={{ color: "#EF4444", marginBottom: 8 }} />
          )}
          <p style={{ fontSize: "2.2rem", fontWeight: 900, color: cmvTrend <= 0 ? "#22C55E" : "#EF4444" }}>
            {cmvTrend > 0 ? "+" : ""}{cmvTrend}%
          </p>
          <p style={{ fontSize: ".8rem", color: "var(--text-muted)" }}>Tendência</p>
        </div>
      </div>

      {/* Meta CMV */}
      <div className="card" style={{ padding: 20, marginBottom: 24 }}>
        <h3 style={{ fontSize: ".9rem", fontWeight: 700, marginBottom: 12 }}>🎯 Meta de CMV Ideal: 28% a 32%</h3>
        <div style={{ position: "relative", height: 32, background: "#F3F4F6", borderRadius: 16, overflow: "hidden" }}>
          <div style={{
            position: "absolute", left: 0, top: 0, bottom: 0,
            width: `${Math.min(100, lastMonth?.cmvPercent || 0)}%`,
            background: `linear-gradient(90deg, #22C55E 0%, #22C55E 28%, #F59E0B 33%, #EF4444 45%)`,
            borderRadius: 16,
            transition: "width 0.5s",
          }} />
          <div style={{ position: "absolute", left: "28%", top: 0, bottom: 0, width: 2, background: "rgba(0,0,0,0.2)" }} />
          <div style={{ position: "absolute", left: "33%", top: 0, bottom: 0, width: 2, background: "rgba(0,0,0,0.2)" }} />
          {lastMonth && (
            <div style={{
              position: "absolute",
              left: `${Math.min(95, lastMonth.cmvPercent)}%`,
              top: "50%",
              transform: "translate(-50%, -50%)",
              background: "#fff",
              border: `2px solid ${getCmvColor(lastMonth.cmvPercent)}`,
              borderRadius: "50%",
              width: 24, height: 24,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: ".65rem", fontWeight: 900,
              color: getCmvColor(lastMonth.cmvPercent),
            }}>
              {lastMonth.cmvPercent}
            </div>
          )}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".7rem", color: "var(--text-muted)", marginTop: 6 }}>
          <span>0%</span>
          <span style={{ color: "#22C55E" }}>28% ótimo</span>
          <span style={{ color: "#F59E0B" }}>33% limite</span>
          <span style={{ color: "#EF4444" }}>50%+</span>
        </div>
      </div>

      {/* Modal adicionar */}
      {showAdd && (
        <div className="card" style={{ padding: 20, marginBottom: 20, border: "2px solid var(--primary)" }}>
          <h3 style={{ marginBottom: 16, fontSize: "1rem", fontWeight: 700 }}>Registrar Período</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: ".78rem", fontWeight: 600, display: "block", marginBottom: 4 }}>Mês</label>
              <input className="input" type="month" value={form.month} onChange={e => setForm({ ...form, month: e.target.value })} style={{ width: "100%" }} />
            </div>
            <div>
              <label style={{ fontSize: ".78rem", fontWeight: 600, display: "block", marginBottom: 4 }}>Faturamento (R$)</label>
              <input className="input" type="number" value={form.faturamento} onChange={e => setForm({ ...form, faturamento: +e.target.value })} style={{ width: "100%" }} />
            </div>
            <div>
              <label style={{ fontSize: ".78rem", fontWeight: 600, display: "block", marginBottom: 4 }}>Custo Insumos (R$)</label>
              <input className="input" type="number" value={form.custoInsumos} onChange={e => setForm({ ...form, custoInsumos: +e.target.value })} style={{ width: "100%" }} />
            </div>
          </div>
          {form.faturamento > 0 && (
            <p style={{ marginTop: 12, fontWeight: 700, color: getCmvColor(Math.round((form.custoInsumos / form.faturamento) * 100)) }}>
              CMV calculado: {Math.round((form.custoInsumos / form.faturamento) * 100)}%
            </p>
          )}
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button onClick={addEntry} className="btn btn-primary">Salvar</button>
            <button onClick={() => setShowAdd(false)} className="btn btn-outline">Cancelar</button>
          </div>
        </div>
      )}

      {/* Tabela histórico */}
      <div className="card" style={{ overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid var(--border-color)" }}>
              <th style={{ padding: "12px 16px", textAlign: "left", fontSize: ".78rem" }}>Mês</th>
              <th style={{ padding: "12px 16px", textAlign: "right", fontSize: ".78rem" }}>Faturamento</th>
              <th style={{ padding: "12px 16px", textAlign: "right", fontSize: ".78rem" }}>Custo Insumos</th>
              <th style={{ padding: "12px 16px", textAlign: "right", fontSize: ".78rem" }}>Lucro Bruto</th>
              <th style={{ padding: "12px 16px", textAlign: "center", fontSize: ".78rem" }}>CMV %</th>
              <th style={{ padding: "12px 16px", textAlign: "center", fontSize: ".78rem" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(e => (
              <tr key={e.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                <td style={{ padding: "12px 16px", fontWeight: 600 }}>{formatMonth(e.month)}</td>
                <td style={{ padding: "12px 16px", textAlign: "right" }}>R$ {e.faturamento.toLocaleString("pt-BR")}</td>
                <td style={{ padding: "12px 16px", textAlign: "right", color: "#EF4444" }}>R$ {e.custoInsumos.toLocaleString("pt-BR")}</td>
                <td style={{ padding: "12px 16px", textAlign: "right", color: "#22C55E", fontWeight: 700 }}>R$ {(e.faturamento - e.custoInsumos).toLocaleString("pt-BR")}</td>
                <td style={{ padding: "12px 16px", textAlign: "center" }}>
                  <span style={{ fontSize: "1.1rem", fontWeight: 900, color: getCmvColor(e.cmvPercent) }}>{e.cmvPercent}%</span>
                </td>
                <td style={{ padding: "12px 16px", textAlign: "center" }}>
                  <span style={{
                    background: e.cmvPercent <= 28 ? "#DCFCE7" : e.cmvPercent <= 33 ? "#FEF3C7" : "#FEE2E2",
                    color: getCmvColor(e.cmvPercent),
                    padding: "4px 12px", borderRadius: 20, fontSize: ".75rem", fontWeight: 600,
                  }}>
                    {getCmvLabel(e.cmvPercent)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
