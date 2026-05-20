"use client";

import { useState } from "react";
import { markPayableAsPaid, deletePayable } from "@/app/actions/finance";

// ─── Modal de confirmação de boleto ───────────────────────────────────────────
interface BoletoInfo {
  beneficiary: string;
  cnpj: string;
  value: number;
  discount: number;
  fine: number;
  interest: number;
  totalValue: number;
  dueDate: string;
  barcode: string;
}

function ConfirmModal({
  info,
  payableValue,
  onConfirm,
  onCancel,
  loading,
}: {
  info: BoletoInfo;
  payableValue: number;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const fmt = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;
  const fmtDate = (d: string) => {
    if (!d) return "—";
    const [y, m, day] = d.split("-");
    return `${day}/${m}/${y}`;
  };

  // Verifica se há discrepância de valor
  const diff = Math.abs(info.totalValue - payableValue);
  const hasDiff = diff > 0.05;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }}>
      <div style={{
        background: "var(--surface)", borderRadius: 16, padding: "28px 28px 24px",
        maxWidth: 480, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
        border: "1px solid var(--border-color)",
      }}>
        {/* Header */}
        <div style={{ marginBottom: 20, borderBottom: "1px solid var(--border-color)", paddingBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800 }}>
            🔍 Confirmar Pagamento de Boleto
          </h2>
          <p style={{ margin: "4px 0 0", color: "var(--text-muted)", fontSize: ".83rem" }}>
            Dados consultados diretamente no Asaas — confira antes de pagar
          </p>
        </div>

        {/* Dados do boleto */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
          <Row label="Beneficiário" value={info.beneficiary} bold />
          {info.cnpj && <Row label="CNPJ" value={info.cnpj} />}
          <Row label="Vencimento" value={fmtDate(info.dueDate)} />
          {info.discount > 0 && <Row label="Desconto" value={fmt(info.discount)} color="#22C55E" />}
          {info.fine > 0 && <Row label="Multa" value={fmt(info.fine)} color="#EF4444" />}
          {info.interest > 0 && <Row label="Juros" value={fmt(info.interest)} color="#EF4444" />}
          <div style={{
            background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)",
            borderRadius: 8, padding: "10px 14px",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span style={{ fontWeight: 700, fontSize: ".9rem" }}>💰 Total a pagar</span>
            <span style={{ fontWeight: 800, fontSize: "1.2rem", color: "#22C55E" }}>{fmt(info.totalValue)}</span>
          </div>
        </div>

        {/* Aviso de discrepância */}
        {hasDiff && (
          <div style={{
            background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)",
            borderRadius: 8, padding: "10px 14px", marginBottom: 14,
            fontSize: ".83rem", color: "#D97706",
          }}>
            ⚠️ <strong>Atenção:</strong> O valor real ({fmt(info.totalValue)}) é diferente do registrado ({fmt(payableValue)}).
            O sistema vai cobrar o valor real do Asaas.
          </div>
        )}

        {/* Código de barras */}
        <div style={{
          background: "var(--bg-color)", borderRadius: 6, padding: "8px 12px",
          marginBottom: 18, fontFamily: "monospace", fontSize: ".72rem",
          color: "var(--text-muted)", wordBreak: "break-all",
        }}>
          {info.barcode}
        </div>

        {/* Botões */}
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onCancel}
            disabled={loading}
            style={{
              flex: 1, padding: "10px", borderRadius: 8, border: "1px solid var(--border-color)",
              background: "transparent", cursor: "pointer", fontWeight: 600, fontSize: ".9rem",
              color: "var(--text-muted)",
            }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              flex: 2, padding: "10px", borderRadius: 8, border: "none",
              background: loading ? "#6B7280" : "linear-gradient(135deg, #7C3AED, #6D28D9)",
              color: "#fff", cursor: loading ? "wait" : "pointer",
              fontWeight: 700, fontSize: ".9rem",
              boxShadow: "0 4px 12px rgba(124,58,237,0.4)",
            }}
          >
            {loading ? "Pagando..." : `✅ Confirmar e Pagar ${fmt(info.totalValue)}`}
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold, color }: { label: string; value: string; bold?: boolean; color?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: ".87rem" }}>
      <span style={{ color: "var(--text-muted)" }}>{label}</span>
      <span style={{ fontWeight: bold ? 700 : 500, color: color || "inherit" }}>{value}</span>
    </div>
  );
}

