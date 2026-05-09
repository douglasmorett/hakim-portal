import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const prods = await prisma.menuProduct.findMany({ select: { id: true, name: true, activePDV: true, activeDelivery: true }, take: 5 });
console.log(JSON.stringify(prods, null, 2));

// Forçar update em todos (sem where)
const r = await prisma.$executeRawUnsafe(
  `UPDATE "MenuProduct" SET "activePDV" = true, "activeDelivery" = true`
);
console.log("Forçado:", r);
await prisma.$disconnect();
