const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function exportData() {
  const users = await prisma.user.findMany();
  const products = await prisma.product.findMany();
  const routes = await prisma.routeSchedule.findMany();
  
  const data = {
    users,
    products,
    routes
  };

  fs.writeFileSync('db-export.json', JSON.stringify(data, null, 2));
  console.log("Data exported successfully to db-export.json");
}

exportData().catch(console.error).finally(() => prisma.$disconnect());
