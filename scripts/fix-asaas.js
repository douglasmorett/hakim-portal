// Script para cancelar boletos antigos e recriar com valores corretos
require('dotenv').config();

let ASAAS_KEY = process.env.ASAAS_API_KEY;
if (ASAAS_KEY) ASAAS_KEY = ASAAS_KEY.replace(/\\/g, '');
const isProd = ASAAS_KEY?.includes('aact_prod');
const ASAAS_URL = isProd ? "https://api.asaas.com/v3" : "https://sandbox.asaas.com/v3";

async function apiCall(path, method = 'GET', body = null) {
  const opts = { method, headers: { "access_token": ASAAS_KEY } };
  if (body) { opts.headers["Content-Type"] = "application/json"; opts.body = JSON.stringify(body); }
  const res = await fetch(`${ASAAS_URL}${path}`, opts);
  const text = await res.text();
  try { return { ok: res.ok, status: res.status, data: JSON.parse(text) }; }
  catch { return { ok: res.ok, status: res.status, data: text.substring(0, 300) }; }
}

async function cancelAndRecreate(oldPaymentId, customerId, newValue, description, externalRef) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📋 Processando: ${description}`);
  console.log(`   Valor: R$ ${newValue.toFixed(2)}`);
  
  // 1. Cancel old payment
  console.log(`   ❌ Cancelando ${oldPaymentId}...`);
  const delResult = await apiCall(`/payments/${oldPaymentId}`, 'DELETE');
  console.log(`      Status: ${delResult.status} - ${delResult.data?.deleted ? 'DELETADO ✅' : JSON.stringify(delResult.data).substring(0, 100)}`);

  // 2. Create new payment
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 10);
  
  console.log(`   💳 Criando novo boleto R$ ${newValue.toFixed(2)} venc ${dueDate.toISOString().split('T')[0]}...`);
  const createResult = await apiCall('/payments', 'POST', {
    customer: customerId,
    billingType: "BOLETO",
    value: newValue,
    dueDate: dueDate.toISOString().split("T")[0],
    description: description,
    externalReference: externalRef
  });

  if (createResult.ok) {
    const p = createResult.data;
    console.log(`   ✅ NOVO BOLETO CRIADO!`);
    console.log(`      ID: ${p.id}`);
    console.log(`      Boleto: ${p.bankSlipUrl}`);
    console.log(`      Invoice: ${p.invoiceUrl}`);
    console.log(`      Valor: R$ ${p.value}`);
    return p;
  } else {
    console.error(`   ❌ ERRO ao criar:`, createResult.data);
    return null;
  }
}

async function main() {
  console.log(`🔑 ${isProd ? 'PRODUÇÃO' : 'SANDBOX'} - ${ASAAS_URL}\n`);

  // Pedido #2QCC37 - Carne corrigida para R$ 201.50 - Novo total: R$ 1337.30
  // Customer: cus_000168659722 (HAKIM FRANQUIA SHOPPING RO)
  await cancelAndRecreate(
    'pay_or4m205510nw0taf',
    'cus_000168659722',
    1337.30,
    'Pedido #2QCC37 - Hakim B2B (Carne Moída corrigida R$201.50)',
    'cmoudgv340001k404u12qcc37'
  );

  // Pedido #98BC4R - Valor já correto R$ 4221.50, só regenerar boleto
  // Customer: cus_000167771543 (HAKIM FRANQUIA CENTRO)
  await cancelAndRecreate(
    'pay_4orjyu94cdtiq457',
    'cus_000167771543',
    4221.50,
    'Pedido #98BC4R - Hakim B2B (Boleto Regenerado)',
    'cmoudefyo0007jr043198bc4r'
  );

  console.log(`\n${'='.repeat(60)}`);
  console.log('🎉 Processo finalizado! Os novos boletos estão disponíveis.');
}

main().catch(console.error);
