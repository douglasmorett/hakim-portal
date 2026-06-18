import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import FinanceClient from "./FinanceClient";

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

  return (
    <FinanceClient
      businessPayables={JSON.parse(JSON.stringify(businessPayables))}
      personalPayables={JSON.parse(JSON.stringify(personalPayables))}
      businessPaidPayables={JSON.parse(JSON.stringify(businessPaidPayables))}
      personalPaidPayables={JSON.parse(JSON.stringify(personalPaidPayables))}
      canSeePersonal={canSeePersonal}
      isAdmin={isAdmin}
    />
  );
}

