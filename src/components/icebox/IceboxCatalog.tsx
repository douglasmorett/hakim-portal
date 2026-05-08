"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import { Search, ShoppingCart, Plus, Clock, Phone, MessageCircle, Snowflake, Truck, Shield } from "lucide-react";

const ICEBOX_BLUE = "#1565C0";
const ICEBOX_DARK = "#0D47A1";
const ICEBOX_LIGHT = "#E3F2FD";
const ICEBOX_GRADIENT = "linear-gradient(135deg, #0D47A1 0%, #1976D2 100%)";

export default function IceboxCatalog({ products, deliveryInfo, isLoggedIn, canOrder }: {
  products: any[];
  deliveryInfo: { limitStr: string; deliveryStr: string; limitDateIso?: string };
  isLoggedIn: boolean;
  canOrder: boolean;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const categories = ["Todos", "Congelados", "Resfriados", "Doces", "Embalagens", "Outros"];

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === "Todos" || (p.category === selectedCategory) || (!p.category && selectedCategory === "Outros");
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, selectedCategory]);

  const handleWhatsApp = () => {
    window.open("https://wa.me/5521972947120?text=Olá! Vi o catálogo da Icebox e gostaria de me cadastrar para fazer pedidos.", "_blank");
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F8FAFC", fontFamily: "'Inter', -apple-system, sans-serif" }}>

      {/* ===== HEADER ===== */}
      <header style={{ background: ICEBOX_GRADIENT, padding: "0", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "0.75rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(10px)" }}>
              <Snowflake size={24} color="#fff" />
            </div>
            <div>
              <div style={{ color: "#fff", fontWeight: 800, fontSize: "1.3rem", letterSpacing: "-0.5px", lineHeight: 1.1 }}>Icebox</div>
              <div style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.7rem", fontWeight: 500, letterSpacing: "1px", textTransform: "uppercase" }}>Congelados</div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            {canOrder ? (
              <a href="/store/compras" style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "0.5rem 1.2rem", borderRadius: "10px", background: "#fff", color: ICEBOX_BLUE, fontWeight: 700, fontSize: "0.85rem", textDecoration: "none", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
                <ShoppingCart size={16} /> Fazer Pedido
              </a>
            ) : isLoggedIn ? (
              <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.8rem" }}>Conta sem permissão de compra</span>
            ) : (
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <a href="/login" style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "0.45rem 1rem", borderRadius: "8px", background: "rgba(255,255,255,0.15)", color: "#fff", fontWeight: 600, fontSize: "0.82rem", textDecoration: "none", border: "1px solid rgba(255,255,255,0.3)" }}>
                  Entrar
                </a>
                <button onClick={handleWhatsApp} style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "0.45rem 1rem", borderRadius: "8px", background: "#25D366", color: "#fff", fontWeight: 700, fontSize: "0.82rem", border: "none", cursor: "pointer", boxShadow: "0 2px 8px rgba(37,211,102,0.3)" }}>
                  <MessageCircle size={14} /> Cadastre-se
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ===== HERO BANNER ===== */}
      <div style={{ background: "linear-gradient(135deg, #1565C0 0%, #42A5F5 50%, #90CAF9 100%)", padding: "2.5rem 1.5rem", color: "#fff" }}>
        <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1.5rem" }}>
            <div>
              <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "0.5rem", letterSpacing: "-1px" }}>
                Congelados & Insumos
              </h1>
              <p style={{ fontSize: "1rem", opacity: 0.9, maxWidth: "500px", lineHeight: 1.6 }}>
                Produtos de qualidade para seu negócio. Entrega na região com os melhores preços do mercado.
              </p>
              <div style={{ display: "flex", gap: "1.5rem", marginTop: "1.25rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem" }}>
                  <Truck size={16} /> Entrega própria
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem" }}>
                  <Shield size={16} /> Qualidade garantida
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem" }}>
                  <Snowflake size={16} /> Cadeia de frio
                </div>
              </div>
            </div>
            {canOrder && (
              <div style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(10px)", borderRadius: "14px", padding: "1rem 1.5rem", border: "1px solid rgba(255,255,255,0.2)" }}>
                <div style={{ fontSize: "0.78rem", opacity: 0.8, marginBottom: "4px" }}>Próxima entrega</div>
                <div style={{ fontWeight: 700, fontSize: "1rem" }}>{deliveryInfo.deliveryStr}</div>
                <div style={{ fontSize: "0.75rem", opacity: 0.7, marginTop: "4px" }}>
                  Pedidos até {deliveryInfo.limitStr}
                </div>
                {now && (
                  <div style={{ marginTop: "0.5rem", fontWeight: 700, fontSize: "1.1rem", textAlign: "center" }}>
                    {now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===== SEARCH & FILTER ===== */}
      <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "1.5rem 1.5rem 0" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.5rem" }}>
          <div style={{ position: "relative" }}>
            <Search size={20} style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "#94A3B8" }} />
            <input
              type="text" placeholder="Buscar produtos por nome ou descrição..."
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              style={{ width: "100%", padding: "0.75rem 1rem 0.75rem 3rem", borderRadius: "12px", border: "1.5px solid #E2E8F0", fontSize: "0.95rem", outline: "none", background: "#fff", transition: "border 0.2s" }}
            />
          </div>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {categories.map(cat => (
              <button key={cat} onClick={() => setSelectedCategory(cat)} style={{
                padding: "0.45rem 1.1rem", borderRadius: "20px", fontSize: "0.88rem", fontWeight: 600, cursor: "pointer",
                border: "1.5px solid", borderColor: selectedCategory === cat ? ICEBOX_BLUE : "#E2E8F0",
                backgroundColor: selectedCategory === cat ? ICEBOX_BLUE : "#fff",
                color: selectedCategory === cat ? "#fff" : "#475569",
                transition: "all 0.2s"
              }}>{cat}</button>
            ))}
          </div>
        </div>

        {/* Product count */}
        <div style={{ fontSize: "0.85rem", color: "#94A3B8", marginBottom: "1rem" }}>
          {filteredProducts.length} produto{filteredProducts.length !== 1 ? "s" : ""} encontrado{filteredProducts.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* ===== PRODUCT GRID ===== */}
      <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "0 1.5rem 3rem" }}>
        {filteredProducts.length === 0 ? (
          <div style={{ textAlign: "center", padding: "4rem 1rem", color: "#94A3B8" }}>
            Nenhum produto encontrado para sua busca.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))", gap: "1.25rem" }}>
            {filteredProducts.map(product => (
              <div key={product.id} style={{
                background: "#fff", borderRadius: "14px", border: "1px solid #E8ECF0",
                overflow: "hidden", transition: "all 0.2s",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 24px rgba(0,0,0,0.08)"; (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)"; (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}
              >
                {product.imageUrl ? (
                  <div style={{ position: "relative", width: "100%", height: "200px" }}>
                    <Image src={product.imageUrl} alt={product.name} fill style={{ objectFit: "cover" }} sizes="(max-width: 768px) 100vw, 300px" />
                  </div>
                ) : (
                  <div style={{ width: "100%", height: "200px", backgroundColor: ICEBOX_LIGHT, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Snowflake size={40} color="#90CAF9" />
                  </div>
                )}
                <div style={{ padding: "1.25rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.4rem" }}>
                    <h3 style={{ fontWeight: 700, fontSize: "1.05rem", color: "#1E293B", lineHeight: 1.3 }}>{product.name}</h3>
                    {product.category && (
                      <span style={{ fontSize: "0.68rem", backgroundColor: ICEBOX_LIGHT, color: ICEBOX_BLUE, padding: "2px 8px", borderRadius: "10px", fontWeight: 600, whiteSpace: "nowrap", marginLeft: "8px" }}>{product.category}</span>
                    )}
                  </div>
                  <p style={{ fontSize: "0.82rem", color: "#64748B", marginBottom: "1rem", lineHeight: 1.5 }}>{product.description}</p>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #F1F5F9", paddingTop: "0.75rem" }}>
                    <span style={{ fontWeight: 800, fontSize: "1.2rem", color: ICEBOX_BLUE }}>
                      R$ {product.price.toFixed(2)}
                    </span>
                    {canOrder ? (
                      <a href="/store/compras" style={{
                        display: "inline-flex", alignItems: "center", gap: "4px",
                        padding: "0.5rem 1rem", borderRadius: "10px",
                        background: ICEBOX_GRADIENT, color: "#fff", fontWeight: 700,
                        fontSize: "0.82rem", textDecoration: "none",
                        boxShadow: "0 2px 8px rgba(21,101,192,0.3)"
                      }}>
                        <Plus size={14} /> Pedir
                      </a>
                    ) : (
                      <button onClick={handleWhatsApp} style={{
                        display: "inline-flex", alignItems: "center", gap: "4px",
                        padding: "0.5rem 0.75rem", borderRadius: "10px",
                        background: "#25D366", color: "#fff", fontWeight: 700,
                        fontSize: "0.78rem", border: "none", cursor: "pointer",
                        boxShadow: "0 2px 8px rgba(37,211,102,0.25)"
                      }}>
                        <MessageCircle size={13} /> Cadastre-se
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ===== FOOTER ===== */}
      <footer style={{ background: "#0D47A1", color: "rgba(255,255,255,0.7)", padding: "2rem 1.5rem", textAlign: "center" }}>
        <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
            <Snowflake size={20} color="#fff" />
            <span style={{ color: "#fff", fontWeight: 800, fontSize: "1.1rem" }}>Icebox</span>
            <span style={{ fontSize: "0.8rem" }}>Congelados</span>
          </div>
          <p style={{ fontSize: "0.82rem", marginBottom: "0.5rem" }}>
            Distribuição de congelados e insumos para alimentação
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: "1.5rem", marginTop: "1rem" }}>
            <a href="https://wa.me/5521972947120" target="_blank" style={{ color: "#25D366", textDecoration: "none", display: "flex", alignItems: "center", gap: "4px", fontSize: "0.85rem" }}>
              <Phone size={14} /> WhatsApp
            </a>
          </div>
          <p style={{ fontSize: "0.72rem", marginTop: "1.5rem", opacity: 0.5 }}>
            © {new Date().getFullYear()} Icebox Congelados. Todos os direitos reservados.
          </p>
        </div>
      </footer>

      {/* ===== CTA FLUTUANTE (para não logados) ===== */}
      {!canOrder && (
        <div style={{
          position: "fixed", bottom: "1.25rem", left: "50%", transform: "translateX(-50%)",
          background: "#fff", borderRadius: "16px", padding: "0.75rem 1.5rem",
          boxShadow: "0 8px 30px rgba(0,0,0,0.15)", border: `2px solid ${ICEBOX_BLUE}`,
          display: "flex", alignItems: "center", gap: "1rem", zIndex: 200,
          maxWidth: "calc(100vw - 2rem)"
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#1E293B" }}>Quer comprar nossos produtos?</div>
            <div style={{ fontSize: "0.78rem", color: "#64748B" }}>Cadastre-se com um de nossos consultores</div>
          </div>
          <button onClick={handleWhatsApp} style={{
            display: "inline-flex", alignItems: "center", gap: "6px",
            padding: "0.6rem 1.2rem", borderRadius: "10px",
            background: "#25D366", color: "#fff", fontWeight: 700,
            fontSize: "0.85rem", border: "none", cursor: "pointer",
            boxShadow: "0 2px 8px rgba(37,211,102,0.3)",
            whiteSpace: "nowrap"
          }}>
            <MessageCircle size={15} /> Falar com Consultor
          </button>
        </div>
      )}
    </div>
  );
}
