import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { checkAndGenerateRecurringPayables } from "@/app/actions/finance";
import FinanceClient from "./FinanceClient";

export const dynamic = "force-dynamic";

// Emails autorizados para módulo pessoal (além de ADMINs)
const PERSONAL_ALLOWED_EMAILS = ["elis@hakim.com.br"];

export default async function AdminFinancePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const userEmail = (session.user?.email || "").toLowerCase();
  const role = (session.user as any)?.role || "";

  // Buscar permissões atualizadas do banco para STAFF
  let perms = (session.user as any)?.permissions || "";
  if (role === "STAFF" && session.user?.email) {
    const dbUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { permissions: true }
    });
    perms = dbUser?.permissions || "";
  }

  const isAdmin = role === "ADMIN";

  // Verificar permissão de acesso (finance OU payables)
  if (!isAdmin && !hasPermission(perms, "finance", role) && !hasPermission(perms, "payables", role)) {
    redirect("/admin");
  }

  // Só ADMINs e a Elis podem ver o módulo pessoal
  const canSeePersonal = isAdmin || PERSONAL_ALLOWED_EMAILS.includes(userEmail);

  // Executar geração automática de contas fixas para o mês atual
  try {
    await checkAndGenerateRecurringPayables();
  } catch (e) {
    console.error("[Finance] Erro ao gerar contas recorrentes:", e);
  }

  // Buscar contas empresariais pendentes
  const businessPayables = await prisma.payable.findMany({
    where: { status: "PENDING", category: "BUSINESS" },
    orderBy: { dueDate: "asc" }
  });

  // Buscar contas empresariais pagas
  const businessPaidPayables = await prisma.payable.findMany({
    where: { status: "PAID", category: "BUSINESS" },
    orderBy: { paidDate: "desc" }
  });

  // Buscar contas pessoais (só se o usuário tiver permissão)
  const personalPayables = canSeePersonal
    ? await prisma.payable.findMany({
        where: { status: "PENDING", category: "PERSONAL" },
        orderBy: { dueDate: "asc" }
      })
    : [];

  const personalPaidPayables = canSeePersonal
    ? await prisma.payable.findMany({
        where: { status: "PAID", category: "PERSONAL" },
        orderBy: { paidDate: "desc" }
      })
    : [];

  // Buscar contas recorrentes empresariais
  const businessRecurring = await prisma.recurringPayable.findMany({
    where: { category: "BUSINESS" },
    orderBy: { dueDateDay: "asc" }
  });

  // Buscar contas recorrentes pessoais
  const personalRecurring = canSeePersonal
    ? await prisma.recurringPayable.findMany({
        where: { category: "PERSONAL" },
        orderBy: { dueDateDay: "asc" }
      })
    : [];

  // Buscar cartões de crédito ativos
  const creditCards = await prisma.creditCard.findMany({
    where: { active: true },
    select: { id: true, name: true, lastDigits: true, bankName: true, closingDay: true, dueDay: true, bestPurchaseDay: true }
  });

  const cardPayables = await prisma.payable.findMany({
    where: { creditCardId: { not: null } },
    select: { creditCardId: true, dueDate: true }
  });

  return (
    <FinanceClient
      businessPayables={JSON.parse(JSON.stringify(businessPayables))}
      personalPayables={JSON.parse(JSON.stringify(personalPayables))}
      businessPaidPayables={JSON.parse(JSON.stringify(businessPaidPayables))}
      personalPaidPayables={JSON.parse(JSON.stringify(personalPaidPayables))}
      businessRecurring={JSON.parse(JSON.stringify(businessRecurring))}
      personalRecurring={JSON.parse(JSON.stringify(personalRecurring))}
      creditCards={JSON.parse(JSON.stringify(creditCards))}
      cardPayables={JSON.parse(JSON.stringify(cardPayables))}
      canSeePersonal={canSeePersonal}
      isAdmin={isAdmin}
    />
  );
}

