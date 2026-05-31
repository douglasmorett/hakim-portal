"use client";

import { useEffect } from "react";

export default function OrdersError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[Orders Error Boundary]", error);
  }, [error]);

  return (
    <div style={{ padding: "2rem", maxWidth: 600, margin: "0 auto" }}>
      <div className="card" style={{ textAlign: "center", padding: "2rem" }}>
        <h2 style={{ color: "var(--danger)", marginBottom: "1rem" }}>Erro ao carregar pedidos</h2>
        <p style={{ color: "var(--text-muted)", marginBottom: "0.5rem" }}>
          {error.message || "Ocorreu um erro inesperado."}
        </p>
        {error.digest && (
          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
            Digest: {error.digest}
          </p>
        )}
        <button onClick={reset} className="btn btn-primary">
          Tentar novamente
        </button>
      </div>
    </div>
  );
}
