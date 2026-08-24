const fs = require('fs');

const env = fs.readFileSync('.env', 'utf8');
const line = env.split('\n').find(l => l.startsWith('ASAAS_API_KEY'));
let key = line.split('=')[1].trim();
if (key.startsWith('"') || key.startsWith("'")) key = key.slice(1, -1);
key = key.replace(/\\/g, '');

async function run() {
  console.log("Tentando chave Asaas:", key.substring(0, 15) + "...");
  const res = await fetch('https://api.asaas.com/v3/payments?limit=100', {
    headers: { 'access_token': key, 'User-Agent': 'hakim-portal/1.0' }
  });
  const data = await res.json();
  if (!res.ok) {
    console.error("Erro Asaas:", data);
    return;
  }

  console.log(`Buscando em ${data.data.length} pagamentos...`);

  // Procurar por 58TF5W ou 3716.20 ou SHOPPING RO
  const match = data.data.find(p => 
    (p.description && p.description.includes('58TF5W')) ||
    (p.externalReference && p.externalReference.includes('58TF5W')) ||
    p.value === 3716.20
  );

  if (match) {
    console.log("\n=================== PAGAMENTO ENCONTRADO ===================");
    console.log(JSON.stringify(match, null, 2));
    console.log("===========================================================");
  } else {
    console.log("\nNão encontrado exato nas primeiras 100 cobranças. Listando os 10 mais recentes:");
    data.data.slice(0, 10).forEach(p => {
      console.log(`- ID: ${p.id} | Venc: ${p.dueDate} | Valor: R$ ${p.value} | Desc: ${p.description}`);
    });
  }
}

run().catch(console.error);
