import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const role = (session.user as any)?.role;

  if (role === "CUSTOMER") {
    // Caso exista alguma rota de cliente futuramente, redirecione aqui. Por hora, vai para admin.
    redirect("/admin");
  } else {
    redirect("/admin");
  }

  return null;
}

