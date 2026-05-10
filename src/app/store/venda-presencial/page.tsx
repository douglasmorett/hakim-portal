"use client";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { ShoppingCart, Plus, Minus, Trash2, Check, Search, Scan, X, AlertCircle } from "lucide-react";

const PAYMENT_METHODS = ["Dinheiro", "PIX", "Cartão Débito", "Cartão Crédito", "Voucher/Vale"];
const fmt = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

type CartItem = { product: any; qty: number };
type OrderType = "BALCAO" | "MESA" | "DELIVERY";

export default function VendaPresencialPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [paymentConfig, setPaymentConfig] = useState<any>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<OrderType>("BALCAO");
  const [tableNum, setTableNum] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [address, setAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Dinheiro");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [change, setChange] = useState("");
  // Leitor de código de barras
  const [barcodeBuffer, setBarcodeBuffer] = useState("");
  const [barcodeFlash, setBarcodeFlash] = useState<string | null>(null);
  const barcodeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/admin/menu-products").then(r => r.json()).then(setProducts);
    fetch("/api/store-settings/payment").then(r => r.ok ? r.json() : null).then(d => d && setPaymentConfig(d.paymentFees));
  }, []);

  // ── Leitor de código de barras (USB/Bluetooth HID) ─────────────────────────
  // Scanners emitem teclas rápidas (<50ms entre elas) e finalizam com Enter
  const handleBarcodeInput = useCallback((barcode: string) => {
    const code = barcode.trim();
    if (!code) return;

    const found = products.find(p =>
      p.barcode === code ||
      p.ean === code ||
      p.sku === code ||
      p.id === code
    );

    if (found && found.active && found.activePDV !== false) {
      setCart(prev => {
        const ex = prev.find(i => i.product.id === found.id);
        if (ex) return prev.map(i => i.product.id === found.id ? { ...i, qty: i.qty + 1 } : i);
        return [...prev, { product: found, qty: 1 }];
      });
      setBarcodeFlash(`✅ ${found.name} adicionado!`);
    } else {
      setBarcodeFlash(`❌ Código "${code}" não encontrado`);
    }
    setTimeout(() => setBarcodeFlash(null), 2500);
  }, [products]);

  useEffect(() => {
    let buffer = "";
    let lastTime = 0;

    const onKeyDown = (e: KeyboardEvent) => {
      // Ignora se o foco estiver em textarea/input de texto longo
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (tag === "TEXTAREA") return;

      const now = Date.now();
      const delta = now - lastTime;
      lastTime = now;

      if (e.key === "Enter") {
        if (buffer.length >= 4) handleBarcodeInput(buffer);
        buffer = "";
        return;
      }

      // Scanners são muito rápidos (< 80ms entre teclas); teclado humano é > 80ms
      if (delta < 80 || buffer.length > 0) {
        if (e.key.length === 1) buffer += e.key;
      } else {
        buffer = e.key.length === 1 ? e.key : "";
      }

      // Auto-reset se parar de digitar por 500ms
      if (barcodeTimerRef.current) clearTimeout(barcodeTimerRef.current);
      barcodeTimerRef.current = setTimeout(() => { buffer = ""; }, 500);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleBarcodeInput]);

  // ── Filtros ─────────────────────────────────────────────────────────────────
  const categories = useMemo(() => {
    const cats = Array.from(new Set(
      products.filter(p => p.active && p.activePDV !== false)
        .map(p => p.isCombo ? "Combos" : (p.category || "Outros"))
    ));
    return ["Todos", ...cats.sort()];
  }, [products]);

  const filtered = products.filter(p => {
    if (!p.active || p.activePDV === false) return false;
    const cat = p.isCombo ? "Combos" : (p.category || "Outros");
    if (selectedCategory !== "Todos" && cat !== selectedCategory) return false;
    if (search) {
      const q = search.toLowerCase();
      return p.name.toLowerCase().includes(q) ||
        p.barcode?.includes(search) || p.ean?.includes(search);
    }
    return true;
  });

  // ── Totais ──────────────────────────────────────────────────────────────────
  const voucherRate = useMemo(() => {
    if (!paymentConfig?.VOUCHER?.active) return 0;
    const brands: any[] = paymentConfig.VOUCHER.brands || [];
    const active = brands.filter((b: any) => b.active);
    if (active.length === 0) return paymentConfig.VOUCHER.rate || 0;
    return active.reduce((s: number, b: any) => s + b.rate, 0) / active.length;
  }, [paymentConfig]);

  const isVoucher = paymentMethod === "Voucher/Vale";
  const subtotal = cart.reduce((s, i) => s + i.product.price * i.qty, 0);
  const voucherFee = isVoucher ? subtotal * (voucherRate / 100) : 0;
  const total = subtotal + voucherFee;
  const troco = paymentMethod === "Dinheiro" && Number(change) > 0
    ? Math.max(0, Number(change) - total) : null;

  // ── Cart helpers ────────────────────────────────────────────────────────────
  const addToCart = (product: any) => {
    setCart(prev => {
      const ex = prev.find(i => i.product.id === product.id);
      if (ex) return prev.map(i => i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { product, qty: 1 }];
    });
  };

  const updateQty = (id: string, qty: number) => {
    if (qty <= 0) setCart(prev => prev.filter(i => i.product.id !== id));
    else setCart(prev => prev.map(i => i.product.id === id ? { ...i, qty } : i));
  };

  const clearCart = () => {
    setCart([]); setCustomerName(""); setCustomerPhone("");
    setAddress(""); setTableNum(""); setNotes(""); setChange("");
    setMsg("");
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (cart.length === 0) return setMsg("❌ Adicione pelo menos um produto.");
    if (orderType === "MESA" && !tableNum.trim()) return setMsg("❌ Informe o número da mesa.");
    if (orderType === "DELIVERY" && !address.trim()) return setMsg("❌ Informe o endereço de entrega.");
    if (paymentMethod === "Dinheiro" && change && Number(change) > 0 && Number(change) < total) {
      return setMsg("❌ Valor para troco menor que o total.");
    }

    setLoading(true); setMsg("");
    const body = {
      customerName: customerName || (orderType === "MESA" ? `Mesa ${tableNum}` : "Balcão"),
      customerPhone: customerPhone || "00000000000",
      customerAddress: orderType === "DELIVERY" ? address : orderType === "MESA" ? `Mesa ${tableNum}` : "Balcão",
      deliveryType: orderType === "BALCAO" ? "RETIRADA" : orderType,
      paymentMethod,
      notes,
      totalAmount: total,
      deliveryFee: 0,
      items: cart.map(i => ({ menuProductId: i.product.id, quantity: i.qty, price: i.product.price })),
    };

    const res = await fetch("/api/store/orders/presencial", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    setLoading(false);
    if (res.ok) {
      setMsg("✅ Pedido registrado com sucesso!");
      clearCart();
    } else {
      const err = await res.json();
      setMsg("❌ " + (err.error || "Erro ao registrar pedido."));
    }
  };

  const cartQty = cart.reduce((s, i) => s + i.qty, 0);

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", display: "grid", gridTemplateColumns: "1fr 390px", height: "calc(100vh - 110px)", overflow: "hidden" }}>

      {/* ── Flash do scanner ── */}
      {barcodeFlash && (
        <div style={{
          position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
          zIndex: 9999, background: barcodeFlash.startsWith("✅") ? "#16A34A" : "#DC2626",
          color: "#fff", padding: "10px 24px", borderRadius: 12,
          fontWeight: 700, fontSize: "0.95rem", boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
          animation: "fadeIn 0.2s ease"
        }}>
          {barcodeFlash}
        </div>
      )}

      {/* ═══ LEFT: CARDÁPIO ═══ */}
      <div style={{ display: "flex", flexDirection: "column", overflow: "hidden", borderRight: "1px solid #E2E8F0" }}>

        {/* Header busca + scanner */}
        <div style={{ padding: "12px 16px", background: "#fff", borderBottom: "1px solid #E2E8F0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>

            {/* Campo de busca (também captura código de barras manual) */}
            <div style={{ position: "relative", flex: 1 }}>
              <Search size={15} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94A3B8" }} />
              <input
                ref={searchRef}
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && search.trim()) {
                    // Tenta adicionar por código ao pressionar Enter manualmente
                    handleBarcodeInput(search.trim());
                    setSearch("");
                  }
                }}
                placeholder="Buscar por nome ou código de barras..."
                style={{ width: "100%", padding: "8px 12px 8px 32px", borderRadius: 10, border: "1.5px solid #E2E8F0", fontSize: "0.88rem", outline: "none" }}
              />
            </div>

            {/* Badge scanner */}
            <div title="Scanner USB conectado — aponte o leitor para o produto"
              style={{ background: "#0F172A", color: "#fff", borderRadius: 10, padding: "8px 12px", display: "flex", alignItems: "center", gap: 6, fontSize: "0.78rem", fontWeight: 700, cursor: "default", whiteSpace: "nowrap" }}>
              <Scan size={15} /> Scanner ON
            </div>

            {/* Badge carrinho */}
            <div style={{ background: "#C62828", color: "#fff", borderRadius: 10, padding: "8px 12px", fontWeight: 800, fontSize: "0.85rem", display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}>
              <ShoppingCart size={15} /> {cartQty}
            </div>
          </div>

          {/* Info scanner */}
          <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, padding: "6px 12px", fontSize: "0.75rem", color: "#1D4ED8", display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <Scan size={13} />
            <span><strong>Leitor de código de barras:</strong> aponte para o produto — ele é adicionado automaticamente. Ou digite o código no campo acima e pressione Enter.</span>
          </div>

          {/* Categorias */}
          <div style={{ display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none", paddingBottom: 2 }}>
            {categories.map(cat => (
              <button key={cat} onClick={() => setSelectedCategory(cat)}
                style={{ padding: "5px 14px", borderRadius: 20, border: "none", cursor: "pointer", fontWeight: 600, fontSize: "0.78rem", whiteSpace: "nowrap", fontFamily: "inherit",
                  background: selectedCategory === cat ? "#C62828" : "#F1F5F9",
                  color: selectedCategory === cat ? "#fff" : "#64748B" }}>
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Grid de produtos */}
        <div style={{ flex: 1, overflow: "auto", padding: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(145px, 1fr))", gap: 10 }}>
            {filtered.map(p => {
              const inCart = cart.find(i => i.product.id === p.id);
              return (
                <div key={p.id} onClick={() => addToCart(p)}
                  style={{ background: "#fff", border: `2px solid ${inCart ? "#C62828" : "#E2E8F0"}`, borderRadius: 14, padding: 10, cursor: "pointer", transition: "all 0.15s", position: "relative", userSelect: "none" }}
                  onMouseEnter={e => { if (!inCart) e.currentTarget.style.borderColor = "#FCA5A5"; }}
                  onMouseLeave={e => { if (!inCart) e.currentTarget.style.borderColor = "#E2E8F0"; }}>
                  {inCart && (
                    <div style={{ position: "absolute", top: 6, right: 6, width: 22, height: 22, background: "#C62828", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ color: "#fff", fontSize: "0.7rem", fontWeight: 900 }}>{inCart.qty}</span>
                    </div>
                  )}
                  {p.imageUrl
                    ? <img src={p.imageUrl} alt={p.name} style={{ width: "100%", height: 72, objectFit: "cover", borderRadius: 8, marginBottom: 6 }} />
                    : <div style={{ width: "100%", height: 72, background: "#F1F5F9", borderRadius: 8, marginBottom: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>
                        {p.isCombo ? "🍱" : "🍔"}
                      </div>
                  }
                  <div style={{ fontWeight: 700, fontSize: "0.8rem", marginBottom: 2, lineHeight: 1.2 }}>{p.name}</div>
                  {(p.barcode || p.ean) && (
                    <div style={{ fontSize: "0.65rem", color: "#94A3B8", marginBottom: 2 }}>
                      📦 {p.barcode || p.ean}
                    </div>
                  )}
                  <div style={{ color: "#C62828", fontWeight: 800, fontSize: "0.88rem" }}>{fmt(p.price)}</div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "2rem", color: "#94A3B8" }}>
                Nenhum produto encontrado.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ RIGHT: PEDIDO ═══ */}
      <div style={{ display: "flex", flexDirection: "column", background: "#fff", overflow: "hidden" }}>

        {/* Tipo de pedido */}
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #E2E8F0" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 10 }}>
            {([
              { value: "BALCAO", label: "Balcão", icon: "🏠", color: "#3B82F6" },
              { value: "MESA",   label: "Mesa",   icon: "🍽️", color: "#8B5CF6" },
              { value: "DELIVERY", label: "Delivery", icon: "🛵", color: "#C62828" },
            ] as const).map(t => (
              <button key={t.value} onClick={() => setOrderType(t.value)}
                style={{ padding: "10px 4px", borderRadius: 10, border: `2px solid ${orderType === t.value ? t.color : "#E2E8F0"}`,
                  background: orderType === t.value ? t.color : "#F8FAFC",
                  color: orderType === t.value ? "#fff" : "#64748B",
                  fontWeight: 700, fontSize: "0.8rem", cursor: "pointer", fontFamily: "inherit", textAlign: "center" }}>
                <div style={{ fontSize: 18, marginBottom: 2 }}>{t.icon}</div>
                {t.label}
              </button>
            ))}
          </div>

          {orderType === "MESA" && (
            <input placeholder="Número da mesa *" value={tableNum} onChange={e => setTableNum(e.target.value)}
              style={{ width: "100%", marginBottom: 6, padding: "8px 12px", borderRadius: 8, border: "1.5px solid #8B5CF6", fontSize: "0.9rem", outline: "none", fontFamily: "inherit" }} />
          )}
          {orderType === "DELIVERY" && (
            <input placeholder="Endereço de entrega *" value={address} onChange={e => setAddress(e.target.value)}
              style={{ width: "100%", marginBottom: 6, padding: "8px 12px", borderRadius: 8, border: "1.5px solid #C62828", fontSize: "0.9rem", outline: "none", fontFamily: "inherit" }} />
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            <input placeholder="Nome do cliente" value={customerName} onChange={e => setCustomerName(e.target.value)}
              style={{ padding: "7px 10px", borderRadius: 8, border: "1.5px solid #E2E8F0", fontSize: "0.85rem", outline: "none", fontFamily: "inherit" }} />
            <input placeholder="Telefone" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)}
              style={{ padding: "7px 10px", borderRadius: 8, border: "1.5px solid #E2E8F0", fontSize: "0.85rem", outline: "none", fontFamily: "inherit" }} />
          </div>
        </div>

        {/* Itens do carrinho */}
        <div style={{ flex: 1, overflow: "auto", padding: "8px 16px" }}>
          {cart.length === 0 ? (
            <div style={{ textAlign: "center", padding: "2rem 1rem", color: "#CBD5E1" }}>
              <ShoppingCart size={38} style={{ margin: "0 auto 8px" }} />
              <p style={{ fontSize: "0.82rem" }}>Clique nos produtos ou use o scanner</p>
            </div>
          ) : cart.map(item => (
            <div key={item.product.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderBottom: "1px solid #F1F5F9" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: "0.85rem" }}>{item.product.name}</div>
                <div style={{ fontSize: "0.75rem", color: "#C62828", fontWeight: 700 }}>
                  {fmt(item.product.price)} × {item.qty} = {fmt(item.product.price * item.qty)}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <button onClick={() => updateQty(item.product.id, item.qty - 1)}
                  style={{ width: 26, height: 26, borderRadius: "50%", border: "1.5px solid #E2E8F0", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {item.qty === 1 ? <Trash2 size={12} color="#EF4444" /> : <Minus size={12} />}
                </button>
                <span style={{ width: 22, textAlign: "center", fontWeight: 800, fontSize: "0.9rem" }}>{item.qty}</span>
                <button onClick={() => updateQty(item.product.id, item.qty + 1)}
                  style={{ width: 26, height: 26, borderRadius: "50%", border: "1.5px solid #C62828", background: "#C62828", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Plus size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 16px", borderTop: "1px solid #E2E8F0", background: "#FAFAFA" }}>

          {/* Pagamento */}
          <div style={{ marginBottom: 8 }}>
            <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.4px", display: "block", marginBottom: 4 }}>Forma de Pagamento</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {PAYMENT_METHODS.map(m => (
                <button key={m} onClick={() => setPaymentMethod(m)}
                  style={{ padding: "5px 10px", borderRadius: 8, border: `1.5px solid ${paymentMethod === m ? "#C62828" : "#E2E8F0"}`,
                    background: paymentMethod === m ? "#C62828" : "#fff",
                    color: paymentMethod === m ? "#fff" : "#475569",
                    fontWeight: 600, fontSize: "0.73rem", cursor: "pointer", fontFamily: "inherit" }}>
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Acréscimo voucher */}
          {isVoucher && voucherRate > 0 && (
            <div style={{ background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 8, padding: "6px 10px", marginBottom: 8, fontSize: "0.78rem", color: "#C2410C" }}>
              ⚠️ <strong>Acréscimo voucher: {voucherRate.toFixed(1)}%</strong> = +{fmt(voucherFee)}
            </div>
          )}

          {/* Troco */}
          {paymentMethod === "Dinheiro" && (
            <input type="number" placeholder="Troco para... (R$)" value={change}
              onChange={e => setChange(e.target.value)}
              style={{ width: "100%", marginBottom: 6, padding: "7px 10px", borderRadius: 8, border: "1.5px solid #E2E8F0", fontSize: "0.85rem", outline: "none", fontFamily: "inherit" }} />
          )}
          {troco !== null && (
            <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 8, padding: "6px 10px", marginBottom: 6, fontSize: "0.82rem", color: "#16A34A", fontWeight: 700 }}>
              💵 Troco: {fmt(troco)}
            </div>
          )}

          {/* Observações */}
          <textarea placeholder="Observações do pedido..." value={notes} onChange={e => setNotes(e.target.value)} rows={2}
            style={{ width: "100%", marginBottom: 8, padding: "7px 10px", borderRadius: 8, border: "1.5px solid #E2E8F0", fontSize: "0.82rem", outline: "none", resize: "none", fontFamily: "inherit" }} />

          {/* Total */}
          {cart.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              {subtotal !== total && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "#64748B", marginBottom: 3 }}>
                  <span>Subtotal</span><span>{fmt(subtotal)}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 900, fontSize: "1.15rem" }}>
                <span>TOTAL</span><span style={{ color: "#C62828" }}>{fmt(total)}</span>
              </div>
            </div>
          )}

          {msg && (
            <div style={{ padding: "7px 10px", borderRadius: 8, marginBottom: 8,
              background: msg.startsWith("✅") ? "#f0fdf4" : "#fef2f2",
              color: msg.startsWith("✅") ? "#16a34a" : "#dc2626",
              fontSize: "0.82rem", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
              {msg}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: cart.length > 0 ? "1fr auto" : "1fr", gap: 6 }}>
            <button onClick={handleSubmit} disabled={loading || cart.length === 0}
              style={{ padding: "12px", background: cart.length === 0 ? "#E2E8F0" : "#C62828",
                color: cart.length === 0 ? "#94A3B8" : "#fff", border: "none", borderRadius: 12,
                fontWeight: 900, fontSize: "1rem", cursor: cart.length === 0 ? "not-allowed" : "pointer",
                fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              {loading ? "Registrando..." : <><Check size={18} /> Finalizar Pedido</>}
            </button>
            {cart.length > 0 && (
              <button onClick={clearCart}
                style={{ padding: "12px 14px", background: "#F1F5F9", border: "none", borderRadius: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                title="Limpar pedido">
                <X size={18} color="#64748B" />
              </button>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity:0; transform:translate(-50%,-10px); } to { opacity:1; transform:translate(-50%,0); } }
      `}</style>
    </div>
  );
}
