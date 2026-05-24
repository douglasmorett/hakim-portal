"use client";

import { useState } from "react";
import AdminOrderStatusSelect from "./AdminOrderStatusSelect";
import { approveEmergencyOrder, rejectEmergencyOrder } from "@/app/actions/emergency";
import { ChevronDown, ChevronUp, MapPin, Calendar, CreditCard, Truck } from "lucide-react";
import Link from "next/link";

export default function AdminOrderCard({ order, deliveryInfo }: { order: any, deliveryInfo?: any }) {
  const [expanded, setExpanded] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [loadingAction, setLoadingAction] = useState(false);

  const getStatusLabel = (s: string) => {
    const labels: any = {
      "PENDING_PAYMENT": "Aguardando Pagamento",
      "AGUARDANDO_ENTREGA": "Aguardando Entrega",
      "FINALIZADO": "Finalizado",
      "PAID": "Pago (Asaas)",
      "CANCELADO": "Cancelado"
    };
    return labels[s] || s;
  };

  const handleApproveEmergency = async () => {
    if (!confirm("Tem certeza que deseja APROVAR este pedido de emergência? O boleto será gerado.")) return;
    setLoadingAction(true);
    try {
      await approveEmergencyOrder(order.id);
      alert("Aprovado com sucesso!");
    } catch (e: any) {
      alert("Erro ao aprovar: " + e.message);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleRejectEmergency = async () => {
    if (!rejectReason) {
      alert("Por favor, informe o motivo da reprovação.");
      return;
    }
    setLoadingAction(true);
    try {
      await rejectEmergencyOrder(order.id, rejectReason);
      alert("Reprovado com sucesso.");
      setIsRejecting(false);
    } catch (e: any) {
      alert("Erro ao reprovar: " + e.message);
    } finally {
      setLoadingAction(false);
    }
  };

  const isPaid = order.status !== "PENDING_PAYMENT" && order.status !== "CANCELADO" && order.status !== "EMERGENCIA_PENDENTE";

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: "0.5rem", transition: "all 0.3s ease" }}>
      {/* HEADER COMPACTO SEMPRE VISÍVEL */}
      <div
        onClick={() => setExpanded(!expanded)}
        className="order-card-header"
        style={{ cursor: "pointer", userSelect: "none" }}
      >
        {/* Linha 1: ID + Data + Chevron */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            <h3 className="font-bold" style={{ fontSize: "0.95rem", margin: 0 }}>
              #{order.id.slice(-6).toUpperCase()}
            </h3>
            {order.isEmergency && <span style={{ backgroundColor: "var(--danger)", color: "white", padding: "0.15rem 0.5rem", borderRadius: "4px", fontSize: "0.65rem", fontWeight: 700 }}>EMERGÊNCIA</span>}
            {order.emergencyFine > 0 && <span style={{ backgroundColor: "#DC2626", color: "white", padding: "0.15rem 0.5rem", borderRadius: "4px", fontSize: "0.65rem", fontWeight: 700 }}>MULTA 30%</span>}
            <span className="text-muted" style={{ fontSize: "0.75rem", whiteSpace: "nowrap" }}>
              <Calendar size={11} style={{ display: "inline", marginRight: "3px", verticalAlign: "middle" }} />
              {new Date(order.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <div className="order-card-chevron-desktop">
            {expanded ? <ChevronUp size={20} color="var(--text-muted)" /> : <ChevronDown size={20} color="var(--text-muted)" />}
          </div>
        </div>

        {/* Linha 2: Rota + Cliente + Valor + Status */}
        <div className="order-card-details-row">
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", minWidth: 0 }}>
            <MapPin size={14} color="var(--primary)" style={{ flexShrink: 0 }} />
            <div style={{ minWidth: 0 }}>
              <p className="font-bold" style={{ fontSize: "0.85rem", margin: 0 }}>{order.user.city || "Sem Rota"}</p>
              <p className="text-muted" style={{ fontSize: "0.75rem", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{order.user.name}</p>
            </div>
          </div>

          {deliveryInfo && deliveryInfo.deliveryStr !== "A definir" && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.7rem", color: "var(--text-muted)" }}>
              <Truck size={12} />
              <span>Prev: {deliveryInfo.deliveryStr}</span>
            </div>
          )}

          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <p className="font-extrabold" style={{ color: "var(--text-main)", margin: 0, fontSize: "0.95rem" }}>R$ {order.totalAmount.toFixed(2)}</p>
            <div style={{ display: "flex", alignItems: "center", gap: "0.2rem", fontSize: "0.7rem", fontWeight: "bold", color: isPaid ? "var(--success)" : "var(--warning)", justifyContent: "flex-end" }}>
              <CreditCard size={12} />
              {isPaid ? "PAGO" : "EM ABERTO"}
            </div>
          </div>
        </div>

        {/* Linha 3: Status select */}
        <div className="order-card-status-row">
          <div onClick={e => e.stopPropagation()} style={{ flex: 1, minWidth: 0 }}>
            {order.isEmergency && order.emergencyStatus === "PENDING_APPROVAL" ? (
              <span style={{ fontWeight: "bold", color: "var(--warning)", fontSize: "0.8rem" }}>Aguardando Aprovação</span>
            ) : (
              <AdminOrderStatusSelect orderId={order.id} currentStatus={order.status} />
            )}
          </div>
          <div className="order-card-chevron-mobile">
            {expanded ? <ChevronUp size={18} color="var(--text-muted)" /> : <ChevronDown size={18} color="var(--text-muted)" />}
          </div>
        </div>
      </div>

      {/* DETALHES (EXPANSÍVEL) */}
      {expanded && (
        <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "1rem", marginTop: "0.5rem", animation: "fadeIn 0.3s ease", overflow: "visible" }}>
          <div className="order-card-expanded-grid">

            {/* Lista de Itens */}
            <div>
              <p className="font-bold text-sm mb-3">Itens Solicitados</p>
              <ul style={{ listStyle: "none", margin: 0, fontSize: "0.85rem", backgroundColor: "var(--surface-1)", borderRadius: "8px", padding: "0.5rem 1rem" }}>
                {order.items.map((item: any) => (
                  <li key={item.id} className="flex justify-between" style={{ padding: "0.4rem 0", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                    <span><strong>{item.quantity}x</strong> {item.product.name}</span>
                    <span className="font-bold">R$ {(item.quantity * item.price).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
              {order.isEmergency && order.emergencyFine > 0 && (
                <div style={{ marginTop: "0.75rem", padding: "0.75rem", backgroundColor: "rgba(239,68,68,0.08)", borderRadius: "8px", border: "1px solid rgba(239,68,68,0.2)", fontSize: "0.85rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.3rem" }}>
                    <span style={{ color: "var(--text-muted)" }}>Subtotal itens</span>
                    <span>R$ {(order.totalAmount - order.emergencyFine).toFixed(2)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.3rem" }}>
                    <span style={{ color: "#DC2626", fontWeight: 700 }}>Multa 30% emergência</span>
                    <span style={{ color: "#DC2626", fontWeight: 700 }}>+ R$ {order.emergencyFine.toFixed(2)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid rgba(239,68,68,0.2)", paddingTop: "0.3rem" }}>
                    <span style={{ fontWeight: 800 }}>Total cobrado</span>
                    <span style={{ fontWeight: 800 }}>R$ {order.totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              )}
              {order.status === "PENDING_PAYMENT" && (
                <div style={{ marginTop: "1rem" }}>
                  <Link href={`/admin/orders/${order.id}/edit`} className="btn btn-outline" style={{ fontSize: "0.85rem", width: "100%", textAlign: "center", display: "block", wordBreak: "break-word" }}>
                    ✏️ Editar Itens e Valores
                  </Link>
                </div>
              )}
            </div>

            {/* Histórico e Outros */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ backgroundColor: "var(--surface-2)", padding: "1rem", borderRadius: "8px", fontSize: "0.8rem" }}>
                <p className="font-bold mb-2">Histórico de Alterações</p>
                {order.history.length === 0 ? (
                  <p className="text-muted">Nenhuma alteração registrada.</p>
                ) : (
                  <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {order.history.map((h: any) => (
                      <li key={h.id} style={{ borderLeft: "2px solid var(--primary)", paddingLeft: "8px" }}>
                        <div>
                          <strong>{h.actionBy}</strong> alterou para <strong>{getStatusLabel(h.statusTo)}</strong>
                        </div>
                        <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                          {new Date(h.createdAt).toLocaleString('pt-BR')} {h.notes && `• Motivo: ${h.notes}`}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* CONTROLES DE EMERGÊNCIA */}
              {order.isEmergency && order.emergencyStatus === "PENDING_APPROVAL" && (
                <div style={{ backgroundColor: "rgba(245, 158, 11, 0.1)", padding: "1rem", borderRadius: "8px", border: "1px solid var(--warning)" }}>
                  <p className="font-bold mb-2" style={{ color: "var(--warning)" }}>🚨 Solicitação de Retirada de Emergência</p>
                  <p style={{ fontSize: "0.85rem", marginBottom: "1rem" }}>Avalie o pedido e decida se aprova ou não a retirada na base.</p>

                  {!isRejecting ? (
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button onClick={handleApproveEmergency} disabled={loadingAction} className="btn" style={{ backgroundColor: "var(--success)", color: "white", fontSize: "0.85rem", flex: 1 }}>
                        Aprovar e Gerar Boleto
                      </button>
                      <button onClick={() => setIsRejecting(true)} disabled={loadingAction} className="btn" style={{ backgroundColor: "var(--danger)", color: "white", fontSize: "0.85rem", flex: 1 }}>
                        Reprovar
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      <input
                        type="text"
                        placeholder="Motivo da reprovação..."
                        className="input-field"
                        value={rejectReason}
                        onChange={e => setRejectReason(e.target.value)}
                        style={{ fontSize: "0.85rem" }}
                      />
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button onClick={() => setIsRejecting(false)} className="btn btn-outline" style={{ fontSize: "0.85rem", flex: 1 }}>Cancelar</button>
                        <button onClick={handleRejectEmergency} disabled={loadingAction} className="btn" style={{ backgroundColor: "var(--danger)", color: "white", fontSize: "0.85rem", flex: 1 }}>
                          Confirmar Reprovação
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {order.isEmergency && order.emergencyStatus === "REJECTED" && order.rejectionReason && (
                <div style={{ padding: "0.5rem", backgroundColor: "rgba(239, 68, 68, 0.1)", borderRadius: "8px" }}>
                  <p style={{ color: "var(--danger)", fontSize: "0.85rem" }}>
                    <strong>Motivo da Reprovação (Emergência):</strong> {order.rejectionReason}
                  </p>
                </div>
              )}

              {order.cancelReason && (
                <div style={{ padding: "0.5rem", backgroundColor: "rgba(239, 68, 68, 0.1)", borderRadius: "8px" }}>
                  <p style={{ color: "var(--danger)", fontSize: "0.85rem" }}>
                    <strong>Motivo do Cancelamento:</strong> {order.cancelReason}
                  </p>
                </div>
              )}

              {order.boletoUrl && order.status !== "CANCELADO" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "auto" }}>
                  <a href={order.boletoUrl} target="_blank" rel="noreferrer" className="btn btn-outline" style={{ fontSize: "0.85rem", textAlign: "center", wordBreak: "break-all", whiteSpace: "normal" }}>
                    🔗 Abrir Link de Pagamento (Asaas)
                  </a>
                  <button
                    onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(order.boletoUrl); alert("Link copiado com sucesso!"); }}
                    className="btn btn-primary"
                    style={{ fontSize: "0.85rem", textAlign: "center" }}
                  >
                    📋 Copiar Link de Pagamento
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
