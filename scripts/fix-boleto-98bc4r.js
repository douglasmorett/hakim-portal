// Script para regenerar boleto do pedido #98BC4R
// Cancela o antigo no Asaas e cria um novo com o total correto
require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ASAAS_KEY = process.env.ASAAS_API_KEY;
const ASAAS_URL = ASAAS_KEY?.startsWith("$aact_prod") 
  ? "https://api.asaas.com/v3" 
  : "https://sandbox.asaas.com/v3";

async function main() {
  // 1. Find order ending in 98BC4R
  const orders = await prisma.order.findMany({
    include: { items: { include: { product: true } }, user: true }
  });
  
  const order = orders.find(o => o.id.slice(-6).toUpperCase() === '98BC4R');
  
  if (!order) {
    console.error('Pedido #98BC4R não encontrado!');
    // Try to list recent orders
    const recent = orders.slice(-10).map(o => `${o.id.slice(-6).toUpperCase()} - R$ ${o.totalAmount} - ${o.status}`);
    console.log('Últimos pedidos:', recent);
    return;
  }

  console.log(`\n📦 Pedido encontrado: #${order.id.slice(-6).toUpperCase()}`);
  console.log(`   Cliente: ${order.user.name}`);
  console.log(`   Total: R$ ${order.totalAmount.toFixed(2)}`);
  console.log(`   Status: ${order.status}`);
  console.log(`   Asaas Payment ID: ${order.asaasPaymentId || 'NENHUM'}`);
  console.log(`   Boleto URL: ${order.boletoUrl || 'NENHUM'}`);
  console.log(`   Itens:`);
  order.items.forEach(i => {
    console.log(`     ${i.quantity}x ${i.product?.name || i.productId} - R$ ${i.price.toFixed(2)} (subtotal: R$ ${(i.price * i.quantity).toFixed(2)})`);
  });

  const newTotal = order.totalAmount;
  console.log(`\n💰 Total para novo boleto: R$ ${newTotal.toFixed(2)}`);

  // 2. Cancel old Asaas payment if exists
  if (order.asaasPaymentId) {
    console.log(`\n❌ Cancelando pagamento antigo: ${order.asaasPaymentId}...`);
    try {
      const delRes = await fetch(`${ASAAS_URL}/payments/${order.asaasPaymentId}`, {
        method: "DELETE",
        headers: { "access_token": ASAAS_KEY }
      });
      const delData = await delRes.json();
      console.log(`   Resultado: ${delRes.status}`, delData.deleted ? 'DELETADO' : JSON.stringify(delData));
    } catch (e) {
      console.log(`   Erro ao deletar (continuando): ${e.message}`);
    }
  }

  // 3. Find or get customer ID
  let customerId = null;
  if (order.user.cpfCnpj) {
    const searchRes = await fetch(`${ASAAS_URL}/customers?cpfCnpj=${order.user.cpfCnpj}`, {
      headers: { "access_token": ASAAS_KEY }
    });
    const searchData = await searchRes.json();
    if (searchData.data && searchData.data.length > 0) {
      customerId = searchData.data[0].id;
      console.log(`\n👤 Cliente Asaas encontrado: ${customerId} (${searchData.data[0].name})`);
    }
  }

  if (!customerId) {
    // Create customer
    const custRes = await fetch(`${ASAAS_URL}/customers`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "access_token": ASAAS_KEY },
      body: JSON.stringify({
        name: order.user.name,
        email: order.user.email,
        cpfCnpj: order.user.cpfCnpj || ""
      })
    });
    const custData = await custRes.json();
    customerId = custData.id;
    console.log(`\n👤 Cliente Asaas criado: ${customerId}`);
  }

  // 4. Create new payment
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 10);

  console.log(`\n💳 Criando novo boleto: R$ ${newTotal.toFixed(2)} - Vencimento: ${dueDate.toISOString().split("T")[0]}...`);
  
  const payRes = await fetch(`${ASAAS_URL}/payments`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "access_token": ASAAS_KEY },
    body: JSON.stringify({
      customer: customerId,
      billingType: "BOLETO",
      value: newTotal,
      dueDate: dueDate.toISOString().split("T")[0],
      description: `Pedido #${order.id.slice(-6).toUpperCase()} - Hakim B2B (Corrigido)`,
      externalReference: order.id
    })
  });
  
  const payData = await payRes.json();
  
  if (!payRes.ok) {
    console.error('❌ Erro ao criar pagamento:', payData);
    return;
  }

  const newBoletoUrl = payData.bankSlipUrl || payData.invoiceUrl;
  console.log(`\n✅ Novo pagamento criado!`);
  console.log(`   ID: ${payData.id}`);
  console.log(`   Boleto URL: ${newBoletoUrl}`);
  console.log(`   Invoice URL: ${payData.invoiceUrl}`);

  // 5. Update order in DB
  await prisma.order.update({
    where: { id: order.id },
    data: {
      boletoUrl: newBoletoUrl,
      asaasPaymentId: payData.id
    }
  });

  await prisma.orderHistory.create({
    data: {
      orderId: order.id,
      statusFrom: order.status,
      statusTo: order.status,
      actionBy: "Script Automático",
      actionEmail: "admin@hakim.com.br",
      notes: `Boleto regenerado via script. Antigo cancelado. Novo: ${payData.id} - R$ ${newTotal.toFixed(2)}`
    }
  });

  console.log(`\n🎉 Pedido atualizado no banco com novo boleto!`);
  console.log(`   O cliente já pode acessar o novo link de pagamento.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
