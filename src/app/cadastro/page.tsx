"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function CadastroPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", phone: "", businessName: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!form.name || !form.email || !form.password) {
      setError("Preencha todos os campos obrigatórios.");
      setLoading(false);
      return;
    }
    if (form.password.length < 6) {
      setError("A senha deve ter no mínimo 6 caracteres.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erro ao criar conta.");
        setLoading(false);
        return;
      }

      // Auto-login após cadastro
      const loginRes = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });

      if (loginRes?.error) {
        setError("Conta criada! Faça login manualmente.");
        setLoading(false);
        router.push("/login");
        return;
      }

      // Redirecionar para o painel
      router.push("/");
      router.refresh();
    } catch {
      setError("Erro de conexão. Tente novamente.");
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
        body { font-family: 'Inter', sans-serif; }
        input::placeholder { color: #9CA3AF; }
        input:focus { outline: none; border-color: #EF4444 !important; box-shadow: 0 0 0 3px rgba(239,68,68,.1); }
      `}</style>

      {/* LADO ESQUERDO - Info */}
      <div style={styles.left}>
        <div style={styles.leftContent}>
          <a href="https://firehubfood.com.br" style={styles.logoLink}>
            <img src="/icon.jpg" alt="FireHub" style={styles.logoImg} />
            <div>
              <div style={styles.logoText}><span style={{color:"#EF4444"}}>FIRE</span><span style={{color:"#fff"}}>HUB</span></div>
              <div style={styles.logoSub}>Sistema para restaurantes</div>
            </div>
          </a>

          <div style={styles.tagline}>
            <span style={styles.tagBadge}>🔥 PRONTO PARA COMEÇAR?</span>
            <h1 style={styles.leftTitle}>
              Crie sua conta grátis e<br />veja o <span style={{color:"#EF4444"}}>FireHub</span> em ação
            </h1>
            <p style={styles.leftDesc}>
              Tenha 15 dias para explorar todas as funcionalidades.
              Sem cartão de crédito, sem compromisso.
            </p>
          </div>

          <div style={styles.benefits}>
            {[
              { icon: "⚡", text: "Ative seu cardápio digital em 2 minutos" },
              { icon: "🤖", text: "Chatbot WhatsApp com IA incluso" },
              { icon: "📊", text: "Relatórios e controle financeiro completo" },
              { icon: "🔒", text: "Cancele quando quiser, sem multa" },
            ].map((b, i) => (
              <div key={i} style={styles.benefitItem}>
                <span style={styles.benefitIcon}>{b.icon}</span>
                <span style={styles.benefitText}>{b.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* LADO DIREITO - Formulário */}
      <div style={styles.right}>
        <div style={styles.formCard}>
          <h2 style={styles.formTitle}>
            Transforme o seu restaurante<br />
            <span style={{color:"#EF4444", textDecoration:"underline", textDecorationColor:"#EF4444", textUnderlineOffset:"6px"}}>agora gratuitamente</span>
          </h2>

          {error && <div style={styles.errorBox}>{error}</div>}

          <form onSubmit={handleSubmit}>
            <div style={styles.fieldGroup}>
              <input
                type="text"
                placeholder="Seu nome*"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                style={styles.input}
                required
              />
            </div>

            <div style={styles.fieldGroup}>
              <input
                type="tel"
                placeholder="WhatsApp para contato (ex: 22999998888)"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                style={styles.input}
              />
            </div>

            <div style={styles.fieldGroup}>
              <input
                type="text"
                placeholder="Nome do seu restaurante*"
                value={form.businessName}
                onChange={(e) => set("businessName", e.target.value)}
                style={styles.input}
                required
              />
            </div>

            <div style={styles.fieldGroup}>
              <input
                type="email"
                placeholder="E-mail*"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                style={styles.input}
                required
              />
            </div>

            <div style={styles.fieldGroup}>
              <input
                type="password"
                placeholder="Crie uma senha (mín. 6 caracteres)*"
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
                style={styles.input}
                required
                minLength={6}
              />
            </div>

            <button type="submit" style={styles.submitBtn} disabled={loading}>
              {loading ? "Criando sua conta..." : "🔥 Testar Grátis por 15 Dias"}
            </button>

            <p style={styles.terms}>
              Ao criar sua conta, você concorda com nossos <a href="#" style={{color:"#EF4444"}}>Termos de Uso</a> e <a href="#" style={{color:"#EF4444"}}>Política de Privacidade</a>.
            </p>

            <p style={styles.loginLink}>
              Já tem uma conta? <a href="/login" style={{color:"#EF4444", fontWeight:600, textDecoration:"none"}}>Fazer login →</a>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    fontFamily: "'Inter', sans-serif",
  },
  left: {
    background: "linear-gradient(160deg, #111827 0%, #1F2937 50%, #111827 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "60px 48px",
    position: "relative",
    overflow: "hidden",
  },
  leftContent: {
    maxWidth: 480,
    position: "relative",
    zIndex: 1,
  },
  logoLink: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    textDecoration: "none",
    marginBottom: 48,
  },
  logoImg: {
    height: 44,
    width: 44,
    borderRadius: 10,
  },
  logoText: {
    fontSize: "1.4rem",
    fontWeight: 900,
    letterSpacing: "-.5px",
  },
  logoSub: {
    fontSize: ".5rem",
    color: "#6B7280",
    letterSpacing: "1.5px",
    textTransform: "uppercase" as const,
  },
  tagline: {},
  tagBadge: {
    display: "inline-block",
    padding: "6px 16px",
    background: "rgba(239,68,68,.12)",
    border: "1px solid rgba(239,68,68,.2)",
    borderRadius: 50,
    color: "#EF4444",
    fontSize: ".75rem",
    fontWeight: 700,
    marginBottom: 20,
  },
  leftTitle: {
    color: "#fff",
    fontSize: "clamp(1.8rem, 2.6vw, 2.4rem)",
    fontWeight: 900,
    lineHeight: 1.15,
    letterSpacing: "-.5px",
    marginBottom: 16,
  },
  leftDesc: {
    color: "#9CA3AF",
    fontSize: ".95rem",
    lineHeight: 1.6,
    marginBottom: 40,
  },
  benefits: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 16,
  },
  benefitItem: {
    display: "flex",
    alignItems: "center",
    gap: 14,
  },
  benefitIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    background: "rgba(255,255,255,.06)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1.1rem",
    flexShrink: 0,
  },
  benefitText: {
    color: "#D1D5DB",
    fontSize: ".88rem",
    fontWeight: 500,
  },
  right: {
    background: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 48px",
  },
  formCard: {
    width: "100%",
    maxWidth: 460,
  },
  formTitle: {
    fontSize: "1.5rem",
    fontWeight: 800,
    color: "#111827",
    lineHeight: 1.3,
    marginBottom: 28,
    textAlign: "center" as const,
  },
  errorBox: {
    background: "#FEF2F2",
    border: "1px solid #FEE2E2",
    color: "#DC2626",
    padding: "10px 16px",
    borderRadius: 10,
    fontSize: ".85rem",
    marginBottom: 16,
    textAlign: "center" as const,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  input: {
    width: "100%",
    padding: "14px 18px",
    border: "1.5px solid #E5E7EB",
    borderRadius: 12,
    fontSize: ".92rem",
    fontFamily: "'Inter', sans-serif",
    color: "#111827",
    background: "#FAFAFA",
    transition: "all .2s",
  },
  submitBtn: {
    width: "100%",
    padding: "16px",
    background: "#EF4444",
    color: "#fff",
    border: "none",
    borderRadius: 12,
    fontSize: "1rem",
    fontWeight: 800,
    fontFamily: "'Inter', sans-serif",
    cursor: "pointer",
    boxShadow: "0 6px 24px rgba(239,68,68,.3)",
    marginTop: 8,
    transition: "all .3s",
  },
  terms: {
    fontSize: ".75rem",
    color: "#9CA3AF",
    textAlign: "center" as const,
    marginTop: 16,
    lineHeight: 1.5,
  },
  loginLink: {
    fontSize: ".88rem",
    color: "#6B7280",
    textAlign: "center" as const,
    marginTop: 20,
  },
};
