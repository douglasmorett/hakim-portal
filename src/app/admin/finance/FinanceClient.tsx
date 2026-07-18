"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { CreditCard as CreditCardIcon } from "lucide-react";
import FinanceForm from "@/components/FinanceForm";
import RecurringFinanceForm from "@/components/RecurringFinanceForm";
import { MarkPaidButton, DeletePayableButton, BarcodeDisplay, PayViaAsaasButton, PayViaPixButton, EditPayableButton } from "@/components/FinanceActionButtons";
import { deleteRecurringPayable, toggleRecurringPayableActive } from "@/app/actions/finance";
import { getCardStatementStatus, CardStatementStatus } from "@/lib/creditCardUtils";

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

interface RecurringPayable {
  id: string;
  supplierName: string;
  value: number;
  category: string;
  paymentType: string;
  dueDateDay: number;
  barcode: string | null;
  pixKey: string | null;
  pixKeyName: string | null;
  pixKeyType: string | null;
  creditCardId: string | null;
  active: boolean;
}

interface CreditCard {
  id: string;
  name: string;
  lastDigits: string | null;
  bankName: string | null;
  closingDay: number | null;
  dueDay: number | null;
  bestPurchaseDay: number | null;
}

interface Props {
  businessPayables: Payable[];
  personalPayables: Payable[];
  businessPaidPayables: Payable[];
  personalPaidPayables: Payable[];
  businessRecurring: RecurringPayable[];
  personalRecurring: RecurringPayable[];
  creditCards: CreditCard[];
  cardPayables: { creditCardId: string | null; dueDate: string }[];
  canSeePersonal: boolean;
  isAdmin: boolean;
}

