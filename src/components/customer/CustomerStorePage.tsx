"use client";
import { useState, useRef, useEffect } from "react";
import { ShoppingCart, Plus, Minus, X, MapPin, Search, Clock, Store, Truck } from "lucide-react";
import ComboModal from "./ComboModal";
import "./store.css";

type MenuProduct = { id: string; name: string; description: string; price: number; imageUrl: string | null; category: string; isCombo?: boolean; comboConfig?: any; comboGroups?: any[] };
type CartItem = MenuProduct & { quantity: number; comboSelections?: any };
type Franchisee = { id: string; name: string; storeName: string | null; storePhone: string | null; storeAddress: string | null; storeBanner: string | null; storeLogo?: string | null; storeHours?: any; storeDeliveryOnly?: boolean; city: string | null; slug: string | null };

function isStoreOpen(hours: any[]): { open: boolean; text: string } {
  if (!hours || !Array.isArray(hours)) return { open: true, text: "Horário não definido" };
  const now = new Date();
  const dayIdx = now.getDay() === 0 ? 6 : now.getDay() - 1;
  const today = hours[dayIdx];
  if (!today || !today.active) return { open: false, text: "Fechado hoje" };
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const [oh, om] = today.open.split(":").map(Number);
  const [ch, cm] = today.close.split(":").map(Number);
  if (nowMin >= oh * 60 + om && nowMin <= ch * 60 + cm) return { open: true, text: `Aberto até as ${today.close}` };
  if (nowMin < oh * 60 + om) return { open: false, text: `Abre às ${today.open}` };
  return { open: false, text: "Fechado · Abre amanhã" };
}

