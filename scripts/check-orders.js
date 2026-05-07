require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const orders = await p.order.findMany({ include: { user: true } });
  
  // Check both orders
  for (const suffix of ['2QCC37', '98BC4R']) {
    const o = orders.find(o => o.id.slice(-6).toUpperCase() === suffix);
    if (o) {
      console.log(`\n--- #${suffix} ---`);
      console.log('Full ID:', o.id);
      console.log('asaasPaymentId:', o.asaasPaymentId);
      console.log('boletoUrl:', o.boletoUrl);
      console.log('Total:', o.totalAmount);
      console.log('Status:', o.status);
    } else {
      console.log(`#${suffix}: NÃO ENCONTRADO`);
    }
  }
}

main().finally(() => p.$disconnect());
