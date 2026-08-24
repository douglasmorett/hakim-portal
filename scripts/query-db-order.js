require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

let dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  const fs = require('fs');
  const env = fs.readFileSync('.env', 'utf8');
  const line = env.split('\n').find(l => l.startsWith('DATABASE_URL'));
  dbUrl = line.split('=')[1].replace(/^["']|["']$/g, '').trim();
}

console.log("Conectando ao DB:", dbUrl.substring(0, 35) + "...");
const sql = neon(dbUrl);

async function main() {
  const orderId = 'cms4zind80001jl04ms58tf5w';
  
  const orders = await sql`
    SELECT * FROM "Order" WHERE id = ${orderId} OR id ILIKE '%58TF5W%'
  `;

  if (orders.length === 0) {
    console.log("Order não encontrada por ID/shortId. Buscando últimos 5 pedidos:");
    const recent = await sql`SELECT id, "totalAmount", status, "createdAt", "isEmergency", "emergencyFine" FROM "Order" ORDER BY "createdAt" DESC LIMIT 5`;
    console.log(recent);
    return;
  }

  const o = orders[0];
  console.log("\n=================== PEDIDO HAKIM DB ===================");
  console.log("ID:", o.id);
  console.log("Short ID:", o.id.slice(-6).toUpperCase());
  console.log("Total registado (totalAmount):", o.totalAmount);
  console.log("Status:", o.status);
  console.log("É Emergência?:", o.isEmergency);
  console.log("Multa Emergência:", o.emergencyFine);
  console.log("Asaas Payment ID:", o.asaasPaymentId);
  console.log("Boleto URL:", o.boletoUrl);
  console.log("Motivo Cancelamento / Obs:", o.cancelReason, o.rejectionReason);

  const items = await sql`
    SELECT oi.*, p.name as product_name
    FROM "OrderItem" oi
    LEFT JOIN "Product" p ON oi."productId" = p.id
    WHERE oi."orderId" = ${o.id}
  `;

  console.log("\n--- ITENS ---");
  let sum = 0;
  items.forEach(i => {
    const sub = i.quantity * i.price;
    sum += sub;
    console.log(`• ${i.quantity}x ${i.product_name} (R$ ${i.price} un) = R$ ${sub.toFixed(2)}`);
  });

  console.log("\nSoma calculada dos itens no DB:", sum.toFixed(2));
  console.log("Diferença (totalAmount no DB - soma itens):", (o.totalAmount - sum).toFixed(2));

  const history = await sql`
    SELECT * FROM "OrderHistory" WHERE "orderId" = ${o.id} ORDER BY "createdAt" ASC
  `;
  console.log("\n--- HISTÓRICO ---");
  console.log(history);
}

main().catch(console.error);
