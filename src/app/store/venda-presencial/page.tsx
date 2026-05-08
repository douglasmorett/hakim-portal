"use client";
import { useState, useEffect } from "react";

const PAYMENT_METHODS = ["Dinheiro", "Cartão Crédito", "Cartão Débito", "PIX", "Vale/Voucher"];

const fmt = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

export default function VendaPresencialPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<{ product: any; qty: number }[]>([]);
  const [orderType, setOrderType] = useState<"MESA" | "RETIRADA" | "DELIVERY">("MESA");
  const [tableNum, setTableNum] = useState("");
  const [address, setAddress] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Dinheiro");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/admin/menu-products").then(r => r.json()).then(setProducts);
  }, []);

  const filtered = products.filter(p =>
    p.active && p.name.toLowerCase().includes(search.toLowerCase())
  );

  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) return prev.map(i => i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { product, qty: 1 }];
    });
  };

  const updateQty = (productId: string, qty: number) => {
    if (qty <= 0) setCart(prev => prev.filter(i => i.product.id !== productId));
    else setCart(prev => prev.map(i => i.product.id === productId ? { ...i, qty } : i));
  };

  const total = cart.reduce((s, i) => s + i.product.price * i.qty, 0);

  const handleSubmit = async () => {
    if (cart.length === 0) return setMsg("❌ Adicione pelo menos um produto.");
    if (!paymentMethod) return setMsg("❌ Informe a forma de pagamento.");
    if (orderType === "MESA" && !tableNum) return setMsg("❌ Informe o número da mesa.");
    if (orderType === "DELIVERY" && !address) return setMsg("❌ Informe o endereço.");

    setLoading(true);
    const body = {
      customerName: customerName || (orderType === "MESA" ? `Mesa ${tableNum}` : "Balcão"),
      customerPhone: customerPhone || "00000000000",
      customerAddress: orderType === "DELIVERY" ? address : orderType === "MESA" ? `Mesa ${tableNum}` : "Retirada no balcão",
      deliveryType: orderType,
      paymentMethod,
      notes,
      totalAmount: total,
      deliveryFee: 0,
      items: cart.map(i => ({ menuProductId: i.product.id, quantity: i.qty, price: i.product.price })),
    };

    const res = await fetch("/api/store/orders/presencial", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setLoading(false);
    if (res.ok) {
      setMsg("✅ Pedido registrado com sucesso!");
      setCart([]);
      setCustomerName("");
      setCustomerPhone("");
      setAddress("");
      setTableNum("");
      setNotes("");
    } else {
      const err = await res.json();
      setMsg("❌ " + (err.error || "Erro ao registrar pedido."));
    }
  };

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", maxWidth: "1200px", margin: "0 auto", padding: "1rem" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "4px" }}>🛒 Venda Presencial</h1>
      <p style={{ color: "#64748B", fontSize: "0.9rem", marginBottom: "1.5rem" }}>Registre pedidos de mesa, balcão ou delivery manualmente.</p>

      {msg && (
        <div style={{ padding: "10px 16px", borderRadius: "8px", marginBottom: "1rem", background: msg.startsWith("✅") ? "#f0fdf4" : "#fef2f2", color: msg.startsWith("✅") ? "#16a34a" : "#dc2626", border: `1px solid ${msg.startsWith("✅") ? "#bbf7d0" : "#fecaca"}` }}>
          {msg} <button onClick={() => setMsg("")} style={{ float: "right", background: "none", border: "none", cursor: "pointer" }}>×</button>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: "1.5rem", alignItems: "start" }}>
        {/* PRODUTOS */}
        <div>
          <input
            type="text" placeholder="🔍 Buscar produto..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: "1.5px solid #E2E8F0", fontSize: "0.9rem", outline: "none", marginBottom: "1rem" }}
          />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "10px" }}>
            {filtered.map(p => (
              <div key={p.id} onClick={() => addToCart(p)}
                style={{ background: "#fff", border: "1.5px solid #E2E8F0", borderRadius: "12px", padding: "12px", cursor: "pointer", transition: "all 0.2s", userSelect: "none" }}
                onMouseOver={e => (e.currentTarget.style.borderColor = "#DC2626")}
                onMouseOut={e => (e.currentTarget.style.borderColor = "#E2E8F0")}
              >
                {p.imageUrl && <img src={p.imageUrl} alt={p.name} style={{ width: "100%", height: "80px", objectFit: "cover", borderRadius: "8px", marginBottom: "8px" }} />}
                <div style={{ fontWeight: 700, fontSize: "0.85rem", marginBottom: "2px" }}>{p.name}</div>
                <div style={{ fontSize: "0.8rem", color: "#64748B", marginBottom: "4px" }}>{p.isCombo ? "🍱 Combo" : p.category}</div>
                <div style={{ color: "#DC2626", fontWeight: 800 }}>{fmt(p.price)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* PEDIDO */}
        <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: "16px", padding: "20px", position: "sticky", top: "80px" }}>
          <h2 style={{ fontWeight: 800, marginBottom: "1rem", fontSize: "1.05rem" }}>📋 Pedido</h2>

          {/* Tipo */}
          <div style={{ display: "flex", gap: "6px", marginBottom: "1rem" }}>
            {(["MESA", "RETIRADA", "DELIVERY"] as const).map(t => (
              <button key={t} onClick={() => setOrderType(t)}
                style={{ flex: 1, padding: "8px 4px", borderRadius: "8px", border: "none", fontWeight: 700, fontSize: "0.78rem", cursor: "pointer", fontFamily: "inherit",
                  background: orderType === t ? "#DC2626" : "#F1F5F9", color: orderType === t ? "#fff" : "#64748B" }}>
                {t === "MESA" ? "🍽️ Mesa" : t === "RETIRADA" ? "🏠 Retirada" : "🛵 Delivery"}
              </button>
            ))}
          </div>

          {orderType === "MESA" && (
            <input className="input" placeholder="Número da mesa" value={tableNum} onChange={e => setTableNum(e.target.value)}
              style={{ width: "100%", marginBottom: "8px", padding: "8px 12px", borderRadius: "8px", border: "1.5px solid #E2E8F0", fontSize: "0.9rem", outline: "none" }} />
          )}
          {orderType === "DELIVERY" && (
            <input placeholder="Endereço completo do cliente" value={address} onChange={e => setAddress(e.target.value)}
              style={{ width: "100%", marginBottom: "8px", padding: "8px 12px", borderRadius: "8px", border: "1.5px solid #E2E8F0", fontSize: "0.9rem", outline: "none" }} />
          )}

          <input placeholder="Nome do cliente (opcional)" value={customerName} onChange={e => setCustomerName(e.target.value)}
            style={{ width: "100%", marginBottom: "8px", padding: "8px 12px", borderRadius: "8px", border: "1.5px solid #E2E8F0", fontSize: "0.9rem", outline: "none" }} />
          <input placeholder="Telefone (opcional)" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)}
            style={{ width: "100%", marginBottom: "8px", padding: "8px 12px", borderRadius: "8px", border: "1.5px solid #E2E8F0", fontSize: "0.9rem", outline: "none" }} />

          <label style={{ fontSize: "0.82rem", fontWeight: 600, display: "block", marginBottom: "4px" }}>Forma de Pagamento</label>
          <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}
            style={{ width: "100%", marginBottom: "8px", padding: "8px 12px", borderRadius: "8px", border: "1.5px solid #E2E8F0", fontSize: "0.9rem", outline: "none", background: "#fff" }}>
            {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>

          <textarea placeholder="Observações (opcional)" value={notes} onChange={e => setNotes(e.target.value)} rows={2}
            style={{ width: "100%", marginBottom: "12px", padding: "8px 12px", borderRadius: "8px", border: "1.5px solid #E2E8F0", fontSize: "0.9rem", outline: "none", resize: "none" }} />

          {/* ITENS DO CARRINHO */}
          <div style={{ borderTop: "1px solid #F1F5F9", paddingTop: "10px", marginBottom: "10px" }}>
            {cart.length === 0 ? (
              <p style={{ color: "#94A3B8", fontSize: "0.85rem", textAlign: "center", padding: "10px 0" }}>Nenhum item adicionado</p>
            ) : cart.map(i => (
              <div key={i.product.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", fontSize: "0.85rem" }}>
                <span style={{ flex: 1, fontWeight: 600 }}>{i.product.name}</span>
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <button onClick={() => updateQty(i.product.id, i.qty - 1)} style={{ width: "24px", height: "24px", borderRadius: "50%", border: "1px solid #E2E8F0", background: "#F8FAFC", cursor: "pointer", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>-</button>
                  <span style={{ width: "20px", textAlign: "center", fontWeight: 700 }}>{i.qty}</span>
                  <button onClick={() => updateQty(i.product.id, i.qty + 1)} style={{ width: "24px", height: "24px", borderRadius: "50%", border: "1px solid #E2E8F0", background: "#F8FAFC", cursor: "pointer", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                  <span style={{ marginLeft: "6px", color: "#DC2626", fontWeight: 700, minWidth: "60px", textAlign: "right" }}>{fmt(i.product.price * i.qty)}</span>
                </div>
              </div>
            ))}
          </div>

          {cart.length > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: "1rem", padding: "8px 0", borderTop: "2px solid #1E293B", marginBottom: "12px" }}>
              <span>TOTAL</span><span style={{ color: "#DC2626" }}>{fmt(total)}</span>
            </div>
          )}

          <button onClick={handleSubmit} disabled={loading || cart.length === 0}
            style={{ width: "100%", padding: "12px", background: cart.length === 0 ? "#E2E8F0" : "#DC2626", color: cart.length === 0 ? "#94A3B8" : "#fff", border: "none", borderRadius: "10px", fontWeight: 800, fontSize: "1rem", cursor: cart.length === 0 ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
            {loading ? "Registrando..." : "✅ Registrar Pedido"}
          </button>
        </div>
      </div>
    </div>
  );
}
