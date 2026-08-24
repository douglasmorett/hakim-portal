const https = require('https');

const { getAsaasKey } = require('./asaas-key');
const asaasKey = getAsaasKey();

function fetchAsaas(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.asaas.com',
      path,
      method: 'GET',
      headers: {
        'access_token': asaasKey.replace(/\\/g, ''),
        'User-Agent': 'hakim-portal/1.0'
      }
    };
    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  console.log("Buscando pagamentos no Asaas...");
  const data = await fetchAsaas('/v3/payments?limit=50');
  if (!data.data) {
    console.log("Resposta inesperada:", data);
    return;
  }
  
  console.log(`Retornados ${data.data.length} pagamentos do Asaas.`);
  
  const target = data.data.find(p => 
    p.value === 3716.20 || 
    p.value === 3506.20 || 
    (p.description && p.description.includes('58TF5W')) ||
    (p.externalReference && p.externalReference.includes('58TF5W'))
  );

  if (target) {
    console.log("\n=== PAGAMENTO ENCONTRADO NO ASAAS ===");
    console.log(JSON.stringify(target, null, 2));
  } else {
    console.log("\nBusca rápida não encontrou exato 3716.20/58TF5W. Listando os 10 mais recentes:");
    data.data.slice(0, 10).forEach(p => {
      console.log(`- ID: ${p.id} | Data: ${p.dueDate} | Valor: R$ ${p.value} | Ref: ${p.externalReference} | Desc: ${p.description}`);
    });
  }
}

main().catch(console.error);
