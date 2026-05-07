// Script para:
// 1. Ajustar preço da Carne Moída Temperada 5kg para R$ 201.50 no pedido #2QCC37
// 2. Cancelar boleto antigo no Asaas
// 3. Criar novo boleto com valor correto
require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ASAAS_KEY = process.env.ASAAS_API_KEY;
const ASAAS_URL = ASAAS_KEY?.startsWith("$aact_prod") 
  ? "https://api.asaas.com/v3" 
  : "https://sandbox.asaas.com/v3";

async function main() {
  const orders = await prisma.order.findMany({
    include: { items: { include: { product: true } }, user: true }
  });
  
  const order = orders.find(o => o.id.slice(-6).toUpperCase() === '2QCC37');
  
  if (!order) {
    console.error('Pedido #2QCC37 não encontrado!');
    return;
  }

  console.log(`\n📦 Pedido #${order.id.slice(-6).toUpperCase()}`);
  console.log(`   Cliente: ${order.user.name}`);
  console.log(`   Total atual: R$ ${order.totalAmount.toFixed(2)}`);
  console.log(`   Itens:`);
  order.items.forEach(i => {
    console.log(`     ${i.quantity}x ${i.product?.name || '?'} - R$ ${i.price.toFixed(2)} (sub: R$ ${(i.price * i.quantity).toFixed(2)})`);
  });

  // 1. Find the Carne Moída item and update its price to 201.50
  const carneItem = order.items.find(i => 
    i.product?.name?.toLowerCase().includes('carne') && 
    i.product?.name?.toLowerCase().includes('mo')
  );

  if (carneItem) {
    console.log(`\n🥩 Encontrado: ${carneItem.product.name} - Preço atual: R$ ${carneItem.price.toFixed(2)}`);
    console.log(`   Atualizando preço para R$ 201.50...`);
    
    await prisma.orderItem.update({
      where: { id: carneItem.id },
      data: { price: 201.50 }
    });
    console.log(`   ✅ Preço atualizado!`);
  } else {
    console.log('⚠️ Item de Carne Moída não encontrado, verificando todos os itens...');
    order.items.forEach(i => console.log(`   - ${i.product?.name}`));
  }

  // 2. Recalculate total
  const updatedOrder = await prisma.order.findUnique({
    where: { id: order.id },
    include: { items: true }
  });
  
  const newTotal = updatedOrder.items.reduce((acc, i) => acc + (i.price * i.quantity), 0);
  console.log(`\n💰 Novo total calculado: R$ ${newTotal.toFixed(2)} (antes: R$ ${order.totalAmount.toFixed(2)})`);

  // Update order total
  await prisma.order.update({
    where: { id: order.id },
    data: { totalAmount: newTotal }
  });

  // 3. Cancel old Asaas payment
  if (order.asaasPaymentId) {
    console.log(`\n❌ Cancelando boleto antigo: ${order.asaasPaymentId}...`);
    try {
      const delRes = await fetch(`${ASAAS_URL}/payments/${order.asaasPaymentId}`, {
        method: "DELETE",
        headers: { "access_token": ASAAS_KEY }
      });
      const delData = await delRes.json();
      console.log(`   Resultado: ${delRes.status}`, delData.deleted ? 'DELETADO' : JSON.stringify(delData));
    } catch (e) {
      console.log(`   Erro ao deletar: ${e.message}`);
    }
  }

  // 4. Find customer in Asaas
  let customerId = null;
  if (order.user.cpfCnpj) {
    const res = await fetch(`${ASAAS_URL}/customers?cpfCnpj=${order.user.cpfCnpj}`, {
      headers: { "access_token": ASAAS_KEY }
    });
    const data = await res.json();
    if (data.data?.length > 0) {
      customerId = data.data[0].id;
      console.log(`\n👤 Cliente: ${customerId}`);
    }
  }
  if (!customerId) {
    const res = await fetch(`${ASAAS_URL}/customers`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "access_token": ASAAS_KEY },
      body: JSON.stringify({ name: order.user.name, email: order.user.email, cpfCnpj: order.user.cpfCnpj || "" })
    });
    customerId = (await res.json()).id;
  }

  // 5. Create new payment
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 10);

  console.log(`\n💳 Criando novo boleto: R$ ${newTotal.toFixed(2)}...`);
  const payRes = await fetch(`${ASAAS_URL}/payments`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "access_token": ASAAS_KEY },
    body: JSON.stringify({
      customer: customerId,
      billingType: "BOLETO",
      value: newTotal,
      dueDate: dueDate.toISOString().split("T")[0],
      description: `Pedido #2QCC37 - Hakim B2B (Carne corrigida R$201.50)`,
      externalReference: order.id
    })
  });
  
  const payData = await payRes.json();
  if (!payRes.ok) { console.error('Erro:', payData); return; }

  const newBoletoUrl = payData.bankSlipUrl || payData.invoiceUrl;
  console.log(`✅ Novo boleto: ${payData.id}`);
  console.log(`   URL: ${newBoletoUrl}`);

  // 6. Update DB
  await prisma.order.update({
    where: { id: order.id },
    data: { boletoUrl: newBoletoUrl, asaasPaymentId: payData.id }
  });

  await prisma.orderHistory.create({
    data: {
      orderId: order.id, statusFrom: order.status, statusTo: order.status,
      actionBy: "Script Correção", actionEmail: "admin@hakim.com.br",
      notes: `Preço carne moída corrigido para R$201.50. Total: R$${newTotal.toFixed(2)}. Boleto antigo cancelado, novo: ${payData.id}`
    }
  });

  console.log(`\n🎉 Tudo pronto! Pedido #2QCC37 atualizado.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
