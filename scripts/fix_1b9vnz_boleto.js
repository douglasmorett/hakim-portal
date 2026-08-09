const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const envProdPath = path.join(process.cwd(), '.env.vercel.prod');
if (fs.existsSync(envProdPath)) {
  const parsed = dotenv.parse(fs.readFileSync(envProdPath));
  Object.keys(parsed).forEach(k => {
    let val = parsed[k] || '';
    val = val.trim().replace(/^["']|["']$/g, '');
    process.env[k] = val;
  });
}

const firehubDbUrl = (process.env.FIREHUB_DATABASE_URL || process.env.DATABASE_URL || '').trim().replace(/^["']|["']$/g, '');
process.env.DATABASE_URL = firehubDbUrl;

const { PrismaClient } = require('@prisma/client');
const prismaFirehub = new PrismaClient({ datasources: { db: { url: firehubDbUrl } } });

function getAsaasKey() {
  let key = process.env.ASAAS_API_KEY_B64 
    ? Buffer.from(process.env.ASAAS_API_KEY_B64, 'base64').toString('utf8')
    : process.env.ASAAS_API_KEY;
  if (!key) return null;
  key = key.trim().replace(/[\r\n\t]/g, '').replace(/\\/g, '');
  if (!key.startsWith('$') && key.startsWith('aact_')) key = '$' + key;
  return key;
}

async function main() {
  const orderId = "cmsf0noc80004kw04w61b9vnz"; // #1B9VNZ
  const order = await prismaFirehub.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      totalAmount: true,
      status: true,
      asaasPaymentId: true,
      user: { select: { id: true, name: true, email: true, cpfCnpj: true } }
    }
  });

  if (!order) {
    console.error('❌ Order #1B9VNZ not found in Firehub DB!');
    return;
  }

  console.log(`📦 Order: #${order.id.slice(-6).toUpperCase()}`);
  console.log(`   User: ${order.user.name} (${order.user.email})`);
  console.log(`   DB Total Amount: R$ ${order.totalAmount.toFixed(2)}`);
  console.log(`   Old Asaas Payment ID: ${order.asaasPaymentId || 'N/A'}`);

  const asaasKey = getAsaasKey();
  if (!asaasKey) {
    console.error('❌ ASAAS_API_KEY not configured or invalid');
    return;
  }

  const BASE = asaasKey.includes('aact_prod') ? "https://api.asaas.com/v3" : "https://sandbox.asaas.com/v3";
  const headers = {
    "access_token": asaasKey,
    "Content-Type": "application/json",
    "User-Agent": "hakim-portal/1.0"
  };

  // 1. Cancel old payment if exists
  if (order.asaasPaymentId) {
    console.log(`\n❌ Cancelling old Asaas payment: ${order.asaasPaymentId}...`);
    try {
      const delRes = await fetch(`${BASE}/payments/${order.asaasPaymentId}`, { method: "DELETE", headers });
      const text = await delRes.text();
      try {
        const delData = JSON.parse(text);
        console.log(`   Result (${delRes.status}):`, delData.deleted ? 'DELETED ✅' : JSON.stringify(delData));
      } catch {
        console.log(`   Result (${delRes.status}):`, text.substring(0, 200));
      }
    } catch (e) {
      console.warn('   Cancel warning:', e.message);
    }
  }

  // 2. Get customer ID
  let customerId = null;
  if (order.user.cpfCnpj) {
    const searchRes = await fetch(`${BASE}/customers?cpfCnpj=${encodeURIComponent(order.user.cpfCnpj.trim())}`, { headers });
    if (searchRes.ok) {
      const data = await searchRes.json();
      if (data.data?.length > 0) customerId = data.data[0].id;
    }
  }

  if (!customerId) {
    const createRes = await fetch(`${BASE}/customers`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: order.user.name || order.user.email,
        email: order.user.email,
        cpfCnpj: order.user.cpfCnpj || ""
      })
    });
    if (createRes.ok) {
      customerId = (await createRes.json()).id;
    }
  }

  if (!customerId) {
    console.error('❌ Failed to get or create Asaas customer');
    return;
  }

  // 3. Create new payment with exact DB totalAmount (R$ 5277.30)
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 10);
  const dueDateStr = dueDate.toISOString().split("T")[0];
  const shortId = order.id.slice(-6).toUpperCase();

  console.log(`\n💳 Creating new Asaas boleto for R$ ${order.totalAmount.toFixed(2)} (due: ${dueDateStr})...`);
  const payRes = await fetch(`${BASE}/payments`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      customer: customerId,
      billingType: "BOLETO",
      value: order.totalAmount,
      dueDate: dueDateStr,
      description: `Pedido #${shortId} — Icebox Congelados`,
      externalReference: order.id
    })
  });

  const payData = await payRes.json();
  if (!payRes.ok || !payData.id) {
    console.error('❌ Failed to create Asaas payment:', payData);
    return;
  }

  const newBoletoUrl = payData.invoiceUrl || payData.bankSlipUrl || null;
  console.log(`\n🎉 NEW ASAAS BOLETO CREATED SUCCESSFULLY!`);
  console.log(`   ID: ${payData.id}`);
  console.log(`   Value: R$ ${payData.value}`);
  console.log(`   Boleto Link: ${newBoletoUrl}`);

  // 4. Update order in Firehub DB
  await prismaFirehub.order.update({
    where: { id: order.id },
    data: {
      asaasPaymentId: payData.id,
      boletoUrl: newBoletoUrl
    }
  });

  await prismaFirehub.orderHistory.create({
    data: {
      orderId: order.id,
      statusFrom: order.status,
      statusTo: order.status,
      actionBy: "Suporte (Script de Correção)",
      actionEmail: "admin@hakim.com.br",
      notes: `Boleto recriado. Boleto antigo incorreto (pay_u6vlgpcjbjmn6ht7) cancelado no Asaas. Novo boleto: ${payData.id} - R$ ${order.totalAmount.toFixed(2)}`
    }
  });

  console.log(`\n✅ Order #${shortId} updated in Firehub database with new boleto!`);
}

main().catch(console.error).finally(() => prismaFirehub.$disconnect());
