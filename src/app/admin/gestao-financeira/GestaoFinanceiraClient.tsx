"use client";
import { useState } from "react";
import CashRegisterModule from "./CashRegisterModule";
import PayrollModule from "./PayrollModule";
import PlatformFeesModule from "./PlatformFeesModule";
import CMVModule from "./CMVModule";

const TABS = [
  { id: "caixa", label: "🏦 Caixa", icon: "🏦" },
  { id: "cmv", label: "📊 CMV / Custos", icon: "📊" },
  { id: "folha", label: "👥 Folha de Pagamento", icon: "👥" },
  { id: "plataformas", label: "📱 Taxas de Plataforma", icon: "📱" },
];

export default function GestaoFinanceiraClient() {
  const [tab, setTab] = useState("caixa");

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 className="font-bold" style={{ fontSize: "1.75rem" }}>Gestão Financeira</h1>
        <p className="text-muted">Caixa, CMV, Folha de Pagamento e Taxas de Plataforma</p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: "10px 18px",
              borderRadius: "10px",
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "0.9rem",
              fontFamily: "inherit",
              transition: "all 0.2s",
              background: tab === t.id ? "#DC2626" : "var(--card-bg, #f1f5f9)",
              color: tab === t.id ? "#fff" : "var(--text-muted, #64748b)",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "caixa" && <CashRegisterModule />}
      {tab === "cmv" && <CMVModule />}
      {tab === "folha" && <PayrollModule />}
      {tab === "plataformas" && <PlatformFeesModule />}
    </div>
  );
}
