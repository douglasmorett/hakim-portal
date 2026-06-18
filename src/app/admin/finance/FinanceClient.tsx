"use client";
import { useState, useEffect, useMemo } from "react";
import FinanceForm from "@/components/FinanceForm";
import { MarkPaidButton, DeletePayableButton, BarcodeDisplay, PayViaAsaasButton, PayViaPixButton, EditPayableButton } from "@/components/FinanceActionButtons";

interface Payable {
  id: string;
  supplierName: string;
  barcode: string | null;
  pixKey: string | null;
  pixKeyName: string | null;
  paymentType: string;
  receivedDate: string;
  dueDate: string;
  value: number;
  status: string;
  category: string;
  paidDate: string | null;
}

interface Props {
  businessPayables: Payable[];
  personalPayables: Payable[];
  businessPaidPayables: Payable[];
  personalPaidPayables: Payable[];
  canSeePersonal: boolean;
  isAdmin: boolean;
}

export default function FinanceClient({ businessPayables, personalPayables, businessPaidPayables, personalPaidPayables, canSeePersonal, isAdmin }: Props) {
  const [mode, setMode] = useState<"BUSINESS" | "PERSONAL">("BUSINESS");
  const [view, setView] = useState<"PENDING" | "PAID">("PENDING");
  const [isMobile, setIsMobile] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const payables = mode === "BUSINESS" ? businessPayables : personalPayables;
  const paidPayables = mode === "BUSINESS" ? businessPaidPayables : personalPaidPayables;

  // ── Data de hoje no fuso Brasil (UTC-3) ─────────────────────────────────
  const todayBR = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());

  const ds = (d: string) => d.slice(0, 10);

  const todayPayables   = payables.filter(p => p.status === "PENDING" && ds(p.dueDate) === todayBR);
  const overduePayables = payables.filter(p => p.status === "PENDING" && ds(p.dueDate) < todayBR);
  const futurePayables  = payables.filter(p => p.status === "PENDING" && ds(p.dueDate) > todayBR);

  // Filtro por data nas contas pagas
  const filteredPaidPayables = useMemo(() => {
    return paidPayables.filter(p => {
      const paidD = p.paidDate ? ds(p.paidDate) : ds(p.dueDate);
      if (dateFrom && paidD < dateFrom) return false;
      if (dateTo && paidD > dateTo) return false;
      return true;
    });
  }, [paidPayables, dateFrom, dateTo]);

  const paidTotal = filteredPaidPayables.reduce((acc, p) => acc + p.value, 0);

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  // Exibe a data sem converter fuso: pega YYYY-MM-DD e formata manualmente
  const formatDate = (d: string) => { const [y,m,day] = d.slice(0,10).split("-"); return `${day}/${m}/${y}`; };

  const renderTable = (list: Payable[], title: string, color: string) => (
    <div className="card mb-8">
      <h2 className="font-bold text-lg mb-4" style={{ color }}>{title} ({list.length})</h2>
      {list.length === 0 ? (
        <p className="text-muted text-sm">Nenhuma conta encontrada nesta categoria.</p>
      ) : isMobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {list.map(item => (
            <div key={item.id} style={{
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '12px',
              background: 'var(--card-bg, white)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <strong style={{ fontSize: '0.95rem', lineHeight: 1.3 }}>{item.supplierName}</strong>
                <span style={{ color: 'var(--danger)', fontWeight: 'bold', fontSize: '0.95rem', whiteSpace: 'nowrap', marginLeft: '8px' }}>{formatCurrency(item.value)}</span>
              </div>
              <div style={{ display: 'flex', gap: '12px', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                <span>📅 {formatDate(item.dueDate)}</span>
                {item.barcode && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '150px' }}>🔢 {item.barcode}</span>}
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {isAdmin && item.paymentType === "CREDIT_CARD" && (
                  <PayViaPixButton id={item.id} pixKey={item.pixKey} pixKeyName={item.pixKeyName} supplierName={item.supplierName} value={item.value} />
                )}
                {isAdmin && item.paymentType !== "CREDIT_CARD" && (
                  <PayViaAsaasButton id={item.id} barcode={item.barcode} supplierName={item.supplierName} value={item.value} />
                )}
                {isAdmin && (
                  <EditPayableButton
                    id={item.id}
                    supplierName={item.supplierName}
                    value={item.value}
                    dueDate={item.dueDate}
                    barcode={item.barcode}
                  />
                )}
                <MarkPaidButton id={item.id} />
                <DeletePayableButton id={item.id} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-color)", textAlign: "left" }}>
                <th style={{ padding: "0.5rem" }}>Fornecedor</th>
                <th style={{ padding: "0.5rem" }}>Valor</th>
                <th style={{ padding: "0.5rem" }}>Vencimento</th>
                <th style={{ padding: "0.5rem" }}>Cód. Barras</th>
                <th style={{ padding: "0.5rem" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {list.map(item => (
                <tr key={item.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                  <td style={{ padding: "0.5rem", fontWeight: "bold" }}>{item.supplierName}</td>
                  <td style={{ padding: "0.5rem", color: "var(--danger)" }}>{formatCurrency(item.value)}</td>
                  <td style={{ padding: "0.5rem" }}>{formatDate(item.dueDate)}</td>
                  <td style={{ padding: "0.5rem" }}><BarcodeDisplay barcode={item.barcode} /></td>
                  <td style={{ padding: "0.5rem", display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
                    {isAdmin && item.paymentType === "CREDIT_CARD" && (
                      <PayViaPixButton
                        id={item.id}
                        pixKey={item.pixKey}
                        pixKeyName={item.pixKeyName}
                        supplierName={item.supplierName}
                        value={item.value}
                      />
                    )}
                    {isAdmin && item.paymentType !== "CREDIT_CARD" && (
                      <PayViaAsaasButton
                        id={item.id}
                        barcode={item.barcode}
                        supplierName={item.supplierName}
                        value={item.value}
                      />
                    )}
                    {isAdmin && (
                      <EditPayableButton
                        id={item.id}
                        supplierName={item.supplierName}
                        value={item.value}
                        dueDate={item.dueDate}
                        barcode={item.barcode}
                      />
                    )}
                    <MarkPaidButton id={item.id} />
                    <DeletePayableButton id={item.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 className="text-2xl font-bold">Módulo Financeiro</h1>
          <p className="text-muted">Gestão de Contas a Pagar e Inadimplência.</p>
        </div>

        {canSeePersonal && (
          <div style={{
            display: "flex",
            background: "var(--card-bg, #f1f5f9)",
            borderRadius: "10px",
            padding: "4px",
            border: "1px solid var(--border-color, #e2e8f0)"
          }}>
            <button
              onClick={() => setMode("BUSINESS")}
              style={{
                padding: "8px 18px",
                borderRadius: "8px",
                border: "none",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "0.85rem",
                transition: "all 0.2s",
                background: mode === "BUSINESS" ? "#DC2626" : "transparent",
                color: mode === "BUSINESS" ? "#fff" : "var(--text-muted, #64748b)",
                fontFamily: "inherit"
              }}
            >
              🏢 Empresarial
            </button>
            <button
              onClick={() => setMode("PERSONAL")}
              style={{
                padding: "8px 18px",
                borderRadius: "8px",
                border: "none",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "0.85rem",
                transition: "all 0.2s",
                background: mode === "PERSONAL" ? "#7C3AED" : "transparent",
                color: mode === "PERSONAL" ? "#fff" : "var(--text-muted, #64748b)",
                fontFamily: "inherit"
              }}
            >
              👤 Pessoal
            </button>
          </div>
        )}
      </div>

      {mode === "PERSONAL" && (
        <div style={{
          background: "linear-gradient(135deg, #7C3AED22, #A855F722)",
          border: "1px solid #7C3AED44",
          borderRadius: "10px",
          padding: "12px 16px",
          marginBottom: "1.5rem",
          fontSize: "0.85rem",
          color: "#7C3AED"
        }}>
          👤 <strong>Modo Pessoal</strong> — Essas contas são privadas e visíveis apenas para você e Elis.
        </div>
      )}

      {/* Toggle Pendentes / Pagas */}
      <div style={{
        display: "flex",
        background: "var(--card-bg, #f1f5f9)",
        borderRadius: "10px",
        padding: "4px",
        border: "1px solid var(--border-color, #e2e8f0)",
        marginBottom: "1.5rem",
        width: "fit-content"
      }}>
        <button
          onClick={() => setView("PENDING")}
          style={{
            padding: "8px 20px",
            borderRadius: "8px",
            border: "none",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: "0.85rem",
            transition: "all 0.2s",
            background: view === "PENDING" ? "#f59e0b" : "transparent",
            color: view === "PENDING" ? "#fff" : "var(--text-muted, #64748b)",
            fontFamily: "inherit"
          }}
        >
          📋 Pendentes
        </button>
        <button
          onClick={() => setView("PAID")}
          style={{
            padding: "8px 20px",
            borderRadius: "8px",
            border: "none",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: "0.85rem",
            transition: "all 0.2s",
            background: view === "PAID" ? "#10b981" : "transparent",
            color: view === "PAID" ? "#fff" : "var(--text-muted, #64748b)",
            fontFamily: "inherit"
          }}
        >
          ✅ Pagas
        </button>
      </div>

      {view === "PENDING" && (
        <>
          <FinanceForm category={mode} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1rem" }}>
            {renderTable(overduePayables, "🔴 Pendentes / Atrasadas", "#ef4444")}
            {renderTable(todayPayables, "🟡 A Pagar Hoje", "#f59e0b")}
            {renderTable(futurePayables, "🟢 Contas Futuras", "#10b981")}
          </div>
        </>
      )}

      {view === "PAID" && (
        <div>
          {/* Filtro por data */}
          <div className="card mb-8" style={{ display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "flex-end" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)" }}>📅 De</label>
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                style={{
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: "1px solid var(--border-color, #e2e8f0)",
                  background: "var(--card-bg, white)",
                  color: "var(--text-color, #1e293b)",
                  fontSize: "0.85rem",
                  fontFamily: "inherit"
                }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)" }}>📅 Até</label>
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                style={{
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: "1px solid var(--border-color, #e2e8f0)",
                  background: "var(--card-bg, white)",
                  color: "var(--text-color, #1e293b)",
                  fontSize: "0.85rem",
                  fontFamily: "inherit"
                }}
              />
            </div>
            {(dateFrom || dateTo) && (
              <button
                onClick={() => { setDateFrom(""); setDateTo(""); }}
                style={{
                  padding: "8px 14px",
                  borderRadius: "8px",
                  border: "1px solid var(--border-color, #e2e8f0)",
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: "0.8rem",
                  color: "var(--text-muted)",
                  fontFamily: "inherit"
                }}
              >
                ✕ Limpar filtro
              </button>
            )}
            <div style={{ marginLeft: "auto", textAlign: "right" }}>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{filteredPaidPayables.length} conta{filteredPaidPayables.length !== 1 ? "s" : ""}</span>
              <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#10b981" }}>{formatCurrency(paidTotal)}</div>
            </div>
          </div>

          {/* Tabela de contas pagas */}
          <div className="card">
            <h2 className="font-bold text-lg mb-4" style={{ color: "#10b981" }}>✅ Contas Pagas ({filteredPaidPayables.length})</h2>
            {filteredPaidPayables.length === 0 ? (
              <p className="text-muted text-sm">Nenhuma conta paga encontrada {(dateFrom || dateTo) ? "no período selecionado" : ""}.</p>
            ) : isMobile ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {filteredPaidPayables.map(item => (
                  <div key={item.id} style={{
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    padding: '12px',
                    background: 'var(--card-bg, white)',
                    opacity: 0.85
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <strong style={{ fontSize: '0.95rem', lineHeight: 1.3 }}>{item.supplierName}</strong>
                      <span style={{ color: '#10b981', fontWeight: 'bold', fontSize: '0.95rem', whiteSpace: 'nowrap', marginLeft: '8px' }}>{formatCurrency(item.value)}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      <span>📅 Venc: {formatDate(item.dueDate)}</span>
                      {item.paidDate && <span>✅ Pago: {formatDate(item.paidDate)}</span>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border-color)", textAlign: "left" }}>
                      <th style={{ padding: "0.5rem" }}>Fornecedor</th>
                      <th style={{ padding: "0.5rem" }}>Valor</th>
                      <th style={{ padding: "0.5rem" }}>Vencimento</th>
                      <th style={{ padding: "0.5rem" }}>Data Pagamento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPaidPayables.map(item => (
                      <tr key={item.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                        <td style={{ padding: "0.5rem", fontWeight: "bold" }}>{item.supplierName}</td>
                        <td style={{ padding: "0.5rem", color: "#10b981" }}>{formatCurrency(item.value)}</td>
                        <td style={{ padding: "0.5rem" }}>{formatDate(item.dueDate)}</td>
                        <td style={{ padding: "0.5rem" }}>{item.paidDate ? formatDate(item.paidDate) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
