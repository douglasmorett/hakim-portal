import { prisma } from "@/lib/prisma";
import ProductsClient from "@/components/ProductsClient";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const products = await prisma.product.findMany({
    orderBy: { createdAt: 'desc' }
  });

  return <ProductsClient products={JSON.parse(JSON.stringify(products))} />;
}

