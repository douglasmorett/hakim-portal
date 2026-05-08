import { prisma } from "@/lib/prisma";
import IceboxCatalog from "@/components/icebox/IceboxCatalog";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getNextDeliveryInfo } from "@/lib/deliveryDates";

export const metadata = {
  title: "Icebox Congelados - Catálogo de Produtos",
  description: "Congelados, resfriados e insumos para seu negócio. Entrega em toda região. Veja nosso catálogo completo.",
  openGraph: {
    title: "Icebox Congelados",
    description: "Congelados e insumos para seu negócio",
  }
};

export default async function IceboxPage() {
  const session = await getServerSession(authOptions);
  const isLoggedIn = !!session;
  const role = (session?.user as any)?.role;
  const isFranqueado = role === "FRANCHISEE" || role === "ADMIN";

  const products = await prisma.product.findMany({
    where: { active: true },
    orderBy: { name: 'asc' }
  });

  const deliveryInfo = await getNextDeliveryInfo(null);

  return (
    <IceboxCatalog 
      products={products} 
      deliveryInfo={deliveryInfo}
      isLoggedIn={isLoggedIn}
      canOrder={isFranqueado}
    />
  );
}
