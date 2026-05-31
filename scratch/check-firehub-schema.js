const { PrismaClient } = require('@prisma/client');

// Usar DATABASE_URL do .env principal
const p = new PrismaClient({
  datasourceUrl: "postgresql://neondb_owner:npg_9C4DXWRhvBUo@ep-soft-water-amzwjl9k-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require"
});

async function main() {
  try {
    // Checar colunas da Order no banco principal (neondb)
    const cols = await p.$queryRawUnsafe(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'Order' ORDER BY ordinal_position"
    );
    console.log('Order columns in MAIN DB (neondb):', cols.map(c => c.column_name));
  } catch (e) {
    console.error('Error main DB:', e.message);
  }

  // Tentar firehub_db na mesma conexão
  const p2 = new PrismaClient({
    datasourceUrl: "postgresql://neondb_owner:npg_9C4DXWRhvBUo@ep-soft-water-amzwjl9k-pooler.c-5.us-east-1.aws.neon.tech/firehub_db?sslmode=require"
  });
  
  try {
    const cols = await p2.$queryRawUnsafe(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'Order' ORDER BY ordinal_position"
    );
    console.log('\nOrder columns in FIREHUB DB (firehub_db):', cols.map(c => c.column_name));
  } catch (e) {
    console.error('Error firehub DB:', e.message);
  }

  try {
    const tables = await p2.$queryRawUnsafe(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );
    console.log('\nFireHub tables:', tables.map(t => t.table_name));
  } catch (e) {
    console.error('Error listing firehub tables:', e.message);
  }

  await p.$disconnect();
  await p2.$disconnect();
}

main();
