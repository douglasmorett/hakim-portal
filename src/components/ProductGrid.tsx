"use client";

import { useCart } from "./CartProvider";
import { Plus, Info, Clock, Search } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import Image from "next/image";

export default function ProductGrid({ products, deliveryInfo }: { products: any[], deliveryInfo: { limitStr: string, deliveryStr: string, limitDateIso?: string } }) {
  const { addToCart } = useCart();
  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("Todos");
  
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const limitDate = deliveryInfo.limitDateIso ? new Date(deliveryInfo.limitDateIso) : null;
  const remainingMs = limitDate && now ? limitDate.getTime() - now.getTime() : 0;
  const isWarning = remainingMs > 0 && remainingMs <= 5 * 60 * 1000;
  const minutes = Math.floor(remainingMs / 60000);
  const seconds = Math.floor((remainingMs % 60000) / 1000);

  const handleAdd = (product: any) => {
    addToCart(product, 1);
    setAddedIds(prev => ({ ...prev, [product.id]: true }));
    setTimeout(() => {
      setAddedIds(prev => ({ ...prev, [product.id]: false }));
    }, 1000);
  };

  const categories = ["Todos", "Congelados", "Resfriados", "Doces", "Embalagens", "Outros"];

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            p.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === "Todos" || (p.category === selectedCategory) || (!p.category && selectedCategory === "Outros");
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, selectedCategory]);

  return (
    <div className="container">
      {/* Banner de Entrega */}
      <div style={{
        backgroundColor: "var(--primary-light)",
        borderLeft: "4px solid var(--primary)",
        padding: "1rem 1.5rem",
        borderRadius: "var(--radius-md)",
        marginBottom: "2rem",
        display: "flex",
        alignItems: "center",
        gap: "1rem"
      }}>
        <Clock color="var(--primary)" size={24} />
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <h3 style={{ color: "var(--primary)", fontWeight: "bold", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                Atenção ao prazo de entrega
              </h3>
              <p style={{ color: "var(--text-main)", fontSize: "0.95rem" }}>
                Fechando o pedido até <strong>{deliveryInfo.limitStr}</strong>, sua entrega será feita na <strong>{deliveryInfo.deliveryStr}</strong>.
              </p>
            </div>
            {now && (
              <div style={{ backgroundColor: "white", padding: "0.5rem 1rem", borderRadius: "8px", fontWeight: "bold", color: "var(--primary)", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
                Hora Atual: {now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </div>
            )}
          </div>
          
          {isWarning && (
            <div style={{ 
              marginTop: "1rem", 
              padding: "0.8rem", 
              backgroundColor: "var(--danger)", 
              color: "white", 
              borderRadius: "8px", 
              fontWeight: "bold",
              animation: "pulse 1.5s infinite"
            }}>
              🚨 Faltam apenas {minutes}m e {seconds}s! Faça seu pedido rápido para entrar na próxima rota! Se passar do horário irá para a rota seguinte.
            </div>
          )}
        </div>
      </div>
      <style>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.8; }
          100% { opacity: 1; }
        }
      `}</style>

      {/* Filtros e Busca */}
      <div style={{ marginBottom: "2rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div style={{ position: "relative" }}>
          <Search size={20} style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input 
            type="text" 
            placeholder="Buscar produtos por nome ou descrição..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field"
            style={{ paddingLeft: "3rem", backgroundColor: "var(--surface-1)" }}
          />
        </div>
        
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: "0.4rem 1rem",
                borderRadius: "20px",
                fontSize: "0.9rem",
                fontWeight: "600",
                cursor: "pointer",
                border: "1px solid",
                borderColor: selectedCategory === cat ? "var(--primary)" : "var(--border-color)",
                backgroundColor: selectedCategory === cat ? "var(--primary)" : "transparent",
                color: selectedCategory === cat ? "white" : "var(--text-main)",
                transition: "all 0.2s"
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {filteredProducts.length === 0 && (
        <div style={{ textAlign: "center", padding: "4rem 1rem", color: "var(--text-muted)" }}>
          Nenhum produto encontrado para sua busca.
        </div>
      )}

      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", 
        gap: "1.5rem" 
      }}>
        {filteredProducts.map(product => (
          <div key={product.id} className="card" style={{ display: "flex", flexDirection: "column", padding: "1.5rem" }}>
            {product.imageUrl ? (
              <div style={{ position: "relative", width: "100%", height: "200px", marginBottom: "1rem" }}>
                <Image src={product.imageUrl} alt={product.name} fill style={{ objectFit: "cover", borderRadius: "var(--radius-sm)" }} sizes="(max-width: 768px) 100vw, 300px" />
              </div>
            ) : (
              <div style={{ width: "100%", height: "200px", backgroundColor: "#f1f5f9", borderRadius: "var(--radius-sm)", marginBottom: "1rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <PackageIcon />
              </div>
            )}
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
              <h3 className="font-bold" style={{ fontSize: "1.1rem" }}>{product.name}</h3>
              {product.category && (
                <span style={{ fontSize: "0.7rem", backgroundColor: "var(--surface-2)", color: "var(--text-muted)", padding: "0.2rem 0.5rem", borderRadius: "10px", fontWeight: "bold" }}>
                  {product.category}
                </span>
              )}
            </div>
            <p className="text-muted" style={{ fontSize: "0.85rem", flex: 1, marginBottom: "1rem" }}>{product.description}</p>
            
            <div className="flex justify-between items-center mt-auto" style={{ borderTop: "1px solid var(--border-color)", paddingTop: "1rem" }}>
              <span className="font-extrabold gradient-text" style={{ fontSize: "1.25rem" }}>
                R$ {product.price.toFixed(2)}
              </span>
              <button 
                className="btn btn-primary" 
                style={{ padding: "0.5rem 1rem", fontSize: "0.9rem" }}
                onClick={() => handleAdd(product)}
              >
                {addedIds[product.id] ? "Adicionado!" : <><Plus size={16} /> Adicionar</>}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PackageIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}
