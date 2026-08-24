import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import AiChatClient from "@/components/AiChatClient";

export const dynamic = "force-dynamic";

export default async function AiChatPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;

  // Apenas ADMIN pode acessar
  if (!session || role !== "ADMIN") {
    redirect("/admin");
  }

  return <AiChatClient />;
}
