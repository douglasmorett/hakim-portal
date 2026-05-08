"use client";

import { useCart } from "@/components/CartProvider";
import { useState } from "react";
import { Trash2, ArrowLeft, CheckCircle } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

export default function CartPage() {
  const { items, removeFromCart, total, clearCart } = useCart();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("emergency") === "true") {
      setIsEmergencyModalOpen(true);
    }
  }, [searchParams]);

  const handleCheckout = async () => {
    if (items.length === 0) return;
    setLoading(true);

    try {
      // Aqui chamaremos a Action para processar o pedido e gerar o boleto no Asaas
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, totalAmount: total }),
      });

      if (res.ok) {
        const data = await res.json();
        clearCart();
        setSuccess(true);
        
        // Abre o boleto em uma nova aba
        if (data.boletoUrl) {
          window.open(data.boletoUrl, "_blank");
        }

        setTimeout(() => {
          router.push("/store/orders");
        }, 3000);
      } else {
        alert("Erro ao finalizar pedido. Tente novamente.");
        setLoading(false);
      }
    } catch (error) {
      alert("Erro ao conectar com o servidor.");
      setLoading(false);
    }
  };

  const handleEmergencyCheckout = async () => {
    if (items.length === 0) return;
    setLoading(true);

    try {
      const res = await fetch("/api/checkout-emergency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });

      if (res.ok) {
        clearCart();
        setSuccess(true);
        setIsEmergencyModalOpen(false);
        setTimeout(() => {
          router.push("/store/orders");
        }, 3000);
      } else {
        const data = await res.json();
        alert(`Erro: ${data.error || "Tente novamente."}`);
        setLoading(false);
      }
    } catch (error) {
      alert("Erro ao conectar com o servidor.");
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="container flex flex-col items-center justify-center text-center mt-8">
        <CheckCircle size={64} color="var(--success)" style={{ marginBottom: "1rem" }} />
        <h2 className="font-bold" style={{ fontSize: "2rem" }}>Pedido Realizado com Sucesso!</h2>
        <p className="text-muted mt-4">O boleto com prazo de 10 dias foi gerado.<br />Redirecionando para seus pedidos...</p>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/store" className="btn btn-outline" style={{ padding: "0.5rem", borderRadius: "50%" }}>
          <ArrowLeft size={20} />
        </Link>
        <h1 className="font-bold" style={{ fontSize: "2rem" }}>Meu Carrinho</h1>
      </div>

      {items.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-muted mb-4">Seu carrinho está vazio.</p>
          <Link href="/store" className="btn btn-primary">Voltar para a Loja</Link>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "2rem" }}>
          
          {/* Lista de Itens */}
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {items.map(item => (
              <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "1rem", borderBottom: "1px solid var(--border-color)" }}>
                <div>
                  <h3 className="font-semibold" style={{ fontSize: "1.1rem" }}>{item.name}</h3>
                  <p className="text-muted">Quantidade: {item.quantity} x R$ {item.price.toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-bold">R$ {(item.quantity * item.price).toFixed(2)}</span>
                  <button onClick={() => removeFromCart(item.id)} className="btn btn-outline" style={{ padding: "0.5rem", color: "var(--danger)" }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Resumo */}
          <div className="card" style={{ alignSelf: "start" }}>
            <h2 className="font-bold mb-4" style={{ fontSize: "1.2rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem" }}>Resumo do Pedido</h2>
            <div className="flex justify-between mb-2">
              <span className="text-muted">Subtotal</span>
              <span>R$ {total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between mb-4">
              <span className="text-muted">Frete (Rota Franquia)</span>
              <span style={{ color: "var(--success)", fontWeight: "bold" }}>Grátis</span>
            </div>
            
            <div className="flex justify-between mb-6" style={{ borderTop: "1px solid var(--border-color)", paddingTop: "1rem", fontSize: "1.2rem" }}>
              <span className="font-bold">Total</span>
              <span className="font-extrabold gradient-text">R$ {total.toFixed(2)}</span>
            </div>

            {/* PEDIDO MÍNIMO R$300 */}
            {total < 300 && (
              <div style={{ marginBottom: "1rem", padding: "1rem", borderRadius: "12px", background: "#FFF7ED", border: "1.5px solid #FBBF24" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                  <span style={{ fontSize: "1.2rem" }}>⚠️</span>
                  <span style={{ fontWeight: 700, color: "#B45309", fontSize: "0.9rem" }}>Pedido mínimo: R$ 300,00</span>
                </div>
                <div style={{ width: "100%", height: "8px", background: "#FDE68A", borderRadius: "4px", overflow: "hidden", marginBottom: "0.5rem" }}>
                  <div style={{ width: `${Math.min((total / 300) * 100, 100)}%`, height: "100%", background: "linear-gradient(90deg, #F59E0B, #EF4444)", borderRadius: "4px", transition: "width 0.3s" }} />
                </div>
                <p style={{ fontSize: "0.82rem", color: "#92400E", margin: 0 }}>
                  Faltam <strong>R$ {(300 - total).toFixed(2)}</strong> para atingir o pedido mínimo. Adicione mais itens ao carrinho.
                </p>
              </div>
            )}

            <button 
              className="btn btn-primary" 
              style={{ width: "100%", padding: "1rem", fontSize: "1.1rem", opacity: total < 300 ? 0.5 : 1 }}
              onClick={total < 300 ? undefined : handleCheckout}
              disabled={loading || total < 300}
            >
              {loading ? "Processando..." : total < 300 ? `Faltam R$ ${(300 - total).toFixed(2)} para o mínimo` : "Finalizar e Gerar Boleto"}
            </button>
            <p className="text-muted text-center mt-4 mb-4" style={{ fontSize: "0.85rem" }}>
              {total < 300 ? "Volte à loja e adicione mais produtos para finalizar seu pedido." : "O boleto será gerado via banco Asaas com vencimento em 10 dias."}
            </p>

            {/* BOTÃO RETIRADA DE EMERGÊNCIA */}
            <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "1rem" }}>
              <button 
                className="btn" 
                style={{ width: "100%", padding: "0.8rem", fontSize: "1rem", backgroundColor: "var(--danger)", color: "white", fontWeight: "bold" }}
                onClick={() => setIsEmergencyModalOpen(true)}
                disabled={loading}
              >
                🚨 Retirada de Emergência
              </button>
            </div>
          </div>

        </div>
      )}

      {/* MODAL DE EMERGÊNCIA */}
      {isEmergencyModalOpen && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div className="card" style={{ maxWidth: "500px", width: "100%", maxHeight: "90vh", overflowY: "auto", position: "relative" }}>
            <h2 className="font-bold text-xl mb-4" style={{ color: "var(--danger)" }}>⚠️ Retirada de Emergência</h2>
            
            <div style={{ fontSize: "0.95rem", lineHeight: "1.6", color: "var(--text-main)", marginBottom: "1.5rem" }}>
              <p className="mb-2"><strong>Atenção às regras de retirada:</strong></p>
              <ul style={{ paddingLeft: "1.5rem", marginBottom: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <li>Se você esqueceu de pedir, perdeu o prazo ou pediu pouco, pode solicitar esta retirada.</li>
                <li>Cada conta tem direito a <strong>1 retirada de emergência no mês sem multa</strong>.</li>
                <li>Caso isso aconteça mais de uma vez no mesmo mês, terá uma <strong>multa no pedido de 30%</strong>.</li>
                <li>O franqueado deve realizar a retirada na <strong>base da empresa</strong> (não será feita entrega).</li>
                <li>Retiradas só podem acontecer de <strong>segunda a sexta</strong> (finais de semana não temos retirada na base).</li>
                <li>Este pedido <strong>tem que ser aceito pela nossa equipe</strong>. Ele não entrará automático.</li>
                <li>O link de pagamento será gerado apenas <strong>depois que for aceito</strong>.</li>
                <li style={{ color: "var(--danger)", fontWeight: "bold" }}>Após finalizar o pedido aqui, envie uma mensagem para o responsável da produção informando sua solicitação: <br/><a href="https://wa.me/5521972947120" target="_blank" style={{ textDecoration: "underline" }}>(21) 97294-7120</a></li>
              </ul>
              
              <div style={{ padding: "0.8rem", backgroundColor: "var(--surface-2)", borderRadius: "8px", fontWeight: "bold", textAlign: "center" }}>
                Você concorda com as regras acima?
              </div>
            </div>

            <div style={{ display: "flex", gap: "1rem" }}>
              <button 
                className="btn btn-outline" 
                style={{ flex: 1 }}
                onClick={() => setIsEmergencyModalOpen(false)}
                disabled={loading}
              >
                Cancelar
              </button>
              <button 
                className="btn" 
                style={{ flex: 1, backgroundColor: "var(--danger)", color: "white", fontWeight: "bold" }}
                onClick={handleEmergencyCheckout}
                disabled={loading}
              >
                {loading ? "Enviando..." : "Solicitar Aprovação"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
