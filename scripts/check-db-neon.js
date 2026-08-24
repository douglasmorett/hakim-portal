const { neon } = require('@neondatabase/serverless');
const fs = require('fs');

const envLocal = fs.readFileSync('.env.local', 'utf8');
const line = envLocal.split('\n').find(l => l.startsWith('DATABASE_URL'));
let dbUrl = line.split('=')[1].trim();
if (dbUrl.startsWith('"') || dbUrl.startsWith("'")) dbUrl = dbUrl.slice(1, -1);

const sql = neon(dbUrl);

async function main() {
  console.log("Consultando Neon via HTTP (@neondatabase/serverless)...");
  
  const orders = await sql`
    SELECT id, "totalAmount", status, "isEmergency", "emergencyFine", "asaasPaymentId", "userId" 
    FROM "Order" 
    WHERE id = 'cms4zind80001jl04ms58tf5w'
  `;

  if (orders.length === 0) {
    console.log("Pedido cms4zind80001jl04ms58tf5w não encontrado no SELECT direct!");
    const recent = await sql`SELECT id, "totalAmount", status, "createdAt" FROM "Order" ORDER BY "createdAt" DESC LIMIT 5`;
    console.log("Mais recentes:", recent);
    return;
  }

  const order = orders[0];
  console.log("\n=== PEDIDO ENCONTRADO NO NEON DB ===");
  console.log(order);

  const items = await sql`
    SELECT oi.id, oi.quantity, oi.price, p.name 
    FROM "OrderItem" oi 
    LEFT JOIN "Product" p ON oi."productId" = p.id 
    WHERE oi."orderId" = ${order.id}
  `;

  console.log("\n=== ITENS DO PEDIDO ===");
  let sum = 0;
  items.forEach(i => {
    const sub = i.quantity * i.price;
    sum += sub;
    console.log(`${i.quantity}x ${i.name} | R$ ${i.price} | Subtotal: R$ ${sub.toFixed(2)}`);
  });

  console.log("\nSoma dos itens:", sum.toFixed(2));
  console.log("Total registando na coluna totalAmount da Order:", order.totalAmount);
  console.log("isEmergency:", order.isEmergency);
  console.log("emergencyFine:", order.emergencyFine);

  const history = await sql`
    SELECT * FROM "OrderHistory" WHERE "orderId" = ${order.id} ORDER BY "createdAt" ASC
  `;
  console.log("\n=== HISTÓRICO ===");
  console.log(history);
}

main().catch(console.error);
