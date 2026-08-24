const fs = require('fs');

const envLocal = fs.readFileSync('.env.local', 'utf8');
const keyLine = envLocal.split('\n').find(l => l.startsWith('ASAAS_API_KEY'));
let key = keyLine.split('=')[1].trim();
if (key.startsWith('"') || key.startsWith("'")) key = key.slice(1, -1);
key = key.replace(/\\/g, '');

const ASAAS_URL = "https://api.asaas.com/v3";
const headers = {
  "access_token": key,
  "User-Agent": "hakim-portal/1.0",
  "Content-Type": "application/json"
};

async function main() {
  const oldPaymentId = "pay_qn3jcoanpm293vb1";
  const customerId = "cus_000168659722";
  const correctValue = 3506.20;
  const externalRef = "cms4zind80001jl04ms58tf5w";
  const dueDate = "2026-08-04";

  console.log(`\n=================== EXECUTANDO CORREÇÃO ===================`);
  console.log(`1. Cancelando boleto antigo de R$ 3716.20 (${oldPaymentId})...`);

  try {
    const delRes = await fetch(`${ASAAS_URL}/payments/${oldPaymentId}`, {
      method: "DELETE",
      headers
    });
    const delData = await delRes.json();
    console.log(`   Resultado cancelamento:`, delRes.status, delData);
  } catch (e) {
    console.error("   Erro ao deletar boleto antigo:", e.message);
  }

  console.log(`\n2. Gerando novo boleto de R$ ${correctValue.toFixed(2)} com vencimento em ${dueDate}...`);
  const createRes = await fetch(`${ASAAS_URL}/payments`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      customer: customerId,
      billingType: "BOLETO",
      value: correctValue,
      dueDate: dueDate,
      description: "Pedido #58TF5W — Icebox Congelados",
      externalReference: externalRef
    })
  });

  const createData = await createRes.json();
  if (!createRes.ok) {
    console.error("❌ Erro ao criar novo boleto:", createData);
    return;
  }

  console.log("\n✅ NOVO BOLETO GERADO COM SUCESSO NO ASAAS!");
  console.log("ID:", createData.id);
  console.log("Valor:", createData.value);
  console.log("Vencimento:", createData.dueDate);
  console.log("URL Boleto PDF:", createData.bankSlipUrl);
  console.log("URL Fatura:", createData.invoiceUrl);
  console.log("Linha Digitável / Código:", createData.identificationField);
  console.log("===========================================================");
}

main().catch(console.error);
