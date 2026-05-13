"use client";
import { useState, useEffect } from "react";
import { ClipboardCheck, CheckCircle2, Circle, Clock, AlertTriangle, Sparkles, RotateCcw } from "lucide-react";

type CheckItem = {
  id: string;
  text: string;
  category: string;
  done: boolean;
  doneAt?: string;
  doneBy?: string;
};

const TEMPLATES: Record<string, { label: string; icon: string; items: string[] }> = {
  abertura: {
    label: "Abertura",
    icon: "☀️",
    items: [
      "Verificar limpeza geral do salão e cozinha",
      "Conferir estoque de insumos críticos",
      "Ligar equipamentos (fritadeira, chapa, forno)",
      "Verificar temperatura das geladeiras",
      "Conferir material de embalagem",
      "Abrir o caixa no sistema",
      "Verificar gás e conexões",
      "Preparar mise en place",
      "Ligar sistema de pedidos",
      "Verificar motoboys disponíveis",
    ]
  },
  fechamento: {
    label: "Fechamento",
    icon: "🌙",
    items: [
      "Fechar caixa e conferir valores",
      "Limpar chapa, fritadeira e bancadas",
      "Guardar insumos na geladeira",
      "Desligar equipamentos",
      "Retirar lixo",
      "Limpar salão e banheiros",
      "Conferir pedidos pendentes",
      "Verificar estoque para o dia seguinte",
      "Trancar portas e janelas",
      "Desligar luzes e ar-condicionado",
    ]
  },
  higiene: {
    label: "Higiene (ANVISA)",
    icon: "🧼",
    items: [
      "Funcionários com uniforme limpo e touca",
      "Unhas cortadas e sem esmalte",
      "Mãos higienizadas antes de manipular alimentos",
      "Alimentos armazenados em recipientes fechados",
      "Geladeira entre 0°C e 5°C",
      "Freezer abaixo de -18°C",
      "Lixeiras com tampa e saco plástico",
      "Superfícies sanitizadas com álcool 70%",
      "Pragas e insetos ausentes",
      "FIFO aplicado (primeiro que entra, primeiro que sai)",
    ]
  },
};

