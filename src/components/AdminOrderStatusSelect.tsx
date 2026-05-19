"use client";
import { cancelOrder } from "@/app/actions/cancelOrder";
import { updateOrderStatus } from "@/app/actions/order";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminOrderStatusSelect({ orderId, currentStatus }: { orderId: string, currentStatus: string }) {
  const [status, setStatus] = useState(currentStatus);
  const [loading, setLoading] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelPassword, setCancelPassword] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const router = useRouter();
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showCancelModal && passwordRef.current) {
      passwordRef.current.focus();
    }
  }, [showCancelModal]);

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value;
    
    if (newStatus === "CANCELADO") {
      // Abre modal inline em vez de window.prompt (mais confiável)
      setShowCancelModal(true);
      return;
    }

    const previousStatus = status;
    setStatus(newStatus);
    setLoading(true);
    try {
      await updateOrderStatus(orderId, newStatus);
      router.refresh();
    } catch (err) {
      alert("Erro ao atualizar status");
      setStatus(previousStatus);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelPassword) {
      alert("Digite sua senha de acesso.");
      return;
    }
    if (!cancelReason) {
      alert("O motivo do cancelamento é obrigatório.");
      return;
    }

    setLoading(true);
    try {
      await cancelOrder(orderId, cancelPassword, cancelReason);
      setStatus("CANCELADO");
      setShowCancelModal(false);
      setCancelPassword("");
      setCancelReason("");
      alert("✅ Pedido cancelado com sucesso!");
      router.refresh();
    } catch (err: any) {
      alert("❌ " + (err.message || "Erro ao cancelar pedido."));
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModal = () => {
    setShowCancelModal(false);
    setCancelPassword("");
    setCancelReason("");
  };

  return (
    <>
      <select 
        value={status} 
        onChange={handleStatusChange} 
        disabled={loading || status === "PAID"}
        style={{
          padding: "0.5rem",
          borderRadius: "var(--radius-sm)",
          border: "1px solid var(--border-color)",
          backgroundColor: "var(--bg-card)",
          color: "var(--text-main)",
          fontWeight: "bold",
          fontSize: "0.85rem",
          cursor: loading ? "wait" : "pointer",
          opacity: loading ? 0.6 : 1,
        }}
      >
        <option value="PENDING_PAYMENT">Aguardando Pagamento</option>
        <option value="AGUARDANDO_ENTREGA">Aguardando Entrega</option>
        <option value="FINALIZADO">Finalizado</option>
        <option value="PAID">Pago (Asaas)</option>
        <option value="CANCELADO">Cancelado</option>
      </select>

      {/* Modal de cancelamento inline */}
      {showCancelModal && (
        <div
          onClick={handleCloseModal}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--surface, #1E293B)",
              border: "1px solid var(--border-color, #334155)",
              borderRadius: 16,
              padding: "28px",
              width: "100%",
              maxWidth: 420,
              margin: "0 16px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: "rgba(239,68,68,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1.2rem",
              }}>
                ⚠️
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800 }}>Cancelar Pedido</h3>
                <p style={{ margin: 0, fontSize: ".8rem", color: "var(--text-muted, #94A3B8)" }}>
                  #{orderId.slice(-6).toUpperCase()} — Ação irreversível
                </p>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: ".8rem", fontWeight: 600, marginBottom: 4, display: "block", color: "var(--text-muted, #94A3B8)" }}>
                  Sua senha de acesso
                </label>
                <input
                  ref={passwordRef}
                  type="password"
                  placeholder="Digite sua senha..."
                  value={cancelPassword}
                  onChange={(e) => setCancelPassword(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: 10,
                    border: "1px solid var(--border-color, #334155)",
                    backgroundColor: "var(--bg-color, #0F172A)",
                    color: "var(--text-main, #fff)",
                    fontSize: ".9rem",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: ".8rem", fontWeight: 600, marginBottom: 4, display: "block", color: "var(--text-muted, #94A3B8)" }}>
                  Motivo do cancelamento
                </label>
                <textarea
                  placeholder="Descreva o motivo..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  rows={3}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: 10,
                    border: "1px solid var(--border-color, #334155)",
                    backgroundColor: "var(--bg-color, #0F172A)",
                    color: "var(--text-main, #fff)",
                    fontSize: ".9rem",
                    outline: "none",
                    resize: "vertical",
                    boxSizing: "border-box",
                    fontFamily: "inherit",
                  }}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button
                onClick={handleCloseModal}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: 10,
                  border: "1px solid var(--border-color, #334155)",
                  background: "transparent",
                  color: "var(--text-main, #fff)",
                  fontWeight: 700,
                  fontSize: ".85rem",
                  cursor: "pointer",
                }}
              >
                Voltar
              </button>
              <button
                onClick={handleConfirmCancel}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: 10,
                  border: "none",
                  background: "linear-gradient(135deg, #EF4444, #DC2626)",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: ".85rem",
                  cursor: loading ? "wait" : "pointer",
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? "Cancelando..." : "🗑️ Confirmar Cancelamento"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
