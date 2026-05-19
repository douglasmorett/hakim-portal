"use client";

import { useEffect } from "react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Admin Error]", error);
  }, [error]);

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "60vh",
      padding: "2rem",
      textAlign: "center",
    }}>
      <div style={{
        background: "rgba(239,68,68,0.08)",
        border: "1px solid rgba(239,68,68,0.2)",
        borderRadius: 16,
        padding: "2rem",
        maxWidth: 500,
      }}>
        <h2 style={{ color: "#EF4444", fontSize: "1.3rem", fontWeight: 800, marginBottom: "0.5rem" }}>
          ⚠️ Erro ao carregar a página
        </h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "1rem" }}>
          {error.message || "Ocorreu um erro inesperado no servidor."}
        </p>
        {error.digest && (
          <p style={{ color: "var(--text-muted)", fontSize: "0.75rem", opacity: 0.6, marginBottom: "1rem" }}>
            Código: {error.digest}
          </p>
        )}
        <button
          onClick={reset}
          style={{
            background: "linear-gradient(135deg, #EF4444, #DC2626)",
            color: "#fff",
            border: "none",
            padding: "10px 24px",
            borderRadius: 10,
            fontWeight: 700,
            cursor: "pointer",
            fontSize: "0.9rem",
          }}
        >
          🔄 Tentar novamente
        </button>
      </div>
    </div>
  );
}
