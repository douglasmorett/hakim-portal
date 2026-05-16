import { prisma } from "@/lib/prisma";
import LabelsClient from "./LabelsClient";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function LabelsPage() {
  const session = await getServerSession(authOptions);
  
  const products = await prisma.product.findMany({
    orderBy: { name: "asc" }
  });

  const kitchenItems = await prisma.kitchenItem.findMany({
    where: { franchiseeId: (session?.user as any)?.id },
    orderBy: { name: "asc" }
  });

  let storeAddress = "";
  let storeCnpj = "";
  if ((session?.user as any)?.id) {
    const user = await prisma.user.findUnique({
      where: { id: (session?.user as any).id }
    });
    storeAddress = user?.storeAddress || "";
    storeCnpj = user?.cpfCnpj || "";
  }

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
      <LabelsClient products={products} kitchenItems={kitchenItems} storeAddress={storeAddress} storeCnpj={storeCnpj} />
    </div>
  );
}
