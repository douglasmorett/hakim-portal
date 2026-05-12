/**
 * Cancela links antigos do Asaas (com valor errado) e cria novos com valor correto
 * Para pedidos #98BC4R e #2QCC37
 */
require('dotenv').config({path:'.env'});
require('dotenv').config({path:'.env.local',override:true});
const {PrismaClient}=require('@prisma/client');

const prisma = new PrismaClient();
const ASAAS_KEY = process.env.ASAAS_API_KEY;
const ASAAS_BASE = "https://api.asaas.com/v3";

async function main() {
  // Buscar os 2 pedidos que tinham links antigos com valor errado
  const orders = await prisma.order.findMany({
    where: {
      asaasPaymentId: { in: ["pay_rvn1nflordakazb7", "pay_lxg8q5ulsjguk48t"] }
    },
    include: {
      user: { select: { name: true, email: true, cpfCnpj: true } }
    }
  });

  console.log(`📋 ${orders.length} pedidos para recriar links:\n`);

  for (const order of orders) {
    const shortId = order.id.slice(-6).toUpperCase();
    console.log(`\n${"═".repeat(50)}`);
    console.log(`📦 #${shortId} | R$ ${order.totalAmount.toFixed(2)} | Asaas antigo: ${order.asaasPaymentId}`);

    // 1. Cancelar o antigo
    console.log("   🗑️  Cancelando link antigo...");
    try {
      const delRes = await fetch(`${ASAAS_BASE}/payments/${order.asaasPaymentId}`, {
        method: "DELETE",
        headers: { access_token: ASAAS_KEY }
      });
      if (delRes.ok) {
        console.log("   ✅ Link antigo cancelado!");
      } else {
        const err = await delRes.json();
        console.log(`   ⚠️  ${JSON.stringify(err)}`);
      }
    } catch(e) { console.log(`   ⚠️  ${e.message}`); }

    // 2. Buscar customer
    let customerId = null;
    if (order.user.cpfCnpj) {
      const searchRes = await fetch(
        `${ASAAS_BASE}/customers?cpfCnpj=${encodeURIComponent(order.user.cpfCnpj)}`,
        { headers: { access_token: ASAAS_KEY } }
      );
      const searchData = await searchRes.json();
      if (searchData.data?.length > 0) customerId = searchData.data[0].id;
    }

    if (!customerId) {
      const createRes = await fetch(`${ASAAS_BASE}/customers`, {
        method: "POST",
        headers: { "Content-Type": "application/json", access_token: ASAAS_KEY },
        body: JSON.stringify({
          name: order.user.name || order.user.email,
          email: order.user.email,
          cpfCnpj: order.user.cpfCnpj || ""
        })
      });
      const d = await createRes.json();
      customerId = d.id;
    }

    // 3. Criar novo link com valor correto
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 10);

    console.log(`   📄 Criando novo link R$ ${order.totalAmount.toFixed(2)}...`);
    const payRes = await fetch(`${ASAAS_BASE}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", access_token: ASAAS_KEY },
      body: JSON.stringify({
        customer: customerId,
        billingType: "BOLETO",
        value: order.totalAmount,
        dueDate: dueDate.toISOString().split("T")[0],
        description: `Pedido #${shortId} — Hakim Congelados (CORRIGIDO)`,
        externalReference: order.id
      })
    });
    const payData = await payRes.json();

    if (payRes.ok) {
      const newUrl = payData.invoiceUrl || payData.bankSlipUrl;
      await prisma.order.update({
        where: { id: order.id },
        data: { boletoUrl: newUrl, asaasPaymentId: payData.id }
      });
      console.log(`   ✅ NOVO link criado!`);
      console.log(`   🆔 ${payData.id}`);
      console.log(`   🔗 ${newUrl}`);
    } else {
      console.log(`   ❌ Erro: ${JSON.stringify(payData)}`);
    }
  }

  console.log(`\n✅ Concluído!`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
