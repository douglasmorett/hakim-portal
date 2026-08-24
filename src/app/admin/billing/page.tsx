import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import BillingDashboard from "./BillingDashboard";

export const dynamic = "force-dynamic";

export const metadata = { title: "Faturamento · FireHub Admin" };

export default async function BillingPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN") redirect("/login");

  return (
    <div className="container" style={{ paddingTop: "2rem", paddingBottom: "4rem" }}>
      <BillingDashboard />
    </div>
  );
}
