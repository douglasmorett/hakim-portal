import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import InvoicesClient from "@/components/InvoicesClient";

export const dynamic = "force-dynamic";

const PERSONAL_ALLOWED_EMAILS = ["elis@hakim.com.br"];

export default async function InvoicesPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const role = (session.user as any).role;
  const userEmail = (session.user?.email || "").toLowerCase();
  let perms = (session.user as any).permissions || "";

  if (role === "STAFF" && session.user?.email) {
    const { prisma } = await import("@/lib/prisma");
    const dbUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { permissions: true }
    });
    perms = dbUser?.permissions || "";
  }

  if (role !== "ADMIN" && !hasPermission(perms, "invoices", role)) {
    redirect("/admin");
  }

  const canSeePersonal = role === "ADMIN" || PERSONAL_ALLOWED_EMAILS.includes(userEmail);

  return <InvoicesClient role={role} canSeePersonal={canSeePersonal} />;
}
