const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanOrders() {
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  console.log("Old orders deleted");
}

cleanOrders().finally(() => prisma.$disconnect());
