import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CartProvider } from "@/components/CartProvider";
import Link from "next/link";
import { LogOut, ShoppingBag } from "lucide-react";
import StoreNavbar from "@/components/StoreNavbar";

import { prisma } from "@/lib/prisma";
import { checkAsaasOverdue } from "@/lib/asaas";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session) redirect("/");
  const role = (session.user as any)?.role;
  if (role !== "FRANCHISEE" && role !== "ADMIN") {
    redirect("/");
  }

  // Verifica inadimplência
  let isBlocked = false;
  if (role === "FRANCHISEE" && session.user?.email) {
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (user?.cpfCnpj) {
      isBlocked = await checkAsaasOverdue(user.cpfCnpj);
    }
  }

  return (
    <CartProvider>
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <StoreNavbar userName={session.user?.name || ""} userCity={(session.user as any)?.city || ""} />
        
        {isBlocked && (
          <div style={{ backgroundColor: "#ef4444", color: "white", padding: "1rem", textAlign: "center", fontWeight: "bold" }}>
            ⚠️ Sua conta está bloqueada para pedidos. Por favor acerte a compra anterior que está pendente no seu banco ou Asaas.
          </div>
        )}

        <main style={{ flex: 1, padding: "2rem 0", opacity: isBlocked ? 0.5 : 1, pointerEvents: isBlocked ? "none" : "auto" }}>
          {children}
        </main>
      </div>
    </CartProvider>
  );
}
