import { prisma } from "@/lib/prisma";
import LabelsClient from "./LabelsClient";

export default async function LabelsPage() {
  const products = await prisma.product.findMany({
    orderBy: { name: "asc" }
  });

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
      <LabelsClient products={products} />
    </div>
  );
}
