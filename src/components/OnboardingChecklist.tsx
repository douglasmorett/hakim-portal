"use client";
/**
 * FireHub — Onboarding Gamificado
 * Checklist de ativação para novos lojistas
 * Aparece no dashboard até todos os passos serem concluídos
 */
import { useState, useEffect } from "react";
import { Check, ChevronRight, X, Zap, Trophy, Star } from "lucide-react";

export type OnboardingStep = {
  id: string;
  icon: string;
  title: string;
  description: string;
  cta: string;
  href: string;
  done: boolean;
  points: number;
};

const STEPS: Omit<OnboardingStep, "done">[] = [
  {
    id: "logo",
    icon: "🖼️",
    title: "Adicione o logo e banner da loja",
    description: "Sua loja fica muito mais profissional com identidade visual.",
    cta: "Configurar loja",
    href: "/store/minha-loja",
    points: 10,
  },
  {
    id: "menu",
    icon: "🍔",
    title: "Cadastre seu primeiro produto",
    description: "Adicione pelo menos um produto ao cardápio para receber pedidos.",
    cta: "Ir ao cardápio",
    href: "/admin/cardapio",
    points: 20,
  },
  {
    id: "hours",
    icon: "🕐",
    title: "Configure seus horários de funcionamento",
    description: "Defina os dias e horários em que sua loja aceita pedidos.",
    cta: "Configurar horários",
    href: "/store/minha-loja#horarios",
    points: 10,
  },
  {
    id: "payment",
    icon: "💳",
    title: "Ative o pagamento online (PIX)",
    description: "Receba pagamentos online direto no app — PIX disponível na hora.",
    cta: "Ativar pagamento",
    href: "/store/minha-loja#pagamento",
    points: 20,
  },
  {
    id: "delivery",
    icon: "🛵",
    title: "Configure sua zona de entrega",
    description: "Defina bairros, raios e taxas de entrega para cada região.",
    cta: "Configurar entrega",
    href: "/store/minha-loja#entrega",
    points: 15,
  },
  {
    id: "first_order",
    icon: "🎉",
    title: "Receba seu primeiro pedido",
    description: "Compartilhe o link da sua loja e comece a vender!",
    cta: "Ver meu link",
    href: "/store",
    points: 25,
  },
];

const TOTAL_POINTS = STEPS.reduce((s, step) => s + step.points, 0);

function getLevelInfo(points: number) {
  if (points === 0) return { level: "Iniciante", color: "#94A3B8", next: 30 };
  if (points < 30) return { level: "Iniciante", color: "#94A3B8", next: 30 };
  if (points < 60) return { level: "Ativo", color: "#3B82F6", next: 60 };
  if (points < 80) return { level: "Avançado", color: "#8B5CF6", next: 80 };
  return { level: "🏆 Completo!", color: "#F59E0B", next: TOTAL_POINTS };
}

