const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPrices() {
  try {
    console.log("--- PRODUTOS E PREÇOS ---");
    const products = await prisma.product.findMany({
      select: { name: true, price: true }
    });
    console.table(products);

    console.log("\n--- ÚLTIMOS PEDIDOS ---");
    const orders = await prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: { product: true }
        }
      }
    });

    orders.forEach(order => {
      let calcTotal = 0;
      console.log(`Pedido #${order.id.slice(-6).toUpperCase()} - Total no Banco: R$ ${order.totalAmount}`);
      order.items.forEach(item => {
        calcTotal += item.price * item.quantity;
        console.log(`  - ${item.product.name}: ${item.quantity} x R$ ${item.price}`);
      });
      console.log(`  Calculado: R$ ${calcTotal} (${calcTotal === order.totalAmount ? '✅ OK' : '❌ ERRO'})`);
    });

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

checkPrices();
