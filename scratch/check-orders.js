const { PrismaClient } = require('@prisma/client');

async function main() {
  // Hakim DB (DATABASE_URL)
  const prisma = new PrismaClient();
  
  // FireHub DB (FIREHUB_DATABASE_URL)
  const prismaFirehub = new PrismaClient({
    datasourceUrl: process.env.FIREHUB_DATABASE_URL || process.env.DATABASE_URL,
  });

  console.log("=== Verificação de Pedidos ===\n");
  console.log("DATABASE_URL:", process.env.DATABASE_URL ? "SET" : "NOT SET");
  console.log("FIREHUB_DATABASE_URL:", process.env.FIREHUB_DATABASE_URL ? "SET" : "NOT SET");
  console.log("");

  try {
    const hakimCount = await prisma.order.count();
    console.log("Hakim DB - Total de pedidos:", hakimCount);
    
    const hakimActive = await prisma.order.count({ where: { status: { not: "CANCELADO" } } });
    console.log("Hakim DB - Pedidos ativos (não cancelados):", hakimActive);
    
    const hakimRecent = await prisma.order.findMany({ 
      take: 5, 
      orderBy: { createdAt: 'desc' },
      select: { id: true, status: true, totalAmount: true, createdAt: true }
    });
    console.log("Hakim DB - Últimos 5 pedidos:", JSON.stringify(hakimRecent, null, 2));
  } catch (e) {
    console.error("Hakim DB ERROR:", e.message);
  }

  console.log("\n---\n");

  try {
    const fbCount = await prismaFirehub.order.count();
    console.log("FireHub DB - Total de pedidos:", fbCount);
    
    const fbActive = await prismaFirehub.order.count({ where: { status: { not: "CANCELADO" } } });
    console.log("FireHub DB - Pedidos ativos (não cancelados):", fbActive);
    
    const fbRecent = await prismaFirehub.order.findMany({ 
      take: 5, 
      orderBy: { createdAt: 'desc' },
      select: { id: true, status: true, totalAmount: true, createdAt: true }
    });
    console.log("FireHub DB - Últimos 5 pedidos:", JSON.stringify(fbRecent, null, 2));
  } catch (e) {
    console.error("FireHub DB ERROR:", e.message);
  }

  await prisma.$disconnect();
  await prismaFirehub.$disconnect();
}

main();