export default function ChecklistPage() {
  const [activeTemplate, setActiveTemplate] = useState("abertura");
  const [checklists, setChecklists] = useState<Record<string, CheckItem[]>>({});
  const [history, setHistory] = useState<Array<{ date: string; template: string; completed: number; total: number }>>([]);

  useEffect(() => {
    const saved = localStorage.getItem("firehub_checklist");
    const savedHistory = localStorage.getItem("firehub_checklist_history");
    if (saved) setChecklists(JSON.parse(saved));
    if (savedHistory) setHistory(JSON.parse(savedHistory));
    
    // Inicializar templates se não existir
    if (!saved) {
      const initial: Record<string, CheckItem[]> = {};
      Object.entries(TEMPLATES).forEach(([key, tmpl]) => {
        initial[key] = tmpl.items.map((text, i) => ({
          id: `${key}-${i}`,
          text,
          category: tmpl.label,
          done: false,
        }));
      });
      setChecklists(initial);
      localStorage.setItem("firehub_checklist", JSON.stringify(initial));
    }
  }, []);

  const saveChecklist = (updated: Record<string, CheckItem[]>) => {
    setChecklists(updated);
    localStorage.setItem("firehub_checklist", JSON.stringify(updated));
  };

  const toggleItem = (templateKey: string, itemId: string) => {
    const updated = { ...checklists };
    updated[templateKey] = updated[templateKey].map(item =>
      item.id === itemId ? { ...item, done: !item.done, doneAt: !item.done ? new Date().toLocaleTimeString("pt-BR") : undefined } : item
    );
    saveChecklist(updated);
  };

  const resetChecklist = (templateKey: string) => {
    const items = checklists[templateKey];
    if (items) {
      const completed = items.filter(i => i.done).length;
      if (completed > 0) {
        const newHistory = [...history, {
          date: new Date().toLocaleDateString("pt-BR"),
          template: TEMPLATES[templateKey].label,
          completed,
          total: items.length,
        }];
        setHistory(newHistory);
        localStorage.setItem("firehub_checklist_history", JSON.stringify(newHistory.slice(-30)));
      }
    }

    const updated = { ...checklists };
    updated[templateKey] = updated[templateKey].map(item => ({ ...item, done: false, doneAt: undefined }));
    saveChecklist(updated);
  };

  const currentItems = checklists[activeTemplate] || [];
  const completedCount = currentItems.filter(i => i.done).length;
  const totalCount = currentItems.length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const allTemplatesProgress = Object.entries(checklists).map(([key, items]) => ({
    key,
    label: TEMPLATES[key]?.label || key,
    icon: TEMPLATES[key]?.icon || "📋",
    completed: items.filter(i => i.done).length,
    total: items.length,
  }));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, display: "flex", alignItems: "center", gap: 10 }}>
            <ClipboardCheck size={28} /> Checklist Auditado por IA
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: ".85rem" }}>Garanta a qualidade da operação todos os dias</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "linear-gradient(135deg, rgba(234,179,8,0.1), rgba(249,115,22,0.1))", padding: "8px 16px", borderRadius: 10 }}>
          <Sparkles size={16} style={{ color: "#F59E0B" }} />
          <span style={{ fontSize: ".8rem", fontWeight: 600, color: "#F59E0B" }}>Powered by IA</span>
        </div>
      </div>

      {/* Tabs de templates */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        {allTemplatesProgress.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTemplate(t.key)}
            style={{
              flex: 1,
              minWidth: 160,
              padding: "16px 20px",
              borderRadius: 14,
              border: activeTemplate === t.key ? "2px solid #EF4444" : "2px solid var(--border-color)",
              background: activeTemplate === t.key ? "rgba(239,68,68,0.05)" : "var(--surface)",
              cursor: "pointer",
              textAlign: "left",
              transition: "all 0.2s",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: "1.3rem" }}>{t.icon}</span>
              <span style={{ fontSize: ".75rem", fontWeight: 700, color: t.completed === t.total && t.total > 0 ? "#22C55E" : "var(--text-muted)" }}>
                {t.completed}/{t.total}
              </span>
            </div>
            <p style={{ fontWeight: 700, fontSize: ".9rem", margin: 0 }}>{t.label}</p>
            <div style={{ marginTop: 8, height: 4, background: "var(--border-color)", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${t.total > 0 ? (t.completed / t.total) * 100 : 0}%`, background: t.completed === t.total && t.total > 0 ? "#22C55E" : "#EF4444", transition: "width 0.3s" }} />
            </div>
          </button>
        ))}
      </div>

      {/* Progresso circular */}
      <div className="card" style={{ padding: 24, marginBottom: 24, display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
        <div style={{ position: "relative", width: 100, height: 100, flexShrink: 0 }}>
          <svg width="100" height="100" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none" stroke="var(--border-color)" strokeWidth="8" />
            <circle
              cx="50" cy="50" r="42" fill="none"
              stroke={progress === 100 ? "#22C55E" : "#EF4444"}
              strokeWidth="8"
              strokeDasharray={`${progress * 2.64} 264`}
              strokeLinecap="round"
              transform="rotate(-90 50 50)"
              style={{ transition: "stroke-dasharray 0.5s" }}
            />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem", fontWeight: 900 }}>
            {progress}%
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 4 }}>
            {progress === 100 ? "✅ Checklist completo!" : `${completedCount} de ${totalCount} itens concluídos`}
          </h3>
          <p style={{ fontSize: ".85rem", color: "var(--text-muted)", marginBottom: 12 }}>
            {progress === 100 ? "Parabéns! Sua operação está em dia." : "Complete todos os itens para garantir a qualidade."}
          </p>
          <button onClick={() => resetChecklist(activeTemplate)} className="btn btn-outline btn-sm" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <RotateCcw size={14} /> Resetar checklist
          </button>
        </div>
      </div>

      {/* Lista de itens */}
      <div className="card" style={{ overflow: "hidden" }}>
        {currentItems.map((item, index) => (
          <div
            key={item.id}
            onClick={() => toggleItem(activeTemplate, item.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "16px 20px",
              borderBottom: index < currentItems.length - 1 ? "1px solid var(--border-color)" : "none",
              cursor: "pointer",
              transition: "background 0.15s",
              background: item.done ? "rgba(34,197,94,0.04)" : "transparent",
            }}
          >
            {item.done ? (
              <CheckCircle2 size={22} style={{ color: "#22C55E", flexShrink: 0 }} />
            ) : (
              <Circle size={22} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
            )}
            <span style={{
              flex: 1,
              fontSize: ".9rem",
              fontWeight: 500,
              textDecoration: item.done ? "line-through" : "none",
              color: item.done ? "var(--text-muted)" : "var(--text-primary)",
              transition: "color 0.2s",
            }}>
              {item.text}
            </span>
            {item.doneAt && (
              <span style={{ fontSize: ".72rem", color: "#22C55E", display: "flex", alignItems: "center", gap: 4 }}>
                <Clock size={12} /> {item.doneAt}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Histórico resumido */}
      {history.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: 12 }}>📊 Histórico Recente</h3>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {history.slice(-7).reverse().map((h, i) => (
              <div key={i} className="card" style={{ padding: "10px 16px", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: ".78rem", fontWeight: 600 }}>{h.date}</span>
                <span style={{ fontSize: ".72rem", color: "var(--text-muted)" }}>{h.template}</span>
                <span style={{ fontSize: ".72rem", fontWeight: 700, color: h.completed === h.total ? "#22C55E" : "#F59E0B" }}>
                  {h.completed}/{h.total}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
