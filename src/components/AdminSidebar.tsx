import Link from "next/link";
import { LayoutDashboard, Package, Users, ShoppingCart, LogOut, Truck, DollarSign, UserCog, Receipt, Sparkles, Tag, UtensilsCrossed, BarChart3 } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import MobileMenuToggle from "./MobileMenuToggle";

export default async function AdminSidebar() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role || "";

  // Busca permissões SEMPRE do banco de dados (mais confiável que o JWT)
  let perms = "";
  if (session?.user?.email && role === "STAFF") {
    const dbUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { permissions: true }
    });
    perms = dbUser?.permissions || "";
  }

  const can = (key: string) => hasPermission(perms, key, role);


  return (
    <>
      {/* Mobile top bar */}
      <div style={{
        display: "none",
        position: "fixed",
        top: 0, left: 0, right: 0,
        height: "60px",
        backgroundColor: "var(--surface)",
        borderBottom: "1px solid var(--border-color)",
        zIndex: 400,
        alignItems: "center",
        justifyContent: "center", // Logo centralizada para dar espaço ao botão
        padding: "0 1rem"
      }} className="mobile-topbar">
        <img src="/logo.png" alt="Hakim" style={{ height: "45px" }} />
      </div>

      <MobileMenuToggle />

      {/* Sidebar */}
      <aside id="admin-sidebar" style={{
        width: "250px",
        backgroundColor: "var(--surface)",
        borderRight: "1px solid var(--border-color)",
        height: "100vh",
        position: "fixed",
        left: 0,
        top: 0,
        display: "flex",
        flexDirection: "column",
        zIndex: 1000, // Sempre no topo de tudo
        transition: "transform 0.3s ease",
        boxShadow: "10px 0 30px rgba(0,0,0,0.3)"
      }}>
        <div style={{ padding: "20px", borderBottom: "1px solid var(--border-color)", textAlign: "center" }}>
          <img src="/logo.png" alt="Hakim Admin" style={{ height: "70px", marginBottom: "0.5rem" }} />
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{session?.user?.name}</p>
          <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", opacity: 0.6 }}>
            {role === "ADMIN" ? "Super Admin" : "Equipe"}
          </p>
        </div>

        <nav style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "6px", flex: 1, overflowY: "auto" }}>
          {can("dashboard") && (
            <Link href="/admin" className="btn btn-outline sidebar-link" style={{ justifyContent: "flex-start", border: "none" }}>
              <LayoutDashboard size={18} style={{ marginRight: "10px" }} /> Dashboard
            </Link>
          )}
          {can("products") && (
            <Link href="/admin/products" className="btn btn-outline sidebar-link" style={{ justifyContent: "flex-start", border: "none" }}>
              <Package size={18} style={{ marginRight: "10px" }} /> Produtos
            </Link>
          )}
          {can("products") && (
            <Link href="/admin/labels" className="btn btn-outline sidebar-link" style={{ justifyContent: "flex-start", border: "none" }}>
              <Tag size={18} style={{ marginRight: "10px" }} /> Validação / Etiquetas
            </Link>
          )}
          {can("orders") && (
            <Link href="/admin/orders" className="btn btn-outline sidebar-link" style={{ justifyContent: "flex-start", border: "none" }}>
              <ShoppingCart size={18} style={{ marginRight: "10px" }} /> Pedidos
            </Link>
          )}
          {can("franchisees") && (
            <Link href="/admin/franchisees" className="btn btn-outline sidebar-link" style={{ justifyContent: "flex-start", border: "none" }}>
              <Users size={18} style={{ marginRight: "10px" }} /> Clientes
            </Link>
          )}
          {can("routes") && (
            <Link href="/admin/routes" className="btn btn-outline sidebar-link" style={{ justifyContent: "flex-start", border: "none" }}>
              <Truck size={18} style={{ marginRight: "10px" }} /> Logística / Rotas
            </Link>
          )}
          {(can("finance") || can("payables")) && (
            <Link href="/admin/finance" className="btn btn-outline sidebar-link" style={{ justifyContent: "flex-start", border: "none" }}>
              <DollarSign size={18} style={{ marginRight: "10px" }} /> Contas a Pagar
            </Link>
          )}
          {can("invoices") && (
            <Link href="/admin/invoices" className="btn btn-outline sidebar-link" style={{ justifyContent: "flex-start", border: "none" }}>
              <Receipt size={18} style={{ marginRight: "10px" }} /> Notas de Compras
            </Link>
          )}
          {role === "ADMIN" && (
            <Link href="/admin/gestao-financeira" className="btn btn-outline sidebar-link" style={{ justifyContent: "flex-start", border: "none", borderLeft: "3px solid #DC2626", background: "rgba(220,38,38,0.06)" }}>
              <BarChart3 size={18} style={{ marginRight: "10px", color: "#DC2626" }} /> Gestão Financeira
            </Link>
          )}
          {role === "ADMIN" && (
            <Link href="/admin/equipe" className="btn btn-outline sidebar-link" style={{ justifyContent: "flex-start", border: "none" }}>
              <UserCog size={18} style={{ marginRight: "10px" }} /> Equipe / Acessos
            </Link>
          )}
          {role === "ADMIN" && (
            <Link href="/admin/cardapio" className="btn btn-outline sidebar-link" style={{ justifyContent: "flex-start", border: "none", marginTop: "12px", borderTop: "1px solid var(--border-color)", paddingTop: "12px", borderRadius: 0 }}>
              <UtensilsCrossed size={18} style={{ marginRight: "10px", color: "var(--primary)" }} /> Cardápio Digital
            </Link>
          )}

          {role === "ADMIN" && (
            <Link href="/admin/ai-chat" className="btn btn-outline sidebar-link" style={{ justifyContent: "flex-start", border: "none", background: "linear-gradient(135deg, rgba(102,126,234,0.1), rgba(118,75,162,0.1))", borderLeft: "3px solid #667eea", marginTop: "8px" }}>
              <Sparkles size={18} style={{ marginRight: "10px", color: "#667eea" }} /> Hakim IA
            </Link>
          )}
          {role === "ADMIN" && (
            <Link href="/admin/lojistas" className="btn btn-outline sidebar-link" style={{ justifyContent: "flex-start", border: "none", background: "rgba(220,38,38,0.06)", borderLeft: "3px solid #DC2626", marginTop: "8px" }}>
              <BarChart3 size={18} style={{ marginRight: "10px", color: "#DC2626" }} /> 🏪 Painel de Lojistas
            </Link>
          )}
        </nav>

        <div style={{ padding: "20px", borderTop: "1px solid var(--border-color)" }}>
          <a href="/api/auth/signout" className="btn" style={{ width: "100%", justifyContent: "flex-start", color: "var(--danger)" }}>
            <LogOut size={18} style={{ marginRight: "10px" }} /> Sair
          </a>
        </div>
      </aside>
    </>
  );
}
