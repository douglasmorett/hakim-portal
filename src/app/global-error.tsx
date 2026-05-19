"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Global Error]", error);
  }, [error]);

  return (
    <html>
      <body style={{
        fontFamily: "'Inter', sans-serif",
        margin: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        backgroundColor: "#0F172A",
        color: "#fff",
      }}>
        <div style={{
          textAlign: "center",
          padding: "2rem",
          maxWidth: 450,
        }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>⚠️</div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "0.5rem" }}>
            Erro no servidor
          </h1>
          <p style={{ color: "#94a3b8", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
            {error.message || "Ocorreu um erro inesperado. Tente novamente."}
          </p>
          {error.digest && (
            <p style={{ color: "#475569", fontSize: "0.75rem", marginBottom: "1rem" }}>
              Código: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              background: "linear-gradient(135deg, #EF4444, #DC2626)",
              color: "#fff",
              border: "none",
              padding: "12px 28px",
              borderRadius: 12,
              fontWeight: 700,
              cursor: "pointer",
              fontSize: "1rem",
            }}
          >
            🔄 Tentar novamente
          </button>
        </div>
      </body>
    </html>
  );
}
