"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ClipboardList, Store, Users, ShoppingBag, ExternalLink, LogOut } from "lucide-react";

const NAV_ITEMS = [
  { href: "/store", label: "Início", icon: Home },
  { href: "/store/pedidos-clientes", label: "Pedidos", icon: ClipboardList, highlight: true },
  { href: "/store/venda-presencial", label: "Venda", icon: ShoppingBag },
  { href: "/store/minha-loja", label: "Minha Loja", icon: Store },
  { href: "/store/profile", label: "Perfil", icon: Users },
];

// Icebox brand colors
const ICEBOX_BLUE = "#1565C0";
const ICEBOX_BLUE_DARK = "#0D47A1";
const ICEBOX_BLUE_LIGHT = "#1976D2";

export default function StoreTopNav({ userName, userCity, userSlug, isFranqueado }: { userName: string; userCity: string; userSlug?: string | null; isFranqueado: boolean }) {
  const pathname = usePathname();
  const isCompras = pathname?.startsWith("/store/compras");
  const storeUrl = userSlug ? `https://hakim-portal.vercel.app/loja/${userSlug}` : null;

  return (
    <>
      <div style={{ background: isCompras ? `linear-gradient(135deg, ${ICEBOX_BLUE_DARK} 0%, ${ICEBOX_BLUE} 100%)` : "linear-gradient(135deg, #C62828 0%, #B71C1C 100%)", padding: "0.5rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {isCompras ? (
            <>
              <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                  <line x1="12" y1="22.08" x2="12" y2="12" />
                </svg>
              </div>
              <div>
                <span style={{ color: "#fff", fontWeight: 800, fontSize: "1.15rem", letterSpacing: "-0.5px" }}>Icebox</span>
                <span style={{ color: "rgba(255,255,255,0.7)", fontWeight: 500, fontSize: "0.75rem", marginLeft: "6px" }}>Congelados</span>
              </div>
            </>
          ) : (
            <>
              <Link href="/firehub" style={{ display: "flex", alignItems: "center", gap: "8px", textDecoration: "none" }}>
                <div style={{ width: "34px", height: "34px", borderRadius: "8px", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2C12 2 7 7.5 7 12.5C7 15.5 9.2 18 12 18C14.8 18 17 15.5 17 12.5C17 10.5 15.5 8.5 15.5 8.5C15.5 8.5 15 11 13 11C13 11 14 8 12 2Z" fill="#FF6B35"/>
                    <path d="M12 18C12 18 9 16 9 13C9 13 10.5 14.5 12 14.5C13.5 14.5 15 13 15 13C15 16 12 18 12 18Z" fill="#fff" opacity="0.8"/>
                  </svg>
                </div>
                <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
                  <span style={{ color: "#fff", fontWeight: 900, fontSize: "1.1rem", letterSpacing: "-0.5px", fontFamily: "'Inter', sans-serif" }}>
                    Fire<span style={{ color: "#FF6B35" }}>Hub</span>
                  </span>
                  <span style={{ color: "rgba(255,255,255,0.65)", fontWeight: 500, fontSize: "0.62rem", letterSpacing: "0.5px", textTransform: "uppercase" }}>Sistema de Pedidos</span>
                </div>
              </Link>
            </>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          {isFranqueado && (
            <a href="/store/compras" style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "0.4rem 1rem", borderRadius: "8px", background: isCompras ? "rgba(255,255,255,0.2)" : "#FF8A00", color: "#fff", fontWeight: 700, fontSize: "0.82rem", textDecoration: "none", boxShadow: isCompras ? "none" : "0 2px 8px rgba(255,138,0,0.4)" }}>
              <ShoppingBag size={15} /> {isCompras ? "Comprando..." : "Fazer Compras"}
            </a>
          )}
          {storeUrl && (
            <a href={storeUrl} target="_blank" style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "0.4rem 0.75rem", borderRadius: "8px", background: "rgba(255,255,255,0.15)", color: "#fff", fontWeight: 600, fontSize: "0.78rem", textDecoration: "none", border: "1px solid rgba(255,255,255,0.25)" }}>
              <ExternalLink size={13} /> Ver Loja
            </a>
          )}
          <div style={{ color: "rgba(255,255,255,0.85)", fontSize: "0.78rem", padding: "0 0.5rem" }}>{userName} • {userCity}</div>
          <a href="/api/auth/signout" style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "0.4rem 0.65rem", borderRadius: "8px", background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.85)", fontSize: "0.78rem", textDecoration: "none", border: "1px solid rgba(255,255,255,0.2)" }}>
            <LogOut size={13} /> Sair
          </a>
        </div>
      </div>
      <nav style={{ background: "#fff", borderBottom: `2px solid ${isCompras ? "#E3F2FD" : "#E2E8F0"}`, padding: "0 1.5rem", position: "sticky", top: 0, zIndex: 50, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        <div style={{ maxWidth: "1400px", margin: "0 auto", display: "flex", alignItems: "stretch", gap: "0", overflowX: "auto", scrollbarWidth: "none" }}>
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const active = item.href === "/store" ? pathname === "/store" : pathname?.startsWith(item.href);
            const activeColor = isCompras ? ICEBOX_BLUE : "#C62828";
            return (
              <Link key={item.href} href={item.href} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "0.75rem 1.1rem", fontSize: "0.85rem", fontWeight: active ? 700 : 500, color: active ? activeColor : "#475569", textDecoration: "none", borderBottom: active ? `3px solid ${activeColor}` : "3px solid transparent", whiteSpace: "nowrap" }}>
                <Icon size={16} /> {item.label}
                {item.highlight && <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: activeColor, display: "inline-block" }} />}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
