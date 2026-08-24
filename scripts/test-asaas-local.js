const { getAsaasKey } = require('./asaas-key');
const key = getAsaasKey();

async function main() {
  console.log("Buscando pagamentos no Asaas com a chave do .env.local...");
  const res = await fetch('https://api.asaas.com/v3/payments?limit=100', {
    headers: {
      'access_token': key,
      'User-Agent': 'hakim-portal/1.0'
    }
  });

  const data = await res.json();
  if (!res.ok) {
    console.error("Erro Asaas:", data);
    return;
  }

  console.log(`✅ Sucesso! Retornados ${data.data.length} pagamentos.`);

  const match = data.data.find(p => 
    (p.description && p.description.includes('58TF5W')) ||
    (p.externalReference && p.externalReference.includes('58TF5W')) ||
    p.value === 3716.20 ||
    p.value === 3506.20
  );

  if (match) {
    console.log("\n=================== PAGAMENTO ENCONTRADO ===================");
    console.log(JSON.stringify(match, null, 2));
    console.log("===========================================================");
  } else {
    console.log("\nListando os 20 mais recentes do Asaas:");
    data.data.slice(0, 20).forEach(p => {
      console.log(`- ID: ${p.id} | Venc: ${p.dueDate} | Valor: R$ ${p.value} | Ref: ${p.externalReference} | Desc: ${p.description}`);
    });
  }
}

main().catch(console.error);
