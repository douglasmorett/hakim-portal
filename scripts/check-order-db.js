const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const envLocal = fs.readFileSync('.env.local', 'utf8');
const line = envLocal.split('\n').find(l => l.startsWith('DATABASE_URL'));
let dbUrl = line.split('=')[1].trim();
if (dbUrl.startsWith('"') || dbUrl.startsWith("'")) dbUrl = dbUrl.slice(1, -1);

const prisma = new PrismaClient({
  datasources: { db: { url: dbUrl } }
});

async function main() {
  console.log("Conectando ao Neon via .env.local...");

  const order = await prisma.order.findUnique({
    where: { id: "cms4zind80001jl04ms58tf5w" },
    include: {
      items: { include: { product: true } },
      user: true,
      history: true
    }
  });

  if (!order) {
    console.log("Pedido cms4zind80001jl04ms58tf5w não encontrado pelo ID exato. Buscando os mais recentes...");
    const orders = await prisma.order.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: { items: { include: { product: true } }, user: true }
    });
    orders.forEach(o => console.log(o.id, o.id.slice(-6).toUpperCase(), o.totalAmount));
    return;
  }

  console.log("\n=================== DETALHES DO PEDIDO NO BANCO ===================");
  console.log("ID:", order.id);
  console.log("Total no Banco (totalAmount):", order.totalAmount);
  console.log("Status:", order.status);
  console.log("É Emergência?:", order.isEmergency);
  console.log("Multa Emergência (emergencyFine):", order.emergencyFine);
  console.log("Asaas Payment ID:", order.asaasPaymentId);
  console.log("Boleto URL:", order.boletoUrl);
  console.log("Cliente:", order.user?.name, `(${order.user?.email})`);
  console.log("\nItens no Banco:");
  let sumItems = 0;
  order.items.forEach(item => {
    const itemSubtotal = item.price * item.quantity;
    sumItems += itemSubtotal;
    console.log(`- ${item.quantity}x ${item.product?.name} | R$ ${item.price} cada | Subtotal: R$ ${itemSubtotal}`);
  });
  console.log("\nSoma dos Itens:", sumItems);
  console.log("Diferença (totalAmount - Soma dos Itens):", order.totalAmount - sumItems);
  console.log("\nHistórico do Pedido:");
  console.log(JSON.stringify(order.history, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
