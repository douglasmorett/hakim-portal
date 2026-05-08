import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CartProvider } from "@/components/CartProvider";
import StoreTopNav from "@/components/customer/StoreTopNav";
import { prisma } from "@/lib/prisma";
import { checkAsaasOverdue } from "@/lib/asaas";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/");
  const role = (session.user as any)?.role;
  if (role !== "FRANCHISEE" && role !== "ADMIN") redirect("/");

  const user = await prisma.user.findUnique({
    where: { email: session.user?.email || "" },
    select: { name: true, city: true, slug: true, role: true, cpfCnpj: true, storeOpen: true, cashOpen: true },
  });

  let isBlocked = false;
  if (role === "FRANCHISEE" && user?.cpfCnpj) {
    isBlocked = await checkAsaasOverdue(user.cpfCnpj);
  }

  const isFranqueado = user?.role === "FRANCHISEE";

  return (
    <CartProvider>
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", backgroundColor: "#F5F5F5" }}>
        <StoreTopNav
          userName={session.user?.name || user?.name || ""}
          userCity={(session.user as any)?.city || user?.city || ""}
          userSlug={user?.slug}
          isFranqueado={isFranqueado}
          initialStoreOpen={user?.storeOpen ?? true}
          initialCashOpen={user?.cashOpen ?? false}
        />

        {isBlocked && (
          <div style={{ backgroundColor: "#ef4444", color: "white", padding: "1rem", textAlign: "center", fontWeight: "bold" }}>
            ⚠️ Sua conta está bloqueada para pedidos. Por favor acerte a compra anterior que está pendente.
          </div>
        )}

        <main style={{ flex: 1, opacity: isBlocked ? 0.5 : 1, pointerEvents: isBlocked ? "none" : "auto" }}>
          {children}
        </main>
      </div>
    </CartProvider>
  );
}
