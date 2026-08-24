require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const orders = await prisma.order.findMany({
    include: {
      items: { include: { product: true } },
      user: true,
      history: true
    }
  });

  console.log(`Total pedidos no DB Hakim: ${orders.length}`);
  const match = orders.find(o => o.id.slice(-6).toUpperCase() === '58TF5W');

  if (match) {
    console.log("=== PEDIDO ENCONTRADO EM HAKIM DB ===");
    console.log(JSON.stringify(match, null, 2));
  } else {
    console.log("Pedido 58TF5W não encontrado no DB Hakim principal.");
    console.log("Lista de IDs (últimos 6 caracteres):");
    orders.forEach(o => console.log(`- #${o.id.slice(-6).toUpperCase()} | Total: R$ ${o.totalAmount} | EmergencyFine: R$ ${o.emergencyFine || 0} | User: ${o.user?.name || o.user?.email}`));
  }
}

main().finally(() => prisma.$disconnect());
