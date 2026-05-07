import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import MenuProductManager from "@/components/admin/MenuProductManager";

export default async function StoreCardapioPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/");
  const role = (session.user as any)?.role;
  if (role !== "FRANCHISEE" && role !== "ADMIN") redirect("/");

  const products = await prisma.menuProduct.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
    include: {
      comboGroups: {
        orderBy: { sortOrder: "asc" },
        include: {
          items: {
            include: { menuProduct: { select: { id: true, name: true, active: true } } }
          }
        }
      }
    }
  });

  const availableItems = await prisma.menuProduct.findMany({
    where: { isCombo: false },
    select: { id: true, name: true, active: true },
    orderBy: { name: "asc" }
  });

  return (
    <div className="container" style={{ marginTop: "1.5rem" }}>
      <h1 className="font-bold mb-6" style={{ fontSize: "1.8rem" }}>🍽️ Cardápio Digital</h1>
      <p className="text-muted mb-4">Gerencie seus produtos, preços e disponibilidade. Pause itens que estiverem em falta.</p>
      <MenuProductManager products={products} availableItems={availableItems} />
    </div>
  );
}
