const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedRoutes() {
  console.log("Seeding routes...");
  
  // Clear existing
  await prisma.routeSchedule.deleteMany();

  const routes = [
    { cityName: "Rio das Ostras", deliveryDay: 5 }, // Sexta
    { cityName: "Rio das Ostras", deliveryDay: 2 }, // Terça
    { cityName: "Unamar", deliveryDay: 5 }, // Sexta
    { cityName: "Macaé", deliveryDay: 2 } // Terça
  ];

  for (const route of routes) {
    await prisma.routeSchedule.create({ data: route });
  }

  console.log("Routes seeded successfully!");
}

seedRoutes()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
