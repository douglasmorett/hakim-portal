import { prismaFirehub } from "@/lib/prismaFirehub";
import ProductsClient from "@/components/ProductsClient";

export const dynamic = "force-dynamic";

/**
 * Lê do banco do FIREHUB, o mesmo que as actions gravam (actions/product.ts) e
 * o mesmo que iceboxdistribuidora.com.br serve ao cliente.
 *
 * Ler daqui e gravar lá seria pior que o defeito original: a tela mostraria os
 * preços antigos e o lojista acharia que a edição não pegou.
 *
 * `select` explícito porque o banco do FireHub não tem todas as colunas do
 * schema deste portal — mesma armadilha do commit 7092154.
 */
export default async function ProductsPage() {
  const products = await prismaFirehub.product.findMany({
    select: {
      id: true, name: true, description: true, price: true,
      imageUrl: true, category: true, active: true,
      franchiseOnly: true, createdAt: true, updatedAt: true,
    },
    orderBy: { createdAt: 'desc' }
  });

  return <ProductsClient products={JSON.parse(JSON.stringify(products))} />;
}

