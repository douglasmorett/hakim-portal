const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function importData() {
  const fileContent = fs.readFileSync('db-export.json', 'utf-8');
  const data = JSON.parse(fileContent);

  console.log("Importing users...");
  for (const user of data.users) {
    await prisma.user.create({ data: user });
  }

  console.log("Importing products...");
  for (const product of data.products) {
    await prisma.product.create({ data: product });
  }

  console.log("Importing routes...");
  for (const route of data.routes) {
    await prisma.routeSchedule.create({ data: route });
  }

  console.log("Data imported successfully to PostgreSQL!");
}

importData().catch(console.error).finally(() => prisma.$disconnect());
