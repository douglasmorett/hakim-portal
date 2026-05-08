"use client";
import { useState, useEffect } from "react";

const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
const today = () => new Date().toISOString().split("T")[0];

export default function PayrollModule() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [form, setForm] = useState({ name: "", type: "EMPLOYEE", role: "", amount: "", description: "", payDate: today() });
  const [msg, setMsg] = useState("");

  const load = async () => {
    setLoading(true);
    const res = await fetch(`/api/payroll?month=${month}`);
    const data = await res.json();
    setEntries(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [month]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/payroll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) { setMsg("✅ Lançamento registrado!"); load(); setForm({ name: "", type: "EMPLOYEE", role: "", amount: "", description: "", payDate: today() }); }
    else setMsg("❌ Erro ao salvar.");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este lançamento?")) return;
    await fetch("/api/payroll", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    load();
  };

  const totalEmployees = entries.filter(e => e.type === "EMPLOYEE").reduce((s, e) => s + e.amount, 0);
  const totalFreelancers = entries.filter(e => e.type === "FREELANCER").reduce((s, e) => s + e.amount, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {msg && <div style={{ padding: "10px 16px", borderRadius: "8px", background: msg.startsWith("✅") ? "#f0fdf4" : "#fef2f2", color: msg.startsWith("✅") ? "#16a34a" : "#dc2626" }}>{msg} <button onClick={() => setMsg("")} style={{ float: "right", background: "none", border: "none", cursor: "pointer" }}>×</button></div>}

      {/* FORM */}
      <div className="card">
        <h2 className="font-bold text-lg" style={{ marginBottom: "1rem" }}>➕ Novo Lançamento</h2>
        <form onSubmit={handleAdd} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
          <div>
            <label style={{ display: "block", fontWeight: 600, marginBottom: "4px", fontSize: "0.85rem" }}>Nome</label>
            <input className="input" required placeholder="Nome do funcionário / freelancer" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label style={{ display: "block", fontWeight: 600, marginBottom: "4px", fontSize: "0.85rem" }}>Tipo</label>
            <select className="input" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
              <option value="EMPLOYEE">👤 Funcionário</option>
              <option value="FREELANCER">🔧 Freelancer</option>
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontWeight: 600, marginBottom: "4px", fontSize: "0.85rem" }}>Cargo / Função</label>
            <input className="input" placeholder="Ex: Cozinheiro, Garçom" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} />
          </div>
          <div>
            <label style={{ display: "block", fontWeight: 600, marginBottom: "4px", fontSize: "0.85rem" }}>Valor (R$)</label>
            <input className="input" type="number" step="0.01" required placeholder="0,00" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
          </div>
          <div>
            <label style={{ display: "block", fontWeight: 600, marginBottom: "4px", fontSize: "0.85rem" }}>Data do Pagamento</label>
            <input className="input" type="date" required value={form.payDate} onChange={e => setForm({ ...form, payDate: e.target.value })} />
          </div>
          <div>
            <label style={{ display: "block", fontWeight: 600, marginBottom: "4px", fontSize: "0.85rem" }}>Observação</label>
            <input className="input" placeholder="Opcional" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button type="submit" className="btn btn-primary" style={{ width: "100%", padding: "10px" }}>✅ Lançar</button>
          </div>
        </form>
      </div>

      {/* FILTRO + RESUMO */}
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <label style={{ fontWeight: 600, marginRight: "8px", fontSize: "0.85rem" }}>Mês:</label>
          <input type="month" className="input" style={{ maxWidth: "180px" }} value={month} onChange={e => setMonth(e.target.value)} />
        </div>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "8px", padding: "8px 16px", fontSize: "0.85rem" }}>
            👤 Funcionários: <strong>{fmt(totalEmployees)}</strong>
          </div>
          <div style={{ background: "#fef3c7", border: "1px solid #fde68a", borderRadius: "8px", padding: "8px 16px", fontSize: "0.85rem" }}>
            🔧 Freelancers: <strong>{fmt(totalFreelancers)}</strong>
          </div>
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "8px 16px", fontSize: "0.85rem" }}>
            💰 Total: <strong style={{ color: "#dc2626" }}>{fmt(totalEmployees + totalFreelancers)}</strong>
          </div>
        </div>
      </div>

      {/* LISTA */}
      <div className="card">
        {loading ? <p className="text-muted">Carregando...</p> : entries.length === 0 ? <p className="text-muted">Nenhum lançamento neste mês.</p> : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border-color)", textAlign: "left" }}>
                  <th style={{ padding: "8px" }}>Nome</th>
                  <th style={{ padding: "8px" }}>Tipo</th>
                  <th style={{ padding: "8px" }}>Cargo</th>
                  <th style={{ padding: "8px" }}>Data</th>
                  <th style={{ padding: "8px", textAlign: "right" }}>Valor</th>
                  <th style={{ padding: "8px" }}>Obs.</th>
                  <th style={{ padding: "8px" }}></th>
                </tr>
              </thead>
              <tbody>
                {entries.map(e => (
                  <tr key={e.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                    <td style={{ padding: "8px", fontWeight: 600 }}>{e.name}</td>
                    <td style={{ padding: "8px" }}>
                      <span style={{ padding: "2px 8px", borderRadius: "12px", fontSize: "0.8rem", fontWeight: 600, background: e.type === "EMPLOYEE" ? "#eff6ff" : "#fef3c7", color: e.type === "EMPLOYEE" ? "#1d4ed8" : "#92400e" }}>
                        {e.type === "EMPLOYEE" ? "👤 Funcionário" : "🔧 Freelancer"}
                      </span>
                    </td>
                    <td style={{ padding: "8px", color: "var(--text-muted)" }}>{e.role || "—"}</td>
                    <td style={{ padding: "8px" }}>{new Date(e.payDate).toLocaleDateString("pt-BR", { timeZone: "UTC" })}</td>
                    <td style={{ padding: "8px", textAlign: "right", fontWeight: 700, color: "#dc2626" }}>{fmt(e.amount)}</td>
                    <td style={{ padding: "8px", color: "var(--text-muted)", fontSize: "0.85rem" }}>{e.description || "—"}</td>
                    <td style={{ padding: "8px" }}>
                      <button onClick={() => handleDelete(e.id)} style={{ background: "#fef2f2", color: "#dc2626", border: "none", borderRadius: "6px", padding: "4px 8px", cursor: "pointer" }}>🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
