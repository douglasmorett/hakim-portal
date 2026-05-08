"use client";
import { useState, useEffect } from "react";

const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export default function CMVModule() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [costs, setCosts] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/menu-products");
    if (res.ok) {
      const data = await res.json();
      const map: Record<string, string> = {};
      data.forEach((p: any) => { if (p.cost != null) map[p.id] = String(p.cost); });
      setProducts(data);
      setCosts(map);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (product: any) => {
    setSaving(product.id);
    const res = await fetch(`/api/admin/menu-products`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: product.id, cost: parseFloat(costs[product.id] || "0") }),
    });
    setSaving(null);
    if (res.ok) setMsg(`✅ Custo de "${product.name}" salvo!`);
    else setMsg("❌ Erro ao salvar custo.");
  };

  const cmvData = products
    .filter(p => p.cost != null && p.cost > 0 && p.price > 0)
    .map(p => ({
      ...p,
      cmvPercent: ((p.cost / p.price) * 100).toFixed(1),
      margin: p.price - p.cost,
    }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {msg && <div style={{ padding: "10px 16px", borderRadius: "8px", background: msg.startsWith("✅") ? "#f0fdf4" : "#fef2f2", color: msg.startsWith("✅") ? "#16a34a" : "#dc2626" }}>{msg} <button onClick={() => setMsg("")} style={{ float: "right", background: "none", border: "none", cursor: "pointer" }}>×</button></div>}

      <div className="card">
        <h2 className="font-bold text-lg" style={{ marginBottom: "8px" }}>📊 Custo dos Produtos (CMV)</h2>
        <p className="text-muted" style={{ marginBottom: "1.5rem", fontSize: "0.9rem" }}>
          Informe o custo de cada produto para calcular o CMV e a margem de lucro automaticamente.
        </p>

        {loading ? <p className="text-muted">Carregando produtos...</p> : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border-color)", textAlign: "left" }}>
                  <th style={{ padding: "8px" }}>Produto</th>
                  <th style={{ padding: "8px" }}>Tipo</th>
                  <th style={{ padding: "8px", textAlign: "right" }}>Preço Venda</th>
                  <th style={{ padding: "8px", textAlign: "right" }}>Custo (R$)</th>
                  <th style={{ padding: "8px", textAlign: "right" }}>CMV %</th>
                  <th style={{ padding: "8px", textAlign: "right" }}>Margem</th>
                  <th style={{ padding: "8px" }}></th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => {
                  const cost = parseFloat(costs[p.id] || "0");
                  const cmv = p.price > 0 ? ((cost / p.price) * 100) : 0;
                  const margin = p.price - cost;
                  const cmvColor = cmv > 40 ? "#dc2626" : cmv > 30 ? "#f59e0b" : "#16a34a";
                  return (
                    <tr key={p.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                      <td style={{ padding: "8px", fontWeight: 600 }}>{p.name}</td>
                      <td style={{ padding: "8px" }}>
                        <span style={{ padding: "2px 8px", borderRadius: "12px", fontSize: "0.78rem", fontWeight: 600, background: p.isCombo ? "#f0fdf4" : "#eff6ff", color: p.isCombo ? "#16a34a" : "#1d4ed8" }}>
                          {p.isCombo ? "🍱 Combo" : "🍔 Produto"}
                        </span>
                      </td>
                      <td style={{ padding: "8px", textAlign: "right" }}>{fmt(p.price)}</td>
                      <td style={{ padding: "8px", textAlign: "right" }}>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className="input"
                          style={{ width: "100px", textAlign: "right", padding: "4px 8px" }}
                          placeholder="0.00"
                          value={costs[p.id] || ""}
                          onChange={e => setCosts({ ...costs, [p.id]: e.target.value })}
                        />
                      </td>
                      <td style={{ padding: "8px", textAlign: "right", fontWeight: 700, color: cmvColor }}>
                        {cost > 0 ? `${cmv.toFixed(1)}%` : "—"}
                      </td>
                      <td style={{ padding: "8px", textAlign: "right", fontWeight: 600, color: margin > 0 ? "#16a34a" : "#dc2626" }}>
                        {cost > 0 ? fmt(margin) : "—"}
                      </td>
                      <td style={{ padding: "8px" }}>
                        <button
                          onClick={() => handleSave(p)}
                          disabled={saving === p.id}
                          style={{ padding: "6px 12px", background: "#DC2626", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "0.82rem", fontFamily: "inherit", fontWeight: 600 }}
                        >
                          {saving === p.id ? "..." : "Salvar"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* RESUMO CMV */}
      {cmvData.length > 0 && (
        <div className="card">
          <h3 className="font-bold" style={{ marginBottom: "1rem" }}>📈 Resumo de CMV</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem" }}>
            <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "10px", padding: "14px" }}>
              <div style={{ fontSize: "0.8rem", color: "#16a34a", fontWeight: 600 }}>Menor CMV (melhor)</div>
              <div style={{ fontSize: "1.2rem", fontWeight: 800 }}>
                {Math.min(...cmvData.map(p => parseFloat(p.cmvPercent))).toFixed(1)}%
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                {cmvData.sort((a, b) => parseFloat(a.cmvPercent) - parseFloat(b.cmvPercent))[0]?.name}
              </div>
            </div>
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "10px", padding: "14px" }}>
              <div style={{ fontSize: "0.8rem", color: "#dc2626", fontWeight: 600 }}>Maior CMV (atenção)</div>
              <div style={{ fontSize: "1.2rem", fontWeight: 800 }}>
                {Math.max(...cmvData.map(p => parseFloat(p.cmvPercent))).toFixed(1)}%
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                {cmvData.sort((a, b) => parseFloat(b.cmvPercent) - parseFloat(a.cmvPercent))[0]?.name}
              </div>
            </div>
            <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "10px", padding: "14px" }}>
              <div style={{ fontSize: "0.8rem", color: "#1d4ed8", fontWeight: 600 }}>CMV Médio</div>
              <div style={{ fontSize: "1.2rem", fontWeight: 800 }}>
                {(cmvData.reduce((s, p) => s + parseFloat(p.cmvPercent), 0) / cmvData.length).toFixed(1)}%
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{cmvData.length} produtos</div>
            </div>
          </div>
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "12px" }}>
            🎯 Meta ideal: CMV abaixo de 30% para restaurantes. Entre 30–40% é aceitável. Acima de 40% requer atenção.
          </p>
        </div>
      )}
    </div>
  );
}
