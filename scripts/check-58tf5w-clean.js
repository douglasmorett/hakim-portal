const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');
dotenv.config();

let dbUrl = process.env.DATABASE_URL;
if (dbUrl) {
  dbUrl = dbUrl.replace('&channel_binding=require', '').replace('channel_binding=require&', '');
}

const prisma = new PrismaClient({
  datasources: {
    db: { url: dbUrl }
  }
});

async function main() {
  console.log("Conectando ao banco...");
  const orders = await prisma.order.findMany({
    include: {
      items: { include: { product: true } },
      user: true,
      history: true
    }
  });

  console.log(`Total de pedidos encontrados: ${orders.length}`);
  const match = orders.find(o => o.id.slice(-6).toUpperCase() === '58TF5W');

  if (match) {
    console.log("=== PEDIDO ENCONTRADO EM HAKIM DB ===");
    console.log(JSON.stringify(match, null, 2));
  } else {
    console.log("Pedido 58TF5W não encontrado no DB Hakim principal. Mostrando os pedidos no banco:");
    orders.forEach(o => {
      console.log(`- ID: ${o.id} (#${o.id.slice(-6).toUpperCase()}) | Total: R$ ${o.totalAmount} | EmergencyFine: R$ ${o.emergencyFine || 0} | User: ${o.user?.name || o.user?.email}`);
    });
  }
}

main().catch(err => {
  console.error("ERRO:", err);
}).finally(() => prisma.$disconnect());
