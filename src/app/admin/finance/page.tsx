import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import FinanceClient from "./FinanceClient";

// Emails autorizados para módulo pessoal (além de ADMINs)
const PERSONAL_ALLOWED_EMAILS = ["elis@hakim.com.br"];

export default async function AdminFinancePage() {
  const session = await getServerSession(authOptions);
  const userEmail = (session?.user?.email || "").toLowerCase();
  const userRole = (session?.user as any)?.role || "";

  const isAdmin = userRole === "ADMIN";

  // Só ADMINs e a Elis podem ver o módulo pessoal
  const canSeePersonal = isAdmin || PERSONAL_ALLOWED_EMAILS.includes(userEmail);

  // Buscar contas empresariais
  const businessPayables = await prisma.payable.findMany({
    where: { status: "PENDING", category: "BUSINESS" },
    orderBy: { dueDate: "asc" }
  });

  // Buscar contas pessoais (só se o usuário tiver permissão)
  const personalPayables = canSeePersonal
    ? await prisma.payable.findMany({
        where: { status: "PENDING", category: "PERSONAL" },
        orderBy: { dueDate: "asc" }
      })
    : [];

  return (
    <FinanceClient
      businessPayables={JSON.parse(JSON.stringify(businessPayables))}
      personalPayables={JSON.parse(JSON.stringify(personalPayables))}
      canSeePersonal={canSeePersonal}
      isAdmin={isAdmin}
    />
  );
}
