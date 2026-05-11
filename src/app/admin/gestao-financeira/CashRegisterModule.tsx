"use client";
import { useState, useEffect, useCallback } from "react";
import { Loader2, MessageCircle, ChevronDown, ChevronUp } from "lucide-react";

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const METHOD_LABELS: Record<string, string> = {
  CASH:        "💵 Dinheiro",
  CARD_CREDIT: "💳 Cartão Crédito",
  CARD_DEBIT:  "💳 Cartão Débito",
  PIX:         "📱 PIX",
  VOUCHER:     "🎟️ Voucher",
  IFOOD:       "🛵 iFood (Online)",
  ONLINE:      "💻 Pag. Online",
  OTHER:       "🔄 Outro",
};

const ALL_METHODS = ["CASH","CARD_CREDIT","CARD_DEBIT","PIX","VOUCHER","IFOOD","ONLINE","OTHER"];

export default function CashRegisterModule() {
  const [register,      setRegister]      = useState<any>(null);
  const [preview,       setPreview]       = useState<any>(null);
  const [todayHistory,  setTodayHistory]  = useState<any[]>([]);
  const [fullHistory,   setFullHistory]   = useState<any[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [submitting,    setSubmitting]    = useState(false);
  const [openingAmount, setOpeningAmount] = useState("");
  const [actualValues,  setActualValues]  = useState<Record<string,string>>({});
  const [justification, setJustification] = useState("");
  const [discInfo,      setDiscInfo]      = useState<any>(null);
  const [msg,           setMsg]           = useState<{text:string;ok:boolean}|null>(null);
  const [showToday,     setShowToday]     = useState(true);
  const [showHistory,   setShowHistory]   = useState(false);
  const [waLink,        setWaLink]        = useState("");

  const showMsg = (text: string, ok: boolean) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 6000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    const [curr, today, hist] = await Promise.all([
      fetch("/api/cash-register?mode=current").then(r => r.json()),
      fetch("/api/cash-register?mode=today").then(r => r.json()),
      fetch("/api/cash-register?mode=history").then(r => r.json()),
    ]);
    setRegister(curr.register ?? null);
    setTodayHistory(Array.isArray(today) ? today : []);
    setFullHistory(Array.isArray(hist) ? hist : []);

    // Se caixa aberto, já carrega o preview
    if (curr.register) {
      fetch("/api/cash-register?mode=preview")
        .then(r => r.json())
        .then(p => { if (!p.error) setPreview(p); });
    } else {
      setPreview(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ─── ABRIR CAIXA ─── */
  const handleOpen = async () => {
    setSubmitting(true);
    try {
      const res  = await fetch("/api/cash-register", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ openingAmount: openingAmount || "0" }),
      });
      const json = await res.json();
      if (!res.ok) return showMsg(json.error || "Erro ao abrir caixa.", false);
      showMsg("✅ Caixa aberto com sucesso!", true);
      setOpeningAmount("");
      load();
    } finally { setSubmitting(false); }
  };

  /* ─── FECHAR CAIXA ─── */
  const handleClose = async () => {
    const totalInformado = Object.values(actualValues).reduce((s, v) => s + parseFloat(v || "0"), 0);
    const ok = window.confirm(
      `Fechar o caixa?\nTotal informado: ${fmt(totalInformado)}\n\nConfirmar?`
    );
    if (!ok) return;

    setSubmitting(true);
    setDiscInfo(null);
    try {
      const entries = ALL_METHODS.map(m => ({
        method:      m,
        methodLabel: METHOD_LABELS[m],
        actualAmount: actualValues[m] || "0",
      }));
      const res  = await fetch("/api/cash-register", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registerId: register.id, entries, justification }),
      });
      const json = await res.json();
      if (!res.ok) {
        setDiscInfo(json);
        return showMsg("⚠️ " + (json.error || "Discrepância detectada."), false);
      }
      showMsg("✅ Caixa fechado com sucesso!", true);
      if (json.waLink) setWaLink(json.waLink);
      setActualValues({});
      setJustification("");
      setDiscInfo(null);
      load();
    } finally { setSubmitting(false); }
  };

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", gap:"10px", padding:"2rem", color:"var(--text-muted)" }}>
      <Loader2 size={20} className="animate-spin" /> Carregando caixa...
    </div>
  );

  /* ─── BADGE STATUS ─── */
  const StatusBadge = () => (
    <div style={{
      display:"flex", alignItems:"center", gap:"12px", padding:"14px 20px",
      borderRadius:"12px",
      background: register ? "linear-gradient(135deg,#f0fdf4,#dcfce7)" : "linear-gradient(135deg,#fff7ed,#fef2f2)",
      border: `1.5px solid ${register ? "#86efac" : "#fca5a5"}`,
      fontWeight:700, fontSize:"1rem", marginBottom:"1.5rem",
    }}>
      <span style={{ fontSize:"1.5rem" }}>{register ? "🟢" : "🔴"}</span>
      <div>
        <div>{register ? "Caixa ABERTO" : "Caixa FECHADO"}</div>
        {register && (
          <div style={{ fontWeight:400, fontSize:"0.85rem", color:"var(--text-muted)", marginTop:"2px" }}>
            Desde {new Date(register.openedAt).toLocaleString("pt-BR")} · Troco inicial: {fmt(register.openingAmount)}
          </div>
        )}
      </div>
    </div>
  );

  /* ─── TABELA DE ESPERADO ─── */
  const PreviewTable = () => {
    if (!preview) return null;
    return (
      <div style={{ background:"var(--card-bg,#f8fafc)", border:"1px solid var(--border-color)", borderRadius:"10px", padding:"1rem", marginBottom:"1.25rem" }}>
        <p style={{ fontWeight:700, marginBottom:"0.75rem", fontSize:"0.95rem" }}>📊 Resumo dos pedidos entregues nesta sessão:</p>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:"8px" }}>
          {Object.entries(preview.byMethod as Record<string,number>).filter(([,v])=>v>0).map(([k,v])=>(
            <div key={k} style={{ background:"white", border:"1px solid var(--border-color)", borderRadius:"8px", padding:"8px 12px" }}>
              <div style={{ fontSize:"0.8rem", color:"var(--text-muted)" }}>{METHOD_LABELS[k]||k}</div>
              <div style={{ fontWeight:700, color:"#DC2626", fontSize:"1rem" }}>{fmt(v)}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop:"10px", display:"flex", gap:"16px", fontSize:"0.85rem", color:"var(--text-muted)" }}>
          <span>🛵 iFood: <strong>{fmt(preview.ifoodTotal)}</strong></span>
          <span>💻 Online: <strong>{fmt(preview.onlineTotal)}</strong></span>
          <span>📦 Pedidos: <strong>{preview.orderCount}</strong></span>
          <span style={{ marginLeft:"auto", fontWeight:700 }}>Total esperado: <span style={{ color:"#16a34a" }}>{fmt(preview.totalExpected)}</span></span>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"1.5rem" }}>

      {/* MSG */}
      {msg && (
        <div style={{
          padding:"12px 16px", borderRadius:"10px",
          background: msg.ok?"#f0fdf4":"#fef2f2",
          color: msg.ok?"#16a34a":"#dc2626",
          border:`1px solid ${msg.ok?"#bbf7d0":"#fecaca"}`,
          display:"flex", justifyContent:"space-between", alignItems:"center", fontWeight:600,
        }}>
          <span>{msg.text}</span>
          <button onClick={()=>setMsg(null)} style={{ background:"none",border:"none",cursor:"pointer",fontSize:"1.2rem" }}>×</button>
        </div>
      )}

      {/* WhatsApp link após fechamento */}
      {waLink && (
        <div style={{ padding:"14px 18px", background:"#f0fdf4", border:"1px solid #86efac", borderRadius:"10px", display:"flex", alignItems:"center", gap:"12px" }}>
          <MessageCircle size={22} color="#16a34a" />
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:700, color:"#16a34a" }}>Caixa fechado! Envie o resumo pelo WhatsApp:</div>
          </div>
          <a href={waLink} target="_blank" rel="noopener noreferrer"
            style={{ padding:"10px 20px", background:"#25D366", color:"white", borderRadius:"8px", fontWeight:700, textDecoration:"none", display:"flex", alignItems:"center", gap:"6px" }}>
            <MessageCircle size={16} /> Enviar WhatsApp
          </a>
          <button onClick={()=>setWaLink("")} style={{ background:"none",border:"none",cursor:"pointer",fontSize:"1.2rem",color:"#6b7280" }}>×</button>
        </div>
      )}

      <StatusBadge />

      {!register ? (
        /* ─── ABERTURA ─── */
        <div className="card">
          <h2 className="font-bold text-lg" style={{ marginBottom:"1rem" }}>🔓 Abrir Caixa</h2>
          <p className="text-muted" style={{ marginBottom:"1rem" }}>
            Informe o valor em dinheiro que está fisicamente no caixa para troco. Pode ser R$ 0,00.
          </p>
          <label style={{ display:"block", fontWeight:600, marginBottom:"6px" }}>
            💵 Dinheiro disponível para troco:
          </label>
          <input
            type="number" step="0.01" min="0" className="input"
            placeholder="R$ 0,00" value={openingAmount}
            onChange={e=>setOpeningAmount(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&handleOpen()}
            style={{ maxWidth:"250px", marginBottom:"1.5rem" }}
            disabled={submitting}
          />
          <br />
          <button onClick={handleOpen} disabled={submitting} style={{
            display:"inline-flex", alignItems:"center", gap:"8px",
            padding:"12px 32px", background:"#16a34a", color:"#fff",
            border:"none", borderRadius:"10px", fontWeight:700, fontSize:"1rem",
            cursor:submitting?"not-allowed":"pointer", opacity:submitting?0.7:1,
            fontFamily:"inherit", boxShadow:"0 2px 8px rgba(22,163,74,0.3)",
          }}>
            {submitting ? <Loader2 size={18} className="animate-spin"/> : "🔓"}
            {submitting ? "Abrindo..." : "Abrir Caixa"}
          </button>
        </div>
      ) : (
        /* ─── FECHAMENTO ─── */
        <div className="card">
          <h2 className="font-bold text-lg" style={{ marginBottom:"1rem" }}>🔒 Fechar Caixa</h2>

          <PreviewTable />

          <p style={{ marginBottom:"1rem", fontSize:"0.9rem", color:"var(--text-muted)" }}>
            Agora informe quanto você tem <strong>fisicamente</strong> em cada forma de pagamento:
          </p>

          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:"10px", marginBottom:"1.25rem" }}>
            {ALL_METHODS.map(m => {
              const expected = preview?.byMethod?.[m] || 0;
              const actual   = parseFloat(actualValues[m]||"0");
              const diff     = actual - expected;
              const hasVal   = actualValues[m] !== undefined && actualValues[m] !== "";
              return (
                <div key={m} style={{
                  background:"var(--card-bg,#f8fafc)", border:`1.5px solid ${hasVal && Math.abs(diff)>0.5 ? (diff>0?"#fbbf24":"#f87171") : "var(--border-color)"}`,
                  borderRadius:"10px", padding:"12px",
                }}>
                  <div style={{ fontWeight:600, marginBottom:"6px", fontSize:"0.9rem" }}>{METHOD_LABELS[m]}</div>
                  <div style={{ fontSize:"0.8rem", color:"var(--text-muted)", marginBottom:"6px" }}>
                    Esperado: <strong style={{ color:"#16a34a" }}>{fmt(expected)}</strong>
                  </div>
                  <input
                    type="number" step="0.01" min="0" className="input"
                    placeholder="0,00"
                    value={actualValues[m]||""}
                    onChange={ev=>setActualValues(p=>({...p,[m]:ev.target.value}))}
                    disabled={submitting}
                    style={{ width:"100%", textAlign:"right", padding:"8px 10px" }}
                  />
                  {hasVal && Math.abs(diff)>0.5 && (
                    <div style={{ fontSize:"0.78rem", marginTop:"4px", color:diff>0?"#ca8a04":"#dc2626", fontWeight:600 }}>
                      {diff>0 ? `▲ Sobra ${fmt(diff)}` : `▼ Falta ${fmt(Math.abs(diff))}`}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Totais */}
          <div style={{ display:"flex", gap:"16px", flexWrap:"wrap", marginBottom:"1.25rem", padding:"12px 16px", background:"#f8fafc", borderRadius:"10px", border:"1px solid var(--border-color)" }}>
            <div>
              <div style={{ fontSize:"0.8rem", color:"var(--text-muted)" }}>Total esperado</div>
              <div style={{ fontWeight:700, color:"#16a34a", fontSize:"1.1rem" }}>{fmt(preview?.totalExpected||0)}</div>
            </div>
            <div>
              <div style={{ fontSize:"0.8rem", color:"var(--text-muted)" }}>Total informado</div>
              <div style={{ fontWeight:700, color:"#DC2626", fontSize:"1.1rem" }}>
                {fmt(Object.values(actualValues).reduce((s,v)=>s+parseFloat(v||"0"),0))}
              </div>
            </div>
          </div>

          {discInfo && (
            <div style={{ background:"#fef2f2", border:"1px solid #fecaca", borderRadius:"10px", padding:"12px 16px", marginBottom:"1rem" }}>
              <p style={{ color:"#dc2626", fontWeight:700, marginBottom:"8px" }}>
                ⚠️ Discrepância de {fmt(Math.abs(discInfo.discrepancy||0))} — Justifique para fechar:
              </p>
              <textarea className="input" rows={3}
                placeholder="Ex: Quebra de caixa, troco errado, sangria..." value={justification}
                onChange={e=>setJustification(e.target.value)} disabled={submitting}
                style={{ width:"100%", resize:"none" }}
              />
            </div>
          )}

          <button onClick={handleClose} disabled={submitting} style={{
            display:"inline-flex", alignItems:"center", gap:"8px",
            padding:"12px 32px", background:"#DC2626", color:"#fff",
            border:"none", borderRadius:"10px", fontWeight:700, fontSize:"1rem",
            cursor:submitting?"not-allowed":"pointer", opacity:submitting?0.7:1,
            fontFamily:"inherit", boxShadow:"0 2px 8px rgba(220,38,38,0.3)",
          }}>
            {submitting ? <Loader2 size={18} className="animate-spin"/> : "🔒"}
            {submitting ? "Fechando caixa..." : "Fechar Caixa"}
          </button>
        </div>
      )}

      {/* ─── MOVIMENTAÇÕES DO DIA ─── */}
      <div className="card">
        <button onClick={()=>setShowToday(p=>!p)} style={{
          display:"flex", justifyContent:"space-between", alignItems:"center",
          width:"100%", background:"none", border:"none", cursor:"pointer", fontFamily:"inherit",
        }}>
          <h2 className="font-bold text-lg">📅 Movimentações de Hoje ({todayHistory.length})</h2>
          {showToday ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
        </button>

        {showToday && (
          <div style={{ marginTop:"1rem" }}>
            {todayHistory.length === 0 ? (
              <p className="text-muted">Nenhuma movimentação hoje.</p>
            ) : (
              todayHistory.map((r:any) => (
                <div key={r.id} style={{
                  border:"1px solid var(--border-color)", borderRadius:"10px", padding:"12px 16px",
                  marginBottom:"10px",
                  borderLeft:`4px solid ${r.status==="OPEN"?"#16a34a":"#DC2626"}`,
                }}>
                  <div style={{ display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:"8px" }}>
                    <div>
                      <span style={{
                        background: r.status==="OPEN"?"#dcfce7":"#fee2e2",
                        color: r.status==="OPEN"?"#16a34a":"#dc2626",
                        padding:"2px 10px", borderRadius:"20px", fontSize:"0.8rem", fontWeight:700,
                      }}>
                        {r.status==="OPEN"?"🟢 Aberto":"🔴 Fechado"}
                      </span>
                      <span style={{ marginLeft:"10px", fontSize:"0.85rem", color:"var(--text-muted)" }}>
                        {new Date(r.openedAt).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}
                        {r.closedAt && ` → ${new Date(r.closedAt).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}`}
                      </span>
                    </div>
                    <div style={{ fontSize:"0.85rem", fontWeight:600 }}>
                      Troco: {fmt(r.openingAmount)}
                      {r.status==="CLOSED" && (
                        <span style={{ marginLeft:"12px" }}>
                          Esperado: {fmt(r.expectedTotal||0)} · Informado: {fmt(r.actualTotal||0)}
                          <span style={{ marginLeft:"8px", color:Math.abs(r.discrepancy||0)<=0.5?"#16a34a":"#dc2626" }}>
                            ({r.discrepancy>=0?"+":""}{fmt(r.discrepancy||0)})
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                  {r.justification && (
                    <div style={{ marginTop:"6px", fontSize:"0.82rem", color:"var(--text-muted)" }}>
                      📝 {r.justification}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* ─── HISTÓRICO COMPLETO ─── */}
      <div className="card">
        <button onClick={()=>setShowHistory(p=>!p)} style={{
          display:"flex", justifyContent:"space-between", alignItems:"center",
          width:"100%", background:"none", border:"none", cursor:"pointer", fontFamily:"inherit",
        }}>
          <h2 className="font-bold text-lg">📋 Histórico de Fechamentos</h2>
          {showHistory ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
        </button>

        {showHistory && (
          fullHistory.length === 0 ? <p className="text-muted" style={{ marginTop:"1rem" }}>Nenhum fechamento registrado.</p> :
          <div style={{ overflowX:"auto", marginTop:"1rem" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"0.85rem" }}>
              <thead>
                <tr style={{ borderBottom:"2px solid var(--border-color)", textAlign:"left" }}>
                  <th style={{ padding:"8px" }}>Abertura</th>
                  <th style={{ padding:"8px" }}>Fechamento</th>
                  <th style={{ padding:"8px" }}>Esperado</th>
                  <th style={{ padding:"8px" }}>Informado</th>
                  <th style={{ padding:"8px" }}>Diferença</th>
                  <th style={{ padding:"8px" }}>Obs.</th>
                </tr>
              </thead>
              <tbody>
                {fullHistory.map((h:any) => {
                  const disc = h.discrepancy || 0;
                  return (
                    <tr key={h.id} style={{ borderBottom:"1px solid var(--border-color)" }}>
                      <td style={{ padding:"8px" }}>{new Date(h.openedAt).toLocaleString("pt-BR")}</td>
                      <td style={{ padding:"8px" }}>{h.closedAt?new Date(h.closedAt).toLocaleString("pt-BR"):"—"}</td>
                      <td style={{ padding:"8px" }}>{fmt(h.expectedTotal||0)}</td>
                      <td style={{ padding:"8px" }}>{fmt(h.actualTotal||0)}</td>
                      <td style={{ padding:"8px", color:Math.abs(disc)<=0.5?"#16a34a":"#dc2626", fontWeight:600 }}>
                        {disc>=0?"+":""}{fmt(disc)}
                      </td>
                      <td style={{ padding:"8px", color:"var(--text-muted)", maxWidth:"180px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {h.justification||"—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