export default function OnboardingChecklist({
  completedSteps = [],
  onDismiss,
}: {
  completedSteps?: string[];
  onDismiss?: () => void;
}) {
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [localCompleted, setLocalCompleted] = useState<string[]>(completedSteps);

  // Persiste no localStorage
  useEffect(() => {
    const saved = localStorage.getItem("firehub_onboarding_completed");
    if (saved) setLocalCompleted(JSON.parse(saved));
  }, []);

  const steps: OnboardingStep[] = STEPS.map(s => ({
    ...s,
    done: localCompleted.includes(s.id),
  }));

  const doneCount = steps.filter(s => s.done).length;
  const earnedPoints = steps.filter(s => s.done).reduce((sum, s) => sum + s.points, 0);
  const progress = Math.round((doneCount / steps.length) * 100);
  const level = getLevelInfo(earnedPoints);
  const allDone = doneCount === steps.length;

  if (dismissed) return null;

  return (
    <div style={{
      background: "#fff",
      borderRadius: "20px",
      boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
      border: "1px solid #E2E8F0",
      overflow: "hidden",
      marginBottom: "1.5rem",
    }}>
      {/* Header */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: "1rem 1.25rem",
          background: allDone
            ? "linear-gradient(135deg, #F59E0B, #D97706)"
            : "linear-gradient(135deg, #0F172A, #1E293B)",
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "1rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1 }}>
          <div style={{
            width: 42, height: 42, borderRadius: "12px",
            background: allDone ? "rgba(255,255,255,0.2)" : "#E6394620",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.3rem"
          }}>
            {allDone ? "🏆" : "🚀"}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <p style={{ fontWeight: 800, fontSize: "0.95rem", color: "#fff", margin: 0 }}>
                {allDone ? "Configuração completa!" : "Configure sua loja"}
              </p>
              <span style={{
                background: level.color + "30",
                color: level.color,
                borderRadius: "100px",
                padding: "2px 10px",
                fontSize: "0.68rem",
                fontWeight: 700,
                border: `1px solid ${level.color}50`,
              }}>
                {level.level}
              </span>
            </div>
            {/* Progress bar */}
            <div style={{ marginTop: "6px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.6)" }}>
                  {doneCount} de {steps.length} etapas · {earnedPoints} pts
                </span>
                <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.8)", fontWeight: 700 }}>
                  {progress}%
                </span>
              </div>
              <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: "100px", height: "6px", overflow: "hidden" }}>
                <div style={{
                  width: `${progress}%`, height: "100%",
                  background: allDone ? "#fff" : "#E63946",
                  borderRadius: "100px",
                  transition: "width 0.6s ease",
                }} />
              </div>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          {onDismiss && (
            <button
              onClick={(e) => { e.stopPropagation(); setDismissed(true); onDismiss(); }}
              style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "8px", padding: "4px", cursor: "pointer", display: "flex" }}
            >
              <X size={16} color="rgba(255,255,255,0.6)" />
            </button>
          )}
          <div style={{ color: "rgba(255,255,255,0.6)", display: "flex", alignItems: "center" }}>
            <ChevronRight size={18} style={{ transform: expanded ? "rotate(90deg)" : "rotate(0)", transition: "transform 0.2s" }} />
          </div>
        </div>
      </div>

      {/* Steps */}
      {expanded && (
        <div style={{ padding: "0.5rem" }}>
          {steps.map((step, i) => (
            <div
              key={step.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "10px 12px",
                borderRadius: "12px",
                background: step.done ? "#F0FDF4" : "transparent",
                marginBottom: "2px",
                transition: "background 0.2s",
              }}
            >
              {/* Status icon */}
              <div style={{
                width: 34, height: 34, borderRadius: "10px", flexShrink: 0,
                background: step.done ? "#16A34A" : "#F1F5F9",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: step.done ? "0.9rem" : "1rem",
              }}>
                {step.done ? <Check size={16} color="#fff" strokeWidth={3} /> : step.icon}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  fontWeight: 700, fontSize: "0.85rem", margin: 0,
                  color: step.done ? "#15803D" : "#0F172A",
                  textDecoration: step.done ? "line-through" : "none",
                  opacity: step.done ? 0.7 : 1,
                }}>
                  {step.title}
                </p>
                {!step.done && (
                  <p style={{ fontSize: "0.75rem", color: "#94A3B8", margin: "1px 0 0" }}>
                    {step.description}
                  </p>
                )}
              </div>

              {/* Points badge */}
              <span style={{
                fontSize: "0.7rem", fontWeight: 700, flexShrink: 0,
                color: step.done ? "#16A34A" : "#94A3B8",
                background: step.done ? "#DCFCE7" : "#F1F5F9",
                padding: "2px 8px", borderRadius: "100px",
              }}>
                +{step.points}pts
              </span>

              {/* CTA */}
              {!step.done && (
                <a
                  href={step.href}
                  style={{
                    padding: "6px 14px", borderRadius: "10px", flexShrink: 0,
                    background: "#0F172A", color: "#fff",
                    fontSize: "0.75rem", fontWeight: 700, textDecoration: "none",
                    display: "flex", alignItems: "center", gap: "4px",
                    whiteSpace: "nowrap",
                  }}
                >
                  {step.cta} <ChevronRight size={12} />
                </a>
              )}
            </div>
          ))}

          {/* Mensagem de conclusão */}
          {allDone && (
            <div style={{
              margin: "0.5rem", padding: "1rem", borderRadius: "12px",
              background: "linear-gradient(135deg, #F59E0B20, #D97706 10)",
              border: "1px solid #FDE68A", textAlign: "center",
            }}>
              <p style={{ fontWeight: 800, color: "#92400E", margin: "0 0 4px" }}>
                🏆 Parabéns! Sua loja está 100% configurada.
              </p>
              <p style={{ fontSize: "0.78rem", color: "#B45309", margin: 0 }}>
                Compartilhe o link da sua loja e comece a receber pedidos!
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
