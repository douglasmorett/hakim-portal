"use client";
import { useState, useEffect } from "react";

const METHODS = [
  { method: "CASH", label: "Dinheiro" },
  { method: "CARD_CREDIT", label: "Cartão Crédito" },
  { method: "CARD_DEBIT", label: "Cartão Débito" },
  { method: "PIX", label: "PIX" },
  { method: "VOUCHER", label: "Vale/Voucher" },
  { method: "OTHER", label: "Outro" },
];

const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export default function CashRegisterModule() {
  const [data, setData] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openingAmount, setOpeningAmount] = useState("");
  const [entries, setEntries] = useState(METHODS.map(m => ({ ...m, actualAmount: "" })));
  const [justification, setJustification] = useState("");
  const [discInfo, setDiscInfo] = useState<any>(null);
  const [msg, setMsg] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  const load = async () => {
    setLoading(true);
    const [curr, hist] = await Promise.all([
      fetch("/api/cash-register?mode=current").then(r => r.json()),
      fetch("/api/cash-register?mode=history").then(r => r.json()),
    ]);
    setData(curr);
    setHistory(hist);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleOpen = async () => {
    if (!openingAmount) return setMsg("Informe o valor inicial do caixa.");
    const res = await fetch("/api/cash-register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ openingAmount }),
    });
    const json = await res.json();
    if (!res.ok) return setMsg(json.error);
    setMsg("✅ Caixa aberto com sucesso!");
    setOpeningAmount("");
    load();
  };

  const handleClose = async () => {
    const res = await fetch("/api/cash-register", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        registerId: data.register.id,
        entries: entries.map(e => ({ method: e.method, methodLabel: e.label, actualAmount: e.actualAmount || "0" })),
        justification,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      if (json.discrepancy !== undefined) setDiscInfo(json);
      return setMsg("⚠️ " + json.error);
    }
    setMsg("✅ Caixa fechado com sucesso!");
    setDiscInfo(null);
    load();
  };

  if (loading) return <p className="text-muted">Carregando...</p>;

  const register = data?.register;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {msg && (
        <div style={{ padding: "12px 16px", borderRadius: "10px", background: msg.startsWith("✅") ? "#f0fdf4" : "#fef2f2", color: msg.startsWith("✅") ? "#16a34a" : "#dc2626", border: `1px solid ${msg.startsWith("✅") ? "#bbf7d0" : "#fecaca"}` }}>
          {msg} <button onClick={() => setMsg("")} style={{ float: "right", background: "none", border: "none", cursor: "pointer", fontWeight: "bold" }}>×</button>
        </div>
      )}

      {!register ? (
        /* ABERTURA DE CAIXA */
        <div className="card">
          <h2 className="font-bold text-lg" style={{ marginBottom: "1rem" }}>🔓 Abrir Caixa</h2>
          <p className="text-muted" style={{ marginBottom: "1rem" }}>Informe o valor em dinheiro disponível para iniciar o caixa.</p>
          <label style={{ display: "block", fontWeight: 600, marginBottom: "6px" }}>Valor de abertura (dinheiro em caixa)</label>
          <input type="number" step="0.01" className="input" placeholder="R$ 0,00" value={openingAmount} onChange={e => setOpeningAmount(e.target.value)} style={{ maxWidth: "250px", marginBottom: "1rem" }} />
          <br />
          <button onClick={handleOpen} className="btn btn-primary" style={{ padding: "10px 24px" }}>🔓 Abrir Caixa</button>
        </div>
      ) : (
        /* FECHAMENTO DE CAIXA */
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "8px" }}>
            <h2 className="font-bold text-lg">🏦 Fechar Caixa</h2>
            <span style={{ background: "#dcfce7", color: "#16a34a", padding: "4px 12px", borderRadius: "20px", fontSize: "0.85rem", fontWeight: 600 }}>
              ✅ Caixa aberto desde {new Date(register.openedAt).toLocaleString("pt-BR")}
            </span>
          </div>

          <p className="text-muted" style={{ marginBottom: "1.5rem" }}>
            Troco inicial: <strong>{fmt(register.openingAmount)}</strong>
          </p>

          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem", marginBottom: "1rem" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--border-color)" }}>
                <th style={{ padding: "8px", textAlign: "left" }}>Forma de Pagamento</th>
                <th style={{ padding: "8px", textAlign: "right" }}>Sistema Esperava</th>
                <th style={{ padding: "8px", textAlign: "right" }}>Você Tem (R$)</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => (
                <tr key={e.method} style={{ borderBottom: "1px solid var(--border-color)" }}>
                  <td style={{ padding: "10px 8px", fontWeight: 600 }}>{e.label}</td>
                  <td style={{ padding: "10px 8px", textAlign: "right", color: "var(--text-muted)" }}>
                    {discInfo ? fmt(discInfo.expectedByMethod?.[e.method] || 0) : "—"}
                  </td>
                  <td style={{ padding: "10px 8px", textAlign: "right" }}>
                    <input
                      type="number"
                      step="0.01"
                      className="input"
                      placeholder="0.00"
                      value={e.actualAmount}
                      onChange={ev => {
                        const updated = [...entries];
                        updated[i] = { ...e, actualAmount: ev.target.value };
                        setEntries(updated);
                      }}
                      style={{ width: "130px", textAlign: "right", padding: "6px 10px" }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: "2px solid var(--border-color)", fontWeight: 700 }}>
                <td style={{ padding: "10px 8px" }}>TOTAL</td>
                <td style={{ padding: "10px 8px", textAlign: "right", color: "var(--text-muted)" }}>
                  {discInfo ? fmt(discInfo.expectedTotal) : "—"}
                </td>
                <td style={{ padding: "10px 8px", textAlign: "right", color: "#DC2626" }}>
                  {fmt(entries.reduce((s, e) => s + parseFloat(e.actualAmount || "0"), 0))}
                </td>
              </tr>
            </tfoot>
          </table>

          {discInfo && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "10px", padding: "12px 16px", marginBottom: "1rem" }}>
              <p style={{ color: "#dc2626", fontWeight: 700, marginBottom: "8px" }}>
                ⚠️ Discrepância detectada: {fmt(discInfo.discrepancy)} — Justifique para fechar o caixa:
              </p>
              <textarea className="input" rows={3} placeholder="Informe o motivo da diferença no caixa..." value={justification} onChange={e => setJustification(e.target.value)} style={{ width: "100%", resize: "none" }} />
            </div>
          )}

          <button onClick={handleClose} style={{ padding: "12px 28px", background: "#DC2626", color: "#fff", border: "none", borderRadius: "10px", fontWeight: 700, cursor: "pointer", fontSize: "1rem", fontFamily: "inherit" }}>
            🔒 Fechar Caixa
          </button>
        </div>
      )}

      {/* HISTÓRICO */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h2 className="font-bold text-lg">📋 Histórico de Fechamentos</h2>
          <button onClick={() => setShowHistory(!showHistory)} style={{ background: "none", border: "none", cursor: "pointer", color: "#DC2626", fontWeight: 600 }}>
            {showHistory ? "Ocultar" : "Ver histórico"}
          </button>
        </div>
        {showHistory && (
          history.length === 0 ? <p className="text-muted">Nenhum fechamento registrado.</p> :
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border-color)", textAlign: "left" }}>
                  <th style={{ padding: "8px" }}>Data Abertura</th>
                  <th style={{ padding: "8px" }}>Data Fechamento</th>
                  <th style={{ padding: "8px" }}>Esperado</th>
                  <th style={{ padding: "8px" }}>Informado</th>
                  <th style={{ padding: "8px" }}>Diferença</th>
                  <th style={{ padding: "8px" }}>Justificativa</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h: any) => (
                  <tr key={h.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                    <td style={{ padding: "8px" }}>{new Date(h.openedAt).toLocaleString("pt-BR")}</td>
                    <td style={{ padding: "8px" }}>{h.closedAt ? new Date(h.closedAt).toLocaleString("pt-BR") : "—"}</td>
                    <td style={{ padding: "8px" }}>{fmt(h.expectedTotal || 0)}</td>
                    <td style={{ padding: "8px" }}>{fmt(h.actualTotal || 0)}</td>
                    <td style={{ padding: "8px", color: Math.abs(h.discrepancy || 0) > 0.5 ? "#dc2626" : "#16a34a", fontWeight: 600 }}>
                      {fmt(h.discrepancy || 0)}
                    </td>
                    <td style={{ padding: "8px", color: "var(--text-muted)", maxWidth: "200px" }}>{h.justification || "—"}</td>
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
