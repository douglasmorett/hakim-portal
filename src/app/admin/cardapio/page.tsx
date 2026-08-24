import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import MenuProductManager from "@/components/admin/MenuProductManager";

export const dynamic = "force-dynamic";

export default async function AdminCardapioPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "ADMIN") redirect("/");

  const menuProducts = await prisma.menuProduct.findMany({
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
    include: {
      comboGroups: {
        orderBy: { sortOrder: 'asc' },
        include: { items: { include: { menuProduct: { select: { id: true, name: true } } } } }
      }
    }
  });

  // Get non-combo products for combo builder select
  const availableItems = menuProducts.filter(p => !p.isCombo);

  return (
    <div>
      <h1 className="font-bold mb-6" style={{ fontSize: "2rem" }}>🍔 Cardápio Digital</h1>
      <p className="text-muted mb-4">Gerencie produtos, preços, fotos e combos. Pausar um item aqui pausa ele em todos os combos automaticamente.</p>
      <MenuProductManager products={menuProducts} availableItems={availableItems} />
    </div>
  );
}
