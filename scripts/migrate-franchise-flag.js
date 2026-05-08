// Delete Azeitona 2kg + Add franchiseOnly and isFranqueadoHakim fields
require('dotenv').config();
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

async function main() {
  // 1. Delete Azeitona 2kg - first remove any order items referencing it
  console.log('🔍 Buscando produto Azeitona 2kg...');
  const azeitona = await sql`SELECT id, name FROM "Product" WHERE name ILIKE '%azeitona%'`;
  
  if (azeitona.length > 0) {
    const id = azeitona[0].id;
    console.log(`   Encontrado: ${azeitona[0].name} (${id})`);
    
    // Delete order items first
    const items = await sql`DELETE FROM "OrderItem" WHERE "productId" = ${id} RETURNING id`;
    console.log(`   OrderItems removidos: ${items.length}`);
    
    // Delete product
    const del = await sql`DELETE FROM "Product" WHERE id = ${id} RETURNING name`;
    console.log(`   ✅ Produto "${del[0]?.name}" deletado!`);
  } else {
    console.log('   Azeitona não encontrada.');
  }

  // 2. Add franchiseOnly column to Product (if not exists)
  console.log('\n📦 Adicionando coluna franchiseOnly em Product...');
  try {
    await sql`ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "franchiseOnly" BOOLEAN DEFAULT false`;
    console.log('   ✅ Coluna franchiseOnly adicionada!');
  } catch (e) {
    console.log('   Já existe ou erro:', e.message);
  }

  // 3. Add isFranqueadoHakim column to User (if not exists)
  console.log('\n👤 Adicionando coluna isFranqueadoHakim em User...');
  try {
    await sql`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isFranqueadoHakim" BOOLEAN DEFAULT false`;
    console.log('   ✅ Coluna isFranqueadoHakim adicionada!');
  } catch (e) {
    console.log('   Já existe ou erro:', e.message);
  }

  // 4. Mark existing FRANCHISEE users as franqueado hakim
  const updated = await sql`UPDATE "User" SET "isFranqueadoHakim" = true WHERE role = 'FRANCHISEE' RETURNING name`;
  console.log(`\n   ✅ ${updated.length} franqueados marcados como Franqueado Hakim`);

  // 5. Mark the 3 franchise-only products
  console.log('\n🏷️ Marcando produtos exclusivos de franqueados...');
  const marked = await sql`
    UPDATE "Product" SET "franchiseOnly" = true 
    WHERE name ILIKE '%embalagem%' OR name ILIKE '%lacre%caixa%'
    RETURNING name
  `;
  marked.forEach(p => console.log(`   ✅ ${p.name} → franchiseOnly`));

  console.log('\n🎉 Tudo pronto!');
}

main().catch(e => console.error('❌', e.message));
