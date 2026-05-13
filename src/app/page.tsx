import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const role = (session.user as any)?.role;

  if (role === "ADMIN" || role === "STAFF" || role === "FRANCHISEE") {
    redirect("/admin");
  } else {
    redirect("/store");
  }

  return null;
}

