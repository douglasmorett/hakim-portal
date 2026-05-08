import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import FinanceClient from "./FinanceClient";

// Emails autorizados para módulo pessoal
const PERSONAL_ALLOWED_EMAILS = [
  "administrador@hakimgroup.com.br",
  "admin@hakimgroup.com.br",
  "financeiro@hakimgroup.com.br",
  // Adicione o email da Elis aqui
];

export default async function AdminFinancePage() {
  const session = await getServerSession(authOptions);
  const userEmail = session?.user?.email || "";
  const userRole = (session?.user as any)?.role || "";

  // Verifica se o usuário pode ver o módulo pessoal
  const canSeePersonal = userRole === "ADMIN" && PERSONAL_ALLOWED_EMAILS.some(e => 
    userEmail.toLowerCase().includes(e.toLowerCase().split("@")[0])
  );

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
    />
  );
}
