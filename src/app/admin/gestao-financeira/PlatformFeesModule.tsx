"use client";
import { useState, useEffect } from "react";

const PLATFORMS = [
  { platform: "IFOOD", label: "iFood" },
  { platform: "RAPPI", label: "Rappi" },
  { platform: "AIQFOME", label: "Aiqfome" },
  { platform: "OWN", label: "Loja Própria" },
];

export default function PlatformFeesModule() {
  const [fees, setFees] = useState<any[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");

  const load = async () => {
    const res = await fetch("/api/platform-fees");
    if (res.ok) {
      const data = await res.json();
      const map: Record<string, string> = {};
      data.forEach((f: any) => { map[f.platform] = String(f.feePercent); });
      setFees(data);
      setValues(map);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (platform: string, label: string) => {
    const res = await fetch("/api/platform-fees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform, label, feePercent: values[platform] || "0" }),
    });
    if (res.ok) { setMsg(`✅ Taxa do ${label} salva!`); load(); }
    else setMsg("❌ Erro ao salvar.");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {msg && <div style={{ padding: "10px 16px", borderRadius: "8px", background: msg.startsWith("✅") ? "#f0fdf4" : "#fef2f2", color: msg.startsWith("✅") ? "#16a34a" : "#dc2626" }}>{msg} <button onClick={() => setMsg("")} style={{ float: "right", background: "none", border: "none", cursor: "pointer" }}>×</button></div>}

      <div className="card">
        <h2 className="font-bold text-lg" style={{ marginBottom: "8px" }}>📱 Taxas de Plataforma</h2>
        <p className="text-muted" style={{ marginBottom: "1.5rem", fontSize: "0.9rem" }}>
          Informe a % cobrada por cada plataforma. Esses valores serão descontados automaticamente no cálculo do lucro líquido.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" }}>
          {PLATFORMS.map(p => (
            <div key={p.platform} style={{ border: "1px solid var(--border-color)", borderRadius: "12px", padding: "16px" }}>
              <div style={{ fontWeight: 700, marginBottom: "12px", fontSize: "1.05rem" }}>{p.label}</div>
              <label style={{ fontSize: "0.85rem", fontWeight: 600, display: "block", marginBottom: "4px" }}>Taxa (%)</label>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  className="input"
                  style={{ maxWidth: "100px" }}
                  placeholder="0.0"
                  value={values[p.platform] || ""}
                  onChange={e => setValues({ ...values, [p.platform]: e.target.value })}
                />
                <span style={{ color: "var(--text-muted)" }}>%</span>
                <button
                  onClick={() => handleSave(p.platform, p.label)}
                  style={{ padding: "8px 16px", background: "#DC2626", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 600, fontSize: "0.85rem", fontFamily: "inherit" }}
                >
                  Salvar
                </button>
              </div>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "8px" }}>
                Ex: iFood cobra ~12% a 27% dependendo do plano
              </p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "10px", padding: "12px 16px", fontSize: "0.85rem", color: "#92400e" }}>
        💡 <strong>Como funciona:</strong> A cada pedido entrado pelo iFood, o sistema calcula automaticamente o valor bruto menos a taxa configurada aqui para exibir o lucro líquido real no relatório.
      </div>
    </div>
  );
}
