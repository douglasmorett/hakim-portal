import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const role = (session.user as any)?.role;

  if (role === "ADMIN" || role === "STAFF") {
    redirect("/admin");
  }

  if (role === "FRANCHISEE") {
    redirect("/admin/meus-pedidos");
  }

  // CUSTOMER ou roles desconhecidos → site externo
  redirect("https://www.iceboxcongelados.com.br");

  return null;
}

