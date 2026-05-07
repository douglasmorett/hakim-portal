"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ClipboardList, Store, Users, ShoppingBag, ExternalLink, LogOut } from "lucide-react";

const NAV_ITEMS = [
  { href: "/store", label: "Início", icon: Home },
  { href: "/store/pedidos-clientes", label: "Pedidos", icon: ClipboardList, highlight: true },
  { href: "/store/minha-loja", label: "Minha Loja", icon: Store },
  { href: "/store/profile", label: "Perfil", icon: Users },
];

export default function StoreTopNav({ userName, userCity, userSlug, isFranqueado }: { userName: string; userCity: string; userSlug?: string | null; isFranqueado: boolean }) {
  const pathname = usePathname();
  const storeUrl = userSlug ? `https://hakim-portal.vercel.app/loja/${userSlug}` : null;

  return (
    <>
      <div style={{ background: "linear-gradient(135deg, #C62828 0%, #B71C1C 100%)", padding: "0.5rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <img src="/logo.png" alt="Hakim" style={{ height: "36px", borderRadius: "6px" }} />
          <span style={{ color: "#fff", fontWeight: 800, fontSize: "1.1rem", letterSpacing: "-0.5px" }}>Hakim Portal</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          {isFranqueado && (
            <a href="/store/compras" target="_blank" style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "0.4rem 1rem", borderRadius: "8px", background: "#FF8A00", color: "#fff", fontWeight: 700, fontSize: "0.82rem", textDecoration: "none", boxShadow: "0 2px 8px rgba(255,138,0,0.4)" }}>
              <ShoppingBag size={15} /> Fazer Compras
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
      <nav style={{ background: "#fff", borderBottom: "2px solid #E2E8F0", padding: "0 1.5rem", position: "sticky", top: 0, zIndex: 50, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        <div style={{ maxWidth: "1400px", margin: "0 auto", display: "flex", alignItems: "stretch", gap: "0", overflowX: "auto", scrollbarWidth: "none" }}>
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const active = item.href === "/store" ? pathname === "/store" : pathname?.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "0.75rem 1.1rem", fontSize: "0.85rem", fontWeight: active ? 700 : 500, color: active ? "#C62828" : "#475569", textDecoration: "none", borderBottom: active ? "3px solid #C62828" : "3px solid transparent", whiteSpace: "nowrap" }}>
                <Icon size={16} /> {item.label}
                {item.highlight && <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#C62828", display: "inline-block" }} />}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