export default function CustomerStorePage({ franchisee, menuProducts }: { franchisee: Franchisee; menuProducts: MenuProduct[] }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCheckout, setIsCheckout] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [searchTerm, setSearchTerm] = useState("");
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [comboProduct, setComboProduct] = useState<MenuProduct | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [deliveryType, setDeliveryType] = useState("DELIVERY");
  const [notes, setNotes] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [couponApplied, setCouponApplied] = useState<{ code: string; discount: number } | null>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const storeName = franchisee.storeName || franchisee.name;
  const storeStatus = isStoreOpen(franchisee.storeHours as any);
  const categories = ["Todos", ...Array.from(new Set(menuProducts.map(p => p.category)))];

  const filtered = menuProducts.filter(p => {
    const mc = selectedCategory === "Todos" || p.category === selectedCategory;
    const ms = !searchTerm || p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.description?.toLowerCase().includes(searchTerm.toLowerCase());
    return mc && ms;
  });
  const grouped: Record<string, MenuProduct[]> = {};
  filtered.forEach(p => { if (!grouped[p.category]) grouped[p.category] = []; grouped[p.category].push(p); });

  const cartTotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const discount = couponApplied ? couponApplied.discount : 0;
  const finalTotal = Math.max(0, cartTotal - discount);
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  const addToCart = (product: MenuProduct, cs?: any) => {
    if (product.isCombo && (product.comboGroups?.length || product.comboConfig) && !cs) { setComboProduct(product); return; }
    setCart(prev => {
      if (cs) return [...prev, { ...product, id: product.id + '_' + Date.now(), quantity: 1, comboSelections: cs }];
      const ex = prev.find(i => i.id === product.id);
      if (ex) return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...product, quantity: 1 }];
    });
  };
  const removeFromCart = (id: string) => setCart(prev => { const e = prev.find(i => i.id === id); if (e && e.quantity > 1) return prev.map(i => i.id === id ? { ...i, quantity: i.quantity - 1 } : i); return prev.filter(i => i.id !== id); });
  const deleteFromCart = (id: string) => setCart(prev => prev.filter(i => i.id !== id));
  const getQty = (id: string) => cart.find(i => i.id === id)?.quantity || 0;

  const scrollToCategory = (cat: string) => {
    setSelectedCategory(cat);
    if (cat !== "Todos" && sectionRefs.current[cat]) {
      sectionRefs.current[cat]!.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    try {
      const res = await fetch(`/api/validate-coupon?code=${couponCode}&franchiseeId=${franchisee.id}`);
      if (res.ok) { const d = await res.json(); setCouponApplied({ code: couponCode, discount: d.discount || 0 }); }
      else { alert("Cupom inválido."); setCouponApplied(null); }
    } catch { setCouponApplied({ code: couponCode, discount: 5 }); }
  };

  const handleCheckout = async () => {
    if (!customerName || !customerPhone) { alert("Preencha nome e telefone."); return; }
    if (deliveryType === "DELIVERY" && !customerAddress) { alert("Preencha o endereço."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/customer-order", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ franchiseeSlug: franchisee.slug, customerName, customerPhone, customerAddress: deliveryType === "DELIVERY" ? customerAddress : null, deliveryType, notes, couponCode: couponApplied?.code || null, items: cart.map(i => ({ menuProductId: i.id.split('_')[0], quantity: i.quantity, comboSelections: i.comboSelections || null })) })
      });
      if (res.ok) { const d = await res.json(); setOrderSuccess(d.orderId); setCart([]); setIsCheckout(false); setMobileCartOpen(false); }
      else { const d = await res.json(); alert(d.error || "Erro."); }
    } catch { alert("Erro ao conectar."); } finally { setLoading(false); }
  };

  // ===== ORDER SUCCESS SCREEN =====
  if (orderSuccess) return (
    <div className="order-success-bg">
      <div className="order-success-card">
        <div className="order-success-icon">✅</div>
        <h1 className="order-success-title">Pedido Enviado!</h1>
        <p className="order-success-sub">Pedido recebido por <strong>{storeName}</strong>.</p>
        <div className="order-code-box">
          <p className="order-code-label">Código do Pedido</p>
          <p className="order-code">#{orderSuccess.slice(-6).toUpperCase()}</p>
        </div>
        {franchisee.storePhone && <a href={`https://wa.me/55${franchisee.storePhone.replace(/\D/g, "")}`} target="_blank" className="order-whatsapp">💬 Acompanhar no WhatsApp</a>}
        <button onClick={() => setOrderSuccess(null)} className="order-new-btn">Fazer Novo Pedido</button>
      </div>
    </div>
  );

  // ===== CART SIDEBAR CONTENT =====
  const CartContent = () => (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div className="cart-header">
        <h3>{isCheckout ? "Finalizar Pedido" : `Sua Sacola (${cartCount})`}</h3>
        <button className="mob-close-btn" onClick={() => setMobileCartOpen(false)} style={{ cursor: "pointer", background: "none", border: "none" }}><X size={22} /></button>
      </div>
      <div className="cart-body">
        {!isCheckout ? (
          cart.length === 0 ? (
            <div className="cart-empty"><ShoppingCart size={40} /><p>Sacola vazia</p><p style={{ fontSize: "0.8rem" }}>Adicione itens do cardápio</p></div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {cart.map(item => (
                <div key={item.id} className="cart-item">
                  <div style={{ flex: 1 }}>
                    <p className="cart-item-name">{item.name}</p>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "4px" }}>
                      <button onClick={() => removeFromCart(item.id)} className="qty-btn-minus" style={{ width: 24, height: 24 }}><Minus size={12} /></button>
                      <span style={{ fontWeight: 700, fontSize: "0.85rem" }}>{item.quantity}</span>
                      <button onClick={() => addToCart(item)} className="qty-btn-plus" style={{ width: 24, height: 24 }}><Plus size={12} /></button>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p className="cart-item-price">R$ {(item.price * item.quantity).toFixed(2)}</p>
                    <button onClick={() => deleteFromCart(item.id)} className="cart-item-remove">remover</button>
                  </div>
                </div>
              ))}
              {/* COUPON */}
              <div style={{ marginTop: "0.5rem" }}>
                <div className="coupon-row">
                  <input className="coupon-input" placeholder="Cupom de desconto" value={couponCode} onChange={e => setCouponCode(e.target.value)} />
                  <button className="coupon-btn" onClick={applyCoupon}>Aplicar</button>
                </div>
                {couponApplied && <p style={{ fontSize: "0.78rem", color: "#16A34A", fontWeight: 600 }}>✅ Cupom "{couponApplied.code}" aplicado! -R$ {couponApplied.discount.toFixed(2)}</p>}
              </div>
            </div>
          )
        ) : (
          <div className="checkout-form">
            <div><label className="checkout-label">Seu Nome *</label><input className="checkout-input" value={customerName} onChange={e => setCustomerName(e.target.value)} /></div>
            <div><label className="checkout-label">WhatsApp *</label><input className="checkout-input" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="(21) 99999-9999" /></div>
            <div>
              <label className="checkout-label">Tipo de Pedido</label>
              <div className="checkout-type-row">
                <button onClick={() => setDeliveryType("DELIVERY")} className={`checkout-type-btn ${deliveryType === "DELIVERY" ? "active" : ""}`}>🛵 Entrega</button>
                <button onClick={() => setDeliveryType("PICKUP")} className={`checkout-type-btn ${deliveryType === "PICKUP" ? "active" : ""}`}>🏪 Retirada</button>
              </div>
            </div>
            {deliveryType === "DELIVERY" && <div><label className="checkout-label">Endereço de Entrega *</label><input className="checkout-input" value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} /></div>}
            <div><label className="checkout-label">Observações</label><textarea rows={2} className="checkout-input" style={{ resize: "vertical" }} value={notes} onChange={e => setNotes(e.target.value)} /></div>
            <div className="checkout-summary">
              {cart.map(i => <div key={i.id} className="checkout-summary-item"><span>{i.quantity}x {i.name}</span><span>R$ {(i.price * i.quantity).toFixed(2)}</span></div>)}
              {couponApplied && <div className="checkout-summary-item" style={{ color: "#16A34A" }}><span>Cupom ({couponApplied.code})</span><span>-R$ {couponApplied.discount.toFixed(2)}</span></div>}
            </div>
          </div>
        )}
      </div>
      {cart.length > 0 && (
        <div className="cart-footer">
          <div className="cart-total-row"><span className="cart-total-label">Total</span><span className="cart-total-value">R$ {finalTotal.toFixed(2)}</span></div>
          {!isCheckout ? (
            <button onClick={() => setIsCheckout(true)} className="cart-checkout-btn">Continuar</button>
          ) : (
            <>
              <button onClick={handleCheckout} disabled={loading} className="cart-checkout-btn">{loading ? "Enviando..." : `Enviar Pedido • R$ ${finalTotal.toFixed(2)}`}</button>
              <button onClick={() => setIsCheckout(false)} className="cart-back-btn">← Voltar à Sacola</button>
            </>
          )}
        </div>
      )}
    </div>
  );

  // ===== MAIN RENDER =====
  return (
    <div className="saipos-store">
      {/* BANNER */}
      {franchisee.storeBanner && (
        <div className="store-banner">
          <img src={franchisee.storeBanner} alt={storeName} />
          <div className="store-banner-overlay" />
        </div>
      )}

      {/* STORE HEADER */}
      <div className="store-header">
        <div className="store-header-inner">
          {franchisee.storeLogo ? (
            <img src={franchisee.storeLogo} alt="Logo" className="store-logo" />
          ) : (
            <div className="store-logo-placeholder"><Store size={28} color="white" /></div>
          )}
          <div className="store-info">
            <h1 className="store-name">{storeName}</h1>
            {franchisee.storeAddress && (
              <div className="store-address"><MapPin size={13} /><span>{franchisee.storeAddress}</span></div>
            )}
            <div className="store-meta">
              <span className={`store-status ${storeStatus.open ? "open" : "closed"}`}>
                <Clock size={12} /> {storeStatus.text}
              </span>
              {franchisee.storeDeliveryOnly && (
                <span className="store-delivery-tag">• Somente Delivery</span>
              )}
            </div>
          </div>
          <button className="header-cart-btn" onClick={() => setMobileCartOpen(true)}>
            <ShoppingCart size={18} />{cartCount > 0 && <span style={{ fontWeight: 700, fontSize: "0.85rem" }}>{cartCount}</span>}
          </button>
        </div>
      </div>

      {/* SEARCH */}
      <div className="store-search-bar">
        <div className="store-search-inner">
          <div className="store-search-wrap">
            <Search size={18} />
            <input type="text" className="store-search-input" placeholder="Buscar no cardápio..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
        </div>
      </div>

      {/* CATEGORY TABS */}
      <div className="store-cats">
        {categories.map(c => (
          <button key={c} onClick={() => scrollToCategory(c)} className={`store-cat-btn ${selectedCategory === c ? "active" : ""}`}>{c}</button>
        ))}
      </div>

      {/* CONTENT */}
      <div className="store-content">
        <div className="store-products">
          {Object.keys(grouped).length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem 0", color: "#94A3B8" }}>Nenhum item encontrado.</div>
          ) : Object.entries(grouped).map(([cat, prods]) => (
            <div key={cat} className="store-section" ref={el => { sectionRefs.current[cat] = el; }}>
              <h2 className="store-section-title">{cat}</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {prods.map(p => { const q = getQty(p.id); return (
                  <div key={p.id} className={`product-card ${q > 0 ? "in-cart" : ""}`} onClick={() => p.isCombo ? setComboProduct(p) : q === 0 && addToCart(p)}>
                    {p.imageUrl && <img src={p.imageUrl} alt="" className="product-img" />}
                    <div className="product-info">
                      <div className="product-name">
                        {p.name}
                        {p.isCombo && <span className="product-combo-tag">COMBO</span>}
                      </div>
                      {p.description && <p className="product-desc">{p.description}</p>}
                      <p className="product-price">
                        {p.isCombo && <span className="product-price-from">A partir de </span>}
                        R$ {p.price.toFixed(2)}
                      </p>
                    </div>
                    <div className="product-actions">
                      {q === 0 ? (
                        <button className="add-btn" onClick={e => { e.stopPropagation(); p.isCombo ? setComboProduct(p) : addToCart(p); }}><Plus size={18} /></button>
                      ) : (
                        <div className="qty-controls">
                          <button className="qty-btn-minus" onClick={e => { e.stopPropagation(); removeFromCart(p.id); }}><Minus size={14} /></button>
                          <span className="qty-num">{q}</span>
                          <button className="qty-btn-plus" onClick={e => { e.stopPropagation(); addToCart(p); }}><Plus size={14} /></button>
                        </div>
                      )}
                    </div>
                  </div>
                ); })}
              </div>
            </div>
          ))}
        </div>

        {/* DESKTOP CART SIDEBAR */}
        <div className="desk-cart"><CartContent /></div>
      </div>

      {/* MOBILE BOTTOM BAR */}
      {cartCount > 0 && !mobileCartOpen && (
        <div className="mob-bar">
          <button className="mob-bar-btn" onClick={() => setMobileCartOpen(true)}>
            <span>🛒 Sacola ({cartCount})</span>
            <span>R$ {finalTotal.toFixed(2)}</span>
          </button>
        </div>
      )}

      {/* MOBILE CART BOTTOM SHEET */}
      {mobileCartOpen && (
        <div className="mob-cart-overlay" onClick={() => setMobileCartOpen(false)}>
          <div className="mob-cart-sheet" onClick={e => e.stopPropagation()}>
            <CartContent />
          </div>
        </div>
      )}

      {/* COMBO MODAL */}
      {comboProduct && comboProduct.isCombo && (comboProduct.comboGroups?.length || comboProduct.comboConfig) && (
        <ComboModal product={{ id: comboProduct.id, name: comboProduct.name, price: comboProduct.price, imageUrl: comboProduct.imageUrl, comboGroups: comboProduct.comboGroups || [] }} onClose={() => setComboProduct(null)} onConfirm={s => { addToCart(comboProduct, s); setComboProduct(null); }} />
      )}
    </div>
  );
}
