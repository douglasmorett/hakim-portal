require('dotenv').config();

let rawKey = process.env.ASAAS_API_KEY || '';
rawKey = rawKey.replace(/\\/g, '').trim();

if (!rawKey.startsWith('$') && rawKey.startsWith('aact_')) {
  rawKey = '$' + rawKey;
}

console.log("Chave formatada:", rawKey.substring(0, 15) + "...");

async function main() {
  const isProd = rawKey.includes('aact_prod');
  const baseUrl = isProd ? "https://api.asaas.com/v3" : "https://sandbox.asaas.com/v3";
  console.log("Usando URL:", baseUrl);

  const res = await fetch(`${baseUrl}/payments?limit=50`, {
    headers: {
      "access_token": rawKey,
      "User-Agent": "hakim-portal/1.0"
    }
  });

  const data = await res.json();
  if (!res.ok) {
    console.error("Erro Asaas:", data);
    return;
  }

  console.log(`Sucesso! Retornados ${data.data?.length} pagamentos.`);

  const match = data.data.find(p => 
    p.value === 3716.20 || 
    p.value === 3506.20 ||
    (p.description && p.description.toUpperCase().includes('58TF5W')) ||
    (p.externalReference && p.externalReference.toUpperCase().includes('58TF5W'))
  );

  if (match) {
    console.log("\n=== PAGAMENTO ENCONTRADO NO ASAAS ===");
    console.log(JSON.stringify(match, null, 2));
  } else {
    console.log("\nPagamento exato de 3716.20/58TF5W não encontrado na primeira página. Listando os 15 mais recentes:");
    data.data.slice(0, 15).forEach(p => {
      console.log(`- ID: ${p.id} | Venc: ${p.dueDate} | Valor: R$ ${p.value} | Criado: ${p.dateCreated} | Ref: ${p.externalReference} | Desc: ${p.description}`);
    });
  }
}

main().catch(console.error);