// ─── Botão Pagar via Asaas (boleto) com confirmação ──────────────────────────
export function PayViaAsaasButton({ id, barcode, supplierName, value }: {
  id: string;
  barcode: string | null;
  supplierName: string;
  value: number;
}) {
  const [state, setState] = useState<"idle" | "simulating" | "confirm" | "paying">("idle");
  const [boletoInfo, setBoletoInfo] = useState<BoletoInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!barcode) return null;

  const handleClick = async () => {
    setError(null);
    setState("simulating");
    try {
      const res = await fetch("/api/admin/simulate-boleto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barcode }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) { setError(data?.error || `Erro ${res.status} ao consultar boleto.`); setState("idle"); return; }
      if (!data?.boleto) { setError("Resposta inválida do servidor."); setState("idle"); return; }
      if (data._debug) console.log("[DEBUG Asaas]", data._debug);
      setBoletoInfo(data.boleto);
      setState("confirm");
    } catch (err: any) {
      setError(`Erro de conexão: ${err?.message || "Servidor não respondeu"}`); setState("idle");
    }
  };

  const handleConfirm = async () => {
    setState("paying");
    try {
      const res = await fetch("/api/admin/pay-via-asaas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payableId: id }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) { setError(data?.error || `Erro ${res.status} no pagamento.`); setState("idle"); return; }
      alert(`✅ ${data?.message || "Pagamento processado!"}`);
      window.location.reload();
    } catch (err: any) {
      setError(`Erro de conexão: ${err?.message || "Servidor não respondeu"}`); setState("idle");
    }
  };

  return (
    <>
      {(state === "confirm" || state === "paying") && boletoInfo && (
        <ConfirmModal
          info={boletoInfo}
          payableValue={value}
          onConfirm={handleConfirm}
          onCancel={() => setState("idle")}
          loading={state === "paying"}
        />
      )}

      {error && (
        <span style={{ color: "#EF4444", fontSize: ".78rem", maxWidth: 280, display: "inline-block", wordBreak: "break-word" }} title={error}>⚠️ {error.slice(0, 80)}{error.length > 80 ? "..." : ""}</span>
      )}

      <button
        onClick={handleClick}
        disabled={state !== "idle"}
        title="Consultar e pagar este boleto via Asaas"
        style={{
          padding: "0.25rem 0.7rem",
          fontSize: "0.82rem",
          background: state !== "idle"
            ? "#6B7280"
            : "linear-gradient(135deg, #7C3AED, #6D28D9)",
          color: "white",
          border: "none",
          borderRadius: 6,
          cursor: state !== "idle" ? "wait" : "pointer",
          fontWeight: 700,
          whiteSpace: "nowrap",
          boxShadow: "0 2px 8px rgba(124,58,237,0.3)",
        }}
      >
        {state === "simulating" ? "⏳ Consultando..." : "💳 Pagar via Asaas"}
      </button>
    </>
  );
}

// ─── Botão Pagar via PIX (cartão de crédito) ─────────────────────────────────
export function PayViaPixButton({ id, pixKey, pixKeyName, supplierName, value }: {
  id: string;
  pixKey: string | null;
  pixKeyName: string | null;
  supplierName: string;
  value: number;
}) {
  const [loading, setLoading] = useState(false);

  if (!pixKey) return null;

  const fmt = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

  const handlePay = async () => {
    if (!confirm(
      `⚠️ Confirmar PIX de ${fmt(value)} para "${pixKeyName || supplierName}"?\n\nChave PIX: ${pixKey}\n\nO valor será transferido agora do saldo Asaas.`
    )) return;

    setLoading(true);
    try {
      const res = await fetch("/api/admin/pay-via-pix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payableId: id }),
      });
      const data = await res.json();
      if (!res.ok) { alert(`❌ ${data.error}`); return; }
      alert(`✅ ${data.message}`);
      window.location.reload();
    } catch {
      alert("❌ Erro de conexão.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handlePay}
      disabled={loading}
      title={`Pagar via PIX para ${pixKey}`}
      style={{
        padding: "0.25rem 0.7rem",
        fontSize: "0.82rem",
        background: loading ? "#6B7280" : "linear-gradient(135deg, #0EA5E9, #0284C7)",
        color: "white",
        border: "none",
        borderRadius: 6,
        cursor: loading ? "wait" : "pointer",
        fontWeight: 700,
        whiteSpace: "nowrap",
        boxShadow: "0 2px 8px rgba(14,165,233,0.3)",
      }}
    >
      {loading ? "Enviando PIX..." : "⚡ Pagar via PIX"}
    </button>
  );
}

// ─── Dar Baixa manual ─────────────────────────────────────────────────────────────────
export function MarkPaidButton({ id }: { id: string }) {
  const [step, setStep] = useState<"idle" | "confirm" | "loading">("idle");

  const handleConfirm = async () => {
    setStep("loading");
    try {
      const res = await fetch("/api/admin/mark-paid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) { window.location.reload(); return; }
      const data = await res.json();
      alert("Erro: " + (data.error || "Falha ao dar baixa."));
      setStep("idle");
    } catch {
      alert("Erro de conexão.");
      setStep("idle");
    }
  };

  if (step === "confirm") return (
    <span style={{ display: "flex", gap: 4, alignItems: "center" }}>
      <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Confirmar?</span>
      <button onClick={handleConfirm} style={{ padding: "2px 8px", fontSize: "0.8rem", background: "var(--success)", color: "#fff", border: "none", borderRadius: 5, fontWeight: 700, cursor: "pointer" }}>Sim</button>
      <button onClick={() => setStep("idle")} style={{ padding: "2px 8px", fontSize: "0.8rem", background: "transparent", color: "var(--text-muted)", border: "1px solid var(--border-color)", borderRadius: 5, cursor: "pointer" }}>Não</button>
    </span>
  );

  return (
    <button onClick={() => setStep("confirm")} disabled={step === "loading"} className="btn"
      style={{ padding: "0.25rem 0.6rem", fontSize: "0.85rem", backgroundColor: "var(--success)", color: "white", fontWeight: 700, borderRadius: 6 }}>
      {step === "loading" ? "Salvando..." : "✓ Dar Baixa"}
    </button>
  );
}

// ─── Excluir ─────────────────────────────────────────────────────────────────
export function DeletePayableButton({ id }: { id: string }) {
  const [step, setStep] = useState<"idle" | "confirm" | "loading">("idle");

  const handleConfirm = async () => {
    setStep("loading");
    try {
      const res = await fetch(`/api/admin/mark-paid?id=${id}`, { method: "DELETE" });
      if (res.ok) { window.location.reload(); return; }
      const data = await res.json();
      alert("Erro: " + (data.error || "Falha ao excluir."));
      setStep("idle");
    } catch {
      alert("Erro de conexão.");
      setStep("idle");
    }
  };

  if (step === "confirm") return (
    <span style={{ display: "flex", gap: 4, alignItems: "center" }}>
      <span style={{ fontSize: "0.78rem", color: "#EF4444" }}>Excluir?</span>
      <button onClick={handleConfirm} style={{ padding: "2px 8px", fontSize: "0.8rem", background: "#EF4444", color: "#fff", border: "none", borderRadius: 5, fontWeight: 700, cursor: "pointer" }}>Sim</button>
      <button onClick={() => setStep("idle")} style={{ padding: "2px 8px", fontSize: "0.8rem", background: "transparent", color: "var(--text-muted)", border: "1px solid var(--border-color)", borderRadius: 5, cursor: "pointer" }}>Não</button>
    </span>
  );

  return (
    <button onClick={() => setStep("confirm")} disabled={step === "loading"} className="btn btn-outline"
      style={{ padding: "0.25rem 0.6rem", fontSize: "0.85rem", color: "var(--danger)", fontWeight: 700, borderRadius: 6 }}>
      {step === "loading" ? "..." : "Excluir"}
    </button>
  );
}

// ─── Exibição do código de barras ─────────────────────────────────────────────
export function BarcodeDisplay({ barcode }: { barcode: string | null }) {
  const [copied, setCopied] = useState(false);
  if (!barcode) return <span>-</span>;
  const handleCopy = () => {
    navigator.clipboard.writeText(barcode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <span style={{ fontFamily: "monospace", fontSize: "0.75rem", maxWidth: "180px", display: "inline-block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={barcode}>
        {barcode}
      </span>
      <button onClick={handleCopy} title="Copiar código de barras" style={{ background: copied ? "var(--success)" : "var(--primary)", color: "white", border: "none", borderRadius: "4px", padding: "4px 8px", fontSize: "0.75rem", cursor: "pointer", transition: "background 0.3s" }}>
        {copied ? "Copiado!" : "Copiar"}
      </button>
    </div>
  );
}
