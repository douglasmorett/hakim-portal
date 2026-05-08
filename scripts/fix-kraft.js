require('dotenv').config();
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

async function main() {
  const r = await sql`UPDATE "Product" SET "franchiseOnly" = true WHERE name ILIKE '%saco kraft%' RETURNING name`;
  console.log('✅', r[0]?.name, '→ franchiseOnly');
}
main().catch(e => console.error(e.message));