export default function FinanceClient({
  businessPayables,
  personalPayables,
  businessPaidPayables,
  personalPaidPayables,
  businessRecurring,
  personalRecurring,
  creditCards,
  cardPayables,
  canSeePersonal,
  isAdmin
}: Props) {
  const [mode, setMode] = useState<"BUSINESS" | "PERSONAL">("BUSINESS");
  const [view, setView] = useState<"PENDING" | "PAID" | "RECURRING">("PENDING");
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
  const recurringList = mode === "BUSINESS" ? businessRecurring : personalRecurring;

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

  // Faturas pendentes de lançamento (fechadas mas sem Payable correspondente)
  const pendingStatements = useMemo(() => {
    return creditCards
      .map(c => getCardStatementStatus(c, cardPayables))
      .filter((s): s is CardStatementStatus => !!s && s.needsStatementLaunch);
  }, [creditCards, cardPayables]);

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

  const renderRecurringTable = (list: RecurringPayable[]) => {
    const handleToggleActive = async (id: string, currentStatus: boolean) => {
      if (!confirm(`Deseja ${currentStatus ? "desativar" : "ativar"} esta conta fixa?`)) return;
      const res = await toggleRecurringPayableActive(id, !currentStatus);
      if (res && 'error' in res && res.error) {
        alert(res.error);
      } else {
        window.location.reload();
      }
    };

    const handleDeleteRecurring = async (id: string) => {
      if (!confirm("⚠️ Tem certeza que deseja EXCLUIR esta conta fixa?\n\nAs contas já geradas nos meses anteriores continuarão salvas, mas novas parcelas não serão geradas.")) return;
      const res = await deleteRecurringPayable(id);
      if (res && 'error' in res && res.error) {
        alert(res.error);
      } else {
        window.location.reload();
      }
    };

    return (
      <div className="card mb-8">
        <h2 className="font-bold text-lg mb-4" style={{ color: "var(--primary, #3b82f6)" }}>⚙️ Contas Fixas Cadastradas ({list.length})</h2>
        {list.length === 0 ? (
          <p className="text-muted text-sm">Nenhuma conta fixa cadastrada nesta categoria.</p>
        ) : isMobile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {list.map(item => (
              <div key={item.id} style={{
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '12px',
                background: 'var(--card-bg, white)',
                opacity: item.active ? 1 : 0.6
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <strong style={{ fontSize: '0.95rem', lineHeight: 1.3 }}>{item.supplierName}</strong>
                  <span style={{ color: 'var(--text-color)', fontWeight: 'bold', fontSize: '0.95rem', whiteSpace: 'nowrap', marginLeft: '8px' }}>{formatCurrency(item.value)}</span>
                </div>
                <div style={{ display: 'flex', gap: '12px', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  <span>📅 Dia {item.dueDateDay}</span>
                  <span>💳 {item.paymentType === "CREDIT_CARD" ? "Cartão" : item.paymentType === "PIX" ? "PIX" : "Boleto"}</span>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {isAdmin && (
                    <>
                      <button
                        onClick={() => handleToggleActive(item.id, item.active)}
                        style={{ padding: "4px 8px", fontSize: "0.8rem", background: item.active ? "#64748b" : "#10b981", color: "#fff", border: "none", borderRadius: 6, fontWeight: 600, cursor: "pointer" }}
                      >
                        {item.active ? "Desativar" : "Ativar"}
                      </button>
                      <button
                        onClick={() => handleDeleteRecurring(item.id)}
                        style={{ padding: "4px 8px", fontSize: "0.8rem", background: "#ef4444", color: "#fff", border: "none", borderRadius: 6, fontWeight: 600, cursor: "pointer" }}
                      >
                        Excluir
                      </button>
                    </>
                  )}
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
                  <th style={{ padding: "0.5rem" }}>Valor Estimado</th>
                  <th style={{ padding: "0.5rem" }}>Dia do Vencimento</th>
                  <th style={{ padding: "0.5rem" }}>Tipo de Pagamento</th>
                  <th style={{ padding: "0.5rem" }}>Status</th>
                  {isAdmin && <th style={{ padding: "0.5rem" }}>Ações</th>}
                </tr>
              </thead>
              <tbody>
                {list.map(item => (
                  <tr key={item.id} style={{ borderBottom: "1px solid var(--border-color)", opacity: item.active ? 1 : 0.6 }}>
                    <td style={{ padding: "0.5rem", fontWeight: "bold" }}>{item.supplierName}</td>
                    <td style={{ padding: "0.5rem" }}>{formatCurrency(item.value)}</td>
                    <td style={{ padding: "0.5rem" }}>Dia {item.dueDateDay}</td>
                    <td style={{ padding: "0.5rem" }}>
                      {item.paymentType === "CREDIT_CARD" ? "💳 Cartão de Crédito" : item.paymentType === "PIX" ? "⚡ Pix" : "📄 Boleto"}
                    </td>
                    <td style={{ padding: "0.5rem" }}>
                      <span style={{
                        padding: "2px 6px",
                        borderRadius: "4px",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        backgroundColor: item.active ? "#dcfce7" : "#f1f5f9",
                        color: item.active ? "#15803d" : "#475569"
                      }}>
                        {item.active ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    {isAdmin && (
                      <td style={{ padding: "0.5rem", display: "flex", gap: "0.5rem" }}>
                        <button
                          onClick={() => handleToggleActive(item.id, item.active)}
                          className="btn"
                          style={{ padding: "4px 8px", fontSize: "0.8rem", background: "transparent", border: "1px solid var(--border-color)", borderRadius: 6, cursor: "pointer" }}
                        >
                          {item.active ? "⏸️ Pausar" : "▶️ Ativar"}
                        </button>
                        <button
                          onClick={() => handleDeleteRecurring(item.id)}
                          className="btn"
                          style={{ padding: "4px 8px", fontSize: "0.8rem", background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", border: "none", borderRadius: 6, fontWeight: 700, cursor: "pointer" }}
                        >
                          Excluir
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "20px", flexWrap: "wrap" }}>
          <div>
            <h1 className="text-2xl font-bold">Módulo Financeiro</h1>
            <p className="text-muted">Gestão de Contas a Pagar e Inadimplência.</p>
          </div>
          {isAdmin && (
            <Link
              href="/admin/finance/cartoes"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "9px 18px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #4F46E5, #7C3AED)",
                color: "#fff",
                fontWeight: 700,
                fontSize: "0.85rem",
                textDecoration: "none",
                boxShadow: "0 4px 12px rgba(79, 70, 229, 0.25)",
                position: "relative",
                fontFamily: "inherit"
              }}
            >
              <CreditCardIcon size={16} /> Cartões de Crédito
              {pendingStatements.length > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: "-6px",
                    right: "-6px",
                    background: "#EF4444",
                    color: "#fff",
                    borderRadius: "50%",
                    width: "20px",
                    height: "20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.72rem",
                    fontWeight: 800,
                    boxShadow: "0 2px 5px rgba(239, 68, 68, 0.4)",
                    border: "2px solid #fff"
                  }}
                  title={`${pendingStatements.length} faturas fechadas aguardando valor`}
                >
                  {pendingStatements.length}
                </span>
              )}
            </Link>
          )}
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

      {/* Toggle Pendentes / Pagas / Contas Fixas */}
      <div style={{
        display: "flex",
        background: "var(--card-bg, #f1f5f9)",
        borderRadius: "10px",
        padding: "4px",
        border: "1px solid var(--border-color, #e2e8f0)",
        marginBottom: "1.5rem",
        width: "fit-content",
        gap: "4px"
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
        <button
          onClick={() => setView("RECURRING")}
          style={{
            padding: "8px 20px",
            borderRadius: "8px",
            border: "none",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: "0.85rem",
            transition: "all 0.2s",
            background: view === "RECURRING" ? "#3b82f6" : "transparent",
            color: view === "RECURRING" ? "#fff" : "var(--text-muted, #64748b)",
            fontFamily: "inherit"
          }}
        >
          ⚙️ Contas Fixas
        </button>
      </div>

      {/* Alerta de faturas fechadas aguardando lançamento de valor */}
      {isAdmin && pendingStatements.length > 0 && (
        <div style={{background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.2)",borderRadius:10,padding:"14px 18px",marginBottom:"1.5rem",fontSize:".88rem",color:"#DC2626",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
          <span style={{display:"flex",alignItems:"center",gap:6}}>
            ⚠️ <strong>Faturas Fechadas Pendentes de Valor</strong>: Você possui <strong>{pendingStatements.length} fatura(s) de cartão</strong> que já fecharam e precisam do valor lançado.
          </span>
          <Link href="/admin/finance/cartoes" style={{color:"#4F46E5",fontWeight:700,textDecoration:"none",fontSize:".83rem",background:"#fff",padding:"5px 12px",borderRadius:6,border:"1px solid #4F46E5",boxShadow:"0 1px 3px rgba(0,0,0,.05)"}}>
            Informar Valores →
          </Link>
        </div>
      )}

      {view === "PENDING" && (
        <>
          <FinanceForm category={mode} onSelectRecurring={() => setView("RECURRING")} />
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

      {view === "RECURRING" && (
        <div>
          <RecurringFinanceForm category={mode} creditCards={creditCards} />
          {renderRecurringTable(recurringList)}
        </div>
      )}
    </div>
  );
}
