"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (res?.error) {
      setError("Credenciais inválidas. Verifique seu e-mail e senha.");
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
  };

  return (
    <div className="flex justify-center items-center" style={{ minHeight: "100vh" }}>
      <div className="card" style={{ maxWidth: "400px", width: "100%" }}>
        <div className="text-center mb-4 flex flex-col items-center">
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <svg width="48" height="48" viewBox="0 0 100 100" fill="none">
              <circle cx="50" cy="50" r="48" fill="#1E293B" stroke="#EF4444" strokeWidth="3"/>
              <path d="M50 15C45 30 30 40 30 55C30 68 39 80 50 85C61 80 70 68 70 55C70 40 55 30 50 15Z" fill="#EF4444"/>
              <path d="M50 35C47 45 40 50 40 58C40 65 44 72 50 75C56 72 60 65 60 58C60 50 53 45 50 35Z" fill="#FF8C00"/>
              <circle cx="50" cy="60" r="6" fill="#FFD700"/>
            </svg>
            <div>
              <span style={{ color: "#EF4444", fontWeight: 900, fontSize: "1.6rem" }}>HAKIM</span>
            </div>
          </div>
          <p className="text-muted" style={{ fontWeight: 500 }}>Portal da Franquia — Faça login</p>
        </div>

        {error && (
          <div style={{ backgroundColor: "var(--danger)", color: "white", padding: "0.5rem", borderRadius: "var(--radius-sm)", marginBottom: "1rem", fontSize: "0.85rem", textAlign: "center" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="email">E-mail</label>
            <input
              id="email"
              type="email"
              className="input-field"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="password">Senha</label>
            <input
              id="password"
              type="password"
              className="input-field"
              placeholder="••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: "100%", marginTop: "1rem" }}
            disabled={loading}
          >
            <LogIn size={18} style={{ marginRight: "0.5rem" }} />
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
