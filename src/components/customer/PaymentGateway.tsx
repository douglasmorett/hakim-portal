"use client";
/**
 * FireHub — Componente de Pagamento Online (Pagar.me)
 * Suporte: PIX, Crédito, Débito, Voucher VR (Alelo, Ticket, Ben, Sodexo)
 * 
 * USO:
 *   <PaymentGateway
 *     orderId="clxxx"
 *     amount={45.90}
 *     onPaid={() => handlePaid()}
 *     onError={(msg) => alert(msg)}
 *   />
 * 
 * IMPORTANTE: Adicionar ao <head> do layout ou page:
 *   <script src="https://assets.pagar.me/pagarme-js/4.10/pagarme.min.js" />
 * O pagarme.js tokeniza o cartão no client, sem dados sensíveis passarem pelo servidor.
 */
import { useState, useEffect, useRef } from "react";
import { QrCode, CreditCard, Check, X, Loader, RefreshCw, Smartphone } from "lucide-react";

type PayMethod = "pix" | "credit_card" | "debit_card" | "voucher";

const VOUCHER_BRANDS = ["Alelo", "Ticket", "Ben", "Sodexo", "VR"];

const PAYMENT_LABELS: Record<PayMethod, string> = {
  pix: "💰 PIX — Instantâneo D+0",
  credit_card: "💳 Cartão de Crédito — D+2",
  debit_card: "💳 Cartão de Débito — D+1",
  voucher: "🎫 Voucher Refeição/Alimentação — D+1",
};

