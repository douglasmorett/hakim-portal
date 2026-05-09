"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, ClipboardList, Store, Users, ShoppingBag, ExternalLink, LogOut, UtensilsCrossed, Bike } from "lucide-react";
import { useState, useTransition } from "react";

const NAV_ITEMS = [
  { href: "/store", label: "Início", icon: Home },
  { href: "/store/pedidos-clientes", label: "Pedidos", icon: ClipboardList, highlight: true },
  { href: "/store/venda-presencial", label: "PDV", icon: ShoppingBag },
  { href: "/store/cardapio", label: "Cardápio", icon: UtensilsCrossed },
  { href: "/store/motoboys", label: "Motoboys", icon: Bike },
  { href: "/store/minha-loja", label: "Minha Loja", icon: Store },
  { href: "/store/profile", label: "Perfil", icon: Users },
];

export default function StoreTopNav({
  userName, userCity, userSlug, isFranqueado,
  initialStoreOpen = true, initialCashOpen = false,
}: {
  userName: string; userCity: string; userSlug?: string | null;
  isFranqueado: boolean; initialStoreOpen?: boolean; initialCashOpen?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const isCompras = pathname?.startsWith("/store/compras");
  const storeUrl = userSlug ? `https://hakim-portal.vercel.app/loja/${userSlug}` : null;

  const [storeOpen, setStoreOpen] = useState(initialStoreOpen);
  const [cashOpen, setCashOpen] = useState(initialCashOpen);
  const [toggling, setToggling] = useState<"store" | "cash" | null>(null);

  const toggle = async (type: "store" | "cash") => {
    setToggling(type);
    const newVal = type === "store" ? !storeOpen : !cashOpen;
    try {
      const res = await fetch("/api/store/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(type === "store" ? { storeOpen: newVal } : { cashOpen: newVal }),
      });
      if (res.ok) {
        if (type === "store") setStoreOpen(newVal);
        else setCashOpen(newVal);
        startTransition(() => router.refresh());
      }
    } finally { setToggling(null); }
  };

  const ToggleBtn = ({ type, label, isOn }: { type: "store" | "cash"; label: string; isOn: boolean }) => (
    <button
      onClick={() => toggle(type)}
      disabled={toggling === type}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "6px 12px", borderRadius: 20,
        border: `1.5px solid ${isOn ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.25)"}`,
        background: isOn ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)",
        color: "#fff", fontWeight: 700, fontSize: "0.75rem", cursor: "pointer",
        transition: "all 0.2s", fontFamily: "inherit",
        opacity: toggling === type ? 0.6 : 1,
      }}
    >
      {/* Toggle switch visual */}
      <span style={{
        display: "inline-block", width: 28, height: 15, borderRadius: 8,
        background: isOn ? "#4ADE80" : "#64748B",
        position: "relative", transition: "background 0.2s",
      }}>
        <span style={{
          position: "absolute", top: 2,
          left: isOn ? 15 : 2,
          width: 11, height: 11, borderRadius: "50%",
          background: "#fff", transition: "left 0.2s",
        }} />
      </span>
      {label} {isOn ? "aberto" : "fechado"}
    </button>
  );

  return (
    <>
      {/* Barra de status: loja fechada */}
      {!storeOpen && (
        <div style={{ background: "#EF4444", color: "#fff", textAlign: "center", padding: "6px", fontSize: "0.82rem", fontWeight: 700 }}>
          🔴 LOJA FECHADA — Clientes não conseguem fazer pedidos no momento
        </div>
      )}

      <div style={{
        background: isCompras
          ? "linear-gradient(135deg, #0D47A1 0%, #1565C0 100%)"
          : "linear-gradient(135deg, #B71C1C 0%, #C62828 100%)",
        padding: "0.5rem 1.5rem",
        display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem"
      }}>
        {/* LOGO */}
        <div style={{ display: "flex", alignItems: "center", gap: "1.2rem" }}>
          <Link href="/firehub" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <img
              src="/firehub-icon.png"
              alt="FireHub"
              style={{ width: 36, height: 36, borderRadius: 8, objectFit: "cover", flexShrink: 0 }}
            />
            <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
              <span style={{ color: "#fff", fontWeight: 900, fontSize: "1.1rem", letterSpacing: "-0.5px" }}>
                Fire<span style={{ color: "#FF6B35" }}>Hub</span>
              </span>
              <span style={{ color: "rgba(255,255,255,0.65)", fontWeight: 500, fontSize: "0.6rem", letterSpacing: "0.5px", textTransform: "uppercase" }}>Sistema de Pedidos</span>
            </div>
          </Link>

          {/* Toggles de status ao lado da logo */}
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <ToggleBtn type="cash" label="Caixa" isOn={cashOpen} />
            <ToggleBtn type="store" label="Loja" isOn={storeOpen} />
          </div>
        </div>

        {/* Ações direita */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          {isFranqueado && (
            <a href="/store/compras" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "0.4rem 1rem", borderRadius: 8, background: isCompras ? "rgba(255,255,255,0.2)" : "#FF8A00", color: "#fff", fontWeight: 700, fontSize: "0.82rem", textDecoration: "none", boxShadow: isCompras ? "none" : "0 2px 8px rgba(255,138,0,0.4)" }}>
              <ShoppingBag size={15} /> {isCompras ? "Comprando..." : "Fazer Compras"}
            </a>
          )}
          {storeUrl && (
            <a href={storeUrl} target="_blank" style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "0.4rem 0.75rem", borderRadius: 8, background: "rgba(255,255,255,0.15)", color: "#fff", fontWeight: 600, fontSize: "0.78rem", textDecoration: "none", border: "1px solid rgba(255,255,255,0.25)" }}>
              <ExternalLink size={13} /> Ver Loja
            </a>
          )}
          <div style={{ color: "rgba(255,255,255,0.85)", fontSize: "0.78rem", padding: "0 0.5rem" }}>{userName} • {userCity}</div>
          <a href="/api/auth/signout" style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "0.4rem 0.65rem", borderRadius: 8, background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.85)", fontSize: "0.78rem", textDecoration: "none", border: "1px solid rgba(255,255,255,0.2)" }}>
            <LogOut size={13} /> Sair
          </a>
        </div>
      </div>

      {/* NAV */}
      <nav style={{ background: "#fff", borderBottom: "2px solid #E2E8F0", padding: "0 1.5rem", position: "sticky", top: 0, zIndex: 50, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        <div style={{ maxWidth: "1400px", margin: "0 auto", display: "flex", alignItems: "stretch", gap: 0, overflowX: "auto", scrollbarWidth: "none" }}>
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const active = item.href === "/store" ? pathname === "/store" : pathname?.startsWith(item.href);
            const activeColor = "#C62828";
            return (
              <Link key={item.href} href={item.href} style={{ display: "flex", alignItems: "center", gap: 6, padding: "0.75rem 1.1rem", fontSize: "0.85rem", fontWeight: active ? 700 : 500, color: active ? activeColor : "#475569", textDecoration: "none", borderBottom: active ? `3px solid ${activeColor}` : "3px solid transparent", whiteSpace: "nowrap" }}>
                <Icon size={16} /> {item.label}
                {item.highlight && <span style={{ width: 8, height: 8, borderRadius: "50%", background: activeColor, display: "inline-block" }} />}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
