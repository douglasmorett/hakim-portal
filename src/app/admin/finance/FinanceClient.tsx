"use client";
import { useState } from "react";
import FinanceForm from "@/components/FinanceForm";
import { MarkPaidButton, DeletePayableButton, BarcodeDisplay, PayViaAsaasButton } from "@/components/FinanceActionButtons";

interface Payable {
  id: string;
  supplierName: string;
  barcode: string | null;
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
  canSeePersonal: boolean;
  isAdmin: boolean;
}

export default function FinanceClient({ businessPayables, personalPayables, canSeePersonal, isAdmin }: Props) {
  const [mode, setMode] = useState<"BUSINESS" | "PERSONAL">("BUSINESS");

  const payables = mode === "BUSINESS" ? businessPayables : personalPayables;

  // ── Data de hoje no fuso Brasil (UTC-3) ─────────────────────────────────
  // Intl.DateTimeFormat garante que "hoje" seja o dia certo em São Paulo,
  // independente do fuso do servidor. Retorna YYYY-MM-DD (formato 'en-CA').
  const todayBR = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());

  // dueDate vem como "2026-05-12T00:00:00.000Z" — basta pegar os 10 primeiros
  // chars para comparar sem deslocar o dia pelo fuso.
  const ds = (d: string) => d.slice(0, 10);

  const todayPayables   = payables.filter(p => p.status === "PENDING" && ds(p.dueDate) === todayBR);
  const overduePayables = payables.filter(p => p.status === "PENDING" && ds(p.dueDate) < todayBR);
  const futurePayables  = payables.filter(p => p.status === "PENDING" && ds(p.dueDate) > todayBR);

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  // Exibe a data sem converter fuso: pega YYYY-MM-DD e formata manualmente
  const formatDate = (d: string) => { const [y,m,day] = d.slice(0,10).split("-"); return `${day}/${m}/${y}`; };

  const renderTable = (list: Payable[], title: string, color: string) => (
    <div className="card mb-8">
      <h2 className="font-bold text-lg mb-4" style={{ color }}>{title} ({list.length})</h2>
      {list.length === 0 ? (
        <p className="text-muted text-sm">Nenhuma conta encontrada nesta categoria.</p>
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
                    {isAdmin && (
                      <PayViaAsaasButton
                        id={item.id}
                        barcode={item.barcode}
                        supplierName={item.supplierName}
                        value={item.value}
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

      <FinanceForm category={mode} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1rem" }}>
        {renderTable(overduePayables, "🔴 Pendentes / Atrasadas", "#ef4444")}
        {renderTable(todayPayables, "🟡 A Pagar Hoje", "#f59e0b")}
        {renderTable(futurePayables, "🟢 Contas Futuras", "#10b981")}
      </div>
    </div>
  );
}