export default function PaymentGateway({
  orderId, amount, onPaid, onError, onCancel
}: {
  orderId: string;
  amount: number;
  onPaid: () => void;
  onError: (msg: string) => void;
  onCancel: () => void;
}) {
  const [method, setMethod] = useState<PayMethod>("pix");
  const [loading, setLoading] = useState(false);
  const [pixData, setPixData] = useState<{ qrCode: string; qrCodeUrl: string; expiresAt: string } | null>(null);
  const [pixPaid, setPixPaid] = useState(false);
  const [pixExpired, setPixExpired] = useState(false);
  const [copied, setCopied] = useState(false);

  // Dados do cartão
  const [cardNumber, setCardNumber] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [customerDocument, setCustomerDocument] = useState("");

  // Polling PIX
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const startPixPolling = () => {
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/pagarme/status?orderId=${orderId}`);
        if (res.ok) {
          const d = await res.json();
          if (d.paid) { setPixPaid(true); clearInterval(pollRef.current!); setTimeout(onPaid, 1500); }
          if (d.failed) { clearInterval(pollRef.current!); onError("Pagamento falhou."); }
        }
      } catch {}
    }, 3000);
  };

  const handlePixPay = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/pagarme/order", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, paymentMethod: "pix" }),
      });
      const data = await res.json();
      if (!res.ok) { onError(data.error || "Erro ao gerar PIX"); return; }
      setPixData(data.pix);
      startPixPolling();
      // Verificar expiração
      if (data.pix?.expiresAt) {
        const ms = new Date(data.pix.expiresAt).getTime() - Date.now();
        if (ms > 0) setTimeout(() => setPixExpired(true), ms);
      }
    } catch (e: any) { onError(e.message); }
    finally { setLoading(false); }
  };

  const handleCardPay = async () => {
    setLoading(true);
    try {
      // Tokenizar cartão no cliente via pagarme.js (sem passar dados pelo servidor)
      const pagarme = (window as any).pagarme;
      if (!pagarme) { onError("Biblioteca de pagamento não carregada. Recarregue a página."); setLoading(false); return; }

      const [expMonth, expYear] = cardExpiry.split("/");
      const card = await pagarme.client
        .connect({ encryption_key: process.env.NEXT_PUBLIC_PAGARME_PUBLIC_KEY || "" })
        .then((c: any) => c.security.encrypt({
          card_number: cardNumber.replace(/\s/g, ""),
          card_holder_name: cardHolder,
          card_expiration_date: `${expMonth}${expYear}`,
          card_cvv: cardCvv,
        }));

      const res = await fetch("/api/pagarme/order", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId, paymentMethod: method, cardToken: card,
          customerDocument: customerDocument.replace(/\D/g, ""),
        }),
      });
      const data = await res.json();
      if (!res.ok) { onError(data.error || "Cartão recusado"); return; }
      if (data.paid) { setTimeout(onPaid, 800); }
      else { onError("Pagamento não aprovado. Tente outro cartão."); }
    } catch (e: any) { onError(e.message || "Erro no cartão"); }
    finally { setLoading(false); }
  };

  const copyPix = () => {
    if (pixData?.qrCode) {
      navigator.clipboard.writeText(pixData.qrCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const fmtCard = (v: string) => v.replace(/\D/g, "").replace(/(.{4})/g, "$1 ").trim().slice(0, 19);
  const fmtExpiry = (v: string) => {
    const d = v.replace(/\D/g, "");
    return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2, 4)}` : d;
  };
  const fmtDoc = (v: string) => {
    const d = v.replace(/\D/g, "");
    if (d.length <= 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "12px 14px", borderRadius: "10px",
    border: "1.5px solid #E2E8F0", fontSize: "0.9rem", outline: "none",
    fontFamily: "inherit", boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: "0.75rem", fontWeight: 700, color: "#475569",
    display: "block", marginBottom: "4px"
  };

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div>
          <h2 style={{ fontWeight: 800, fontSize: "1.1rem", margin: 0 }}>💳 Pagamento Online</h2>
          <p style={{ fontSize: "0.8rem", color: "#64748B", margin: 0 }}>
            Total: <strong style={{ color: "#16A34A" }}>R$ {amount.toFixed(2)}</strong>
          </p>
        </div>
        <button onClick={onCancel} style={{ background: "none", border: "none", cursor: "pointer", color: "#94A3B8" }}>
          <X size={20} />
        </button>
      </div>

      {/* Seleção de método */}
      {!pixData && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "20px" }}>
          {(["pix", "credit_card", "debit_card", "voucher"] as PayMethod[]).map(m => (
            <button key={m} onClick={() => setMethod(m)}
              style={{
                padding: "12px 16px", borderRadius: "12px", border: `2px solid ${method === m ? "#E63946" : "#E2E8F0"}`,
                background: method === m ? "#FFF1F2" : "#fff", cursor: "pointer", textAlign: "left",
                fontWeight: method === m ? 700 : 500, fontSize: "0.9rem", fontFamily: "inherit",
                color: method === m ? "#E63946" : "#475569", transition: "all 0.15s",
              }}>
              {PAYMENT_LABELS[m]}
              {m === "voucher" && (
                <span style={{ fontSize: "0.7rem", color: "#64748B", fontWeight: 400, marginLeft: "8px" }}>
                  ({VOUCHER_BRANDS.join(", ")})
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* ===== PIX ===== */}
      {method === "pix" && !pixData && (
        <button onClick={handlePixPay} disabled={loading}
          style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "none", background: "linear-gradient(135deg,#00BFA5,#009688)", color: "#fff", fontWeight: 800, fontSize: "1rem", cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", fontFamily: "inherit" }}>
          {loading ? <><Loader size={18} style={{ animation: "spin 1s linear infinite" }} /> Gerando PIX...</> : <><QrCode size={18} /> Gerar QR Code PIX</>}
        </button>
      )}

      {/* PIX QR CODE */}
      {pixData && !pixPaid && !pixExpired && (
        <div style={{ textAlign: "center" }}>
          <div style={{ background: "#F0FDF4", border: "2px solid #BBF7D0", borderRadius: "16px", padding: "20px", marginBottom: "16px" }}>
            <p style={{ fontSize: "0.82rem", fontWeight: 700, color: "#16A34A", marginBottom: "12px" }}>
              📱 Escaneie o QR Code ou copie o código PIX
            </p>
            {/* QR Code via API pública */}
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pixData.qrCode)}`}
              alt="QR Code PIX" style={{ width: 200, height: 200, borderRadius: "8px" }}
            />
            <div style={{ marginTop: "12px" }}>
              <button onClick={copyPix}
                style={{ padding: "10px 20px", borderRadius: "10px", border: "1.5px solid #16A34A", background: copied ? "#16A34A" : "#fff", color: copied ? "#fff" : "#16A34A", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px", fontFamily: "inherit" }}>
                {copied ? <><Check size={14} /> Copiado!</> : "📋 Copiar código PIX"}
              </button>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", color: "#64748B", fontSize: "0.82rem" }}>
            <Loader size={14} style={{ animation: "spin 2s linear infinite" }} />
            Aguardando confirmação do pagamento...
          </div>
          {pixData.expiresAt && (
            <p style={{ fontSize: "0.75rem", color: "#94A3B8", marginTop: "8px" }}>
              Expira às {new Date(pixData.expiresAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </p>
          )}
        </div>
      )}

      {pixPaid && (
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#16A34A", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <Check size={32} color="#fff" />
          </div>
          <h3 style={{ fontWeight: 800, color: "#16A34A" }}>PIX Confirmado! ✅</h3>
          <p style={{ fontSize: "0.85rem", color: "#64748B" }}>Seu pedido foi aceito automaticamente.</p>
        </div>
      )}

      {pixExpired && (
        <div style={{ textAlign: "center", padding: "1.5rem" }}>
          <p style={{ fontWeight: 700, color: "#DC2626" }}>⏱️ PIX expirado.</p>
          <button onClick={() => { setPixData(null); setPixExpired(false); }}
            style={{ padding: "10px 20px", borderRadius: "10px", border: "none", background: "#E63946", color: "#fff", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px", fontFamily: "inherit" }}>
            <RefreshCw size={14} /> Gerar novo PIX
          </button>
        </div>
      )}

      {/* ===== CARTÃO / VOUCHER ===== */}
      {(method === "credit_card" || method === "debit_card" || method === "voucher") && !pixData && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {method === "voucher" && (
            <div style={{ padding: "10px 14px", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: "10px", fontSize: "0.8rem", color: "#92400E" }}>
              🎫 Aceito: {VOUCHER_BRANDS.join(", ")} — insira os dados do seu cartão de benefício
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div style={{ gridColumn: "span 2" }}>
              <label style={labelStyle}>Número do Cartão</label>
              <input style={inputStyle} value={cardNumber} onChange={e => setCardNumber(fmtCard(e.target.value))}
                placeholder="0000 0000 0000 0000" maxLength={19} />
            </div>
            <div style={{ gridColumn: "span 2" }}>
              <label style={labelStyle}>Nome no Cartão</label>
              <input style={inputStyle} value={cardHolder} onChange={e => setCardHolder(e.target.value.toUpperCase())}
                placeholder="NOME COMO NO CARTÃO" />
            </div>
            <div>
              <label style={labelStyle}>Validade</label>
              <input style={inputStyle} value={cardExpiry} onChange={e => setCardExpiry(fmtExpiry(e.target.value))}
                placeholder="MM/AA" maxLength={5} />
            </div>
            <div>
              <label style={labelStyle}>CVV</label>
              <input style={inputStyle} value={cardCvv} onChange={e => setCardCvv(e.target.value.replace(/\D/g, ""))}
                placeholder="123" maxLength={4} type="password" />
            </div>
            <div style={{ gridColumn: "span 2" }}>
              <label style={labelStyle}>CPF do Titular</label>
              <input style={inputStyle} value={customerDocument}
                onChange={e => setCustomerDocument(fmtDoc(e.target.value))}
                placeholder="000.000.000-00" maxLength={18} />
            </div>
          </div>

          <div style={{ padding: "10px 14px", background: "#F8FAFC", borderRadius: "8px", fontSize: "0.75rem", color: "#64748B", display: "flex", alignItems: "center", gap: "6px" }}>
            🔒 Dados criptografados via Pagar.me/Stone — nunca armazenados no servidor
          </div>

          <button onClick={handleCardPay} disabled={loading || !cardNumber || !cardHolder || !cardExpiry || !cardCvv}
            style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "none", background: loading ? "#94A3B8" : "linear-gradient(135deg,#E63946,#C62828)", color: "#fff", fontWeight: 800, fontSize: "1rem", cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", fontFamily: "inherit" }}>
            {loading ? <><Loader size={18} style={{ animation: "spin 1s linear infinite" }} /> Processando...</> : <><CreditCard size={18} /> Pagar R$ {amount.toFixed(2)}</>}
          </button>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
