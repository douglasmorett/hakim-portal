import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CartProvider } from "@/components/CartProvider";
import StoreTopNav from "@/components/customer/StoreTopNav";
import { prisma } from "@/lib/prisma";
import { FIREHUB_PLAN } from "@/lib/firehub-billing";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/");
  const role = (session.user as any)?.role;
  if (role !== "FRANCHISEE" && role !== "ADMIN") redirect("/");

  const user = await prisma.user.findUnique({
    where: { email: session.user?.email || "" },
    select: { name: true, city: true, slug: true, role: true, cpfCnpj: true, storeOpen: true, cashOpen: true, createdAt: true },
  });

  const isFranqueado = user?.role === "FRANCHISEE";

  // === TRIAL: calcular dias restantes ===
  let trialDaysLeft = 0;
  let isInTrial = false;
  if (user?.createdAt) {
    const createdAt = new Date(user.createdAt);
    const now = new Date();
    const diffMs = now.getTime() - createdAt.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    trialDaysLeft = Math.max(0, FIREHUB_PLAN.TRIAL_DAYS - diffDays);
    isInTrial = trialDaysLeft > 0;
  }

  // === PAGAMENTO PENDENTE: buscar ciclo com boleto aberto ===
  let pendingPayment: { amount: number; url: string | null } | null = null;
  if (isFranqueado && user) {
    const userId = await prisma.user.findUnique({
      where: { email: session.user?.email || "" },
      select: { id: true },
    });
    if (userId) {
      const openCycle = await prisma.franchiseeBillingCycle.findFirst({
        where: {
          franchiseeId: userId.id,
          status: "CLOSED",
          amountPending: { gt: 0 },
        },
        orderBy: { closedAt: "desc" },
      });
      if (openCycle && openCycle.amountPending > 0) {
        pendingPayment = {
          amount: openCycle.amountPending,
          url: openCycle.asaasBoletoUrl,
        };
      }
    }
  }

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

        {/* Banner: Trial ativo */}
        {isInTrial && isFranqueado && (
          <div style={{
            background: "linear-gradient(135deg, #2563EB, #1d4ed8)",
            color: "white",
            padding: "10px 1.5rem",
            textAlign: "center",
            fontSize: ".85rem",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}>
            🎁 Teste grátis — <strong>{trialDaysLeft} {trialDaysLeft === 1 ? "dia restante" : "dias restantes"}</strong>
            <span style={{ opacity: .7, fontSize: ".78rem", marginLeft: 4 }}>
              Aproveite todas as funcionalidades sem custo
            </span>
          </div>
        )}

        {/* Banner: Pagamento pendente (NÃO bloqueia, só avisa) */}
        {pendingPayment && !isInTrial && (
          <div style={{
            background: "linear-gradient(135deg, #F59E0B, #D97706)",
            color: "white",
            padding: "10px 1.5rem",
            textAlign: "center",
            fontSize: ".85rem",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            flexWrap: "wrap",
          }}>
            <span>⚠️ Pagamento pendente de R$ {pendingPayment.amount.toFixed(2).replace(".", ",")} — Realize o pagamento para seu sistema não ser bloqueado</span>
            {pendingPayment.url && (
              <a href={pendingPayment.url} target="_blank" rel="noopener noreferrer" style={{
                background: "#fff",
                color: "#D97706",
                padding: "5px 16px",
                borderRadius: 8,
                fontWeight: 700,
                fontSize: ".8rem",
                textDecoration: "none",
                whiteSpace: "nowrap",
              }}>
                💳 Pagar Agora
              </a>
            )}
          </div>
        )}

        <main style={{ flex: 1 }}>
          {children}
        </main>
      </div>
    </CartProvider>
  );
}
