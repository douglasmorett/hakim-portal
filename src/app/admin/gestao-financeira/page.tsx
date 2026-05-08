import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import GestaoFinanceiraClient from "./GestaoFinanceiraClient";

export const dynamic = "force-dynamic";

export default async function GestaoFinanceiraPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if ((session.user as any).role !== "ADMIN") redirect("/admin");
  return <GestaoFinanceiraClient />;
}
