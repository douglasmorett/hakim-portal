import { prisma } from "@/lib/prisma";
import LabelsClient from "./LabelsClient";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function LabelsPage() {
  const session = await getServerSession(authOptions);

  const products = await prisma.product.findMany({
    orderBy: { name: "asc" }
  });

  let storeAddress = "";
  let storeCnpj = "";
  let storeName = "";
  let storeLogo = "";
  let currentUserId: string | undefined;

  if (session?.user?.email) {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });
    if (user) {
      currentUserId = user.id;
      storeAddress = user.storeAddress || "";
      storeCnpj = user.cpfCnpj || "";
      storeName = user.storeName || "";
      storeLogo = user.storeLogo || "";
    }
  }

  const kitchenItems = await prisma.kitchenItem.findMany({
    where: { franchiseeId: currentUserId },
    orderBy: { name: "asc" }
  });

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
      <LabelsClient products={products} kitchenItems={kitchenItems} storeAddress={storeAddress} storeCnpj={storeCnpj} storeName={storeName} storeLogo={storeLogo} />
    </div>
  );
}
