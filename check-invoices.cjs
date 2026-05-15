const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  // Check PurchaseInvoice table structure
  const columns = await prisma.$queryRaw`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns 
    WHERE table_name = 'PurchaseInvoice' AND table_schema = 'public'
    ORDER BY ordinal_position;
  `;
  console.log("PurchaseInvoice columns:");
  columns.forEach(c => console.log(`  ${c.column_name} (${c.data_type}, nullable: ${c.is_nullable})`));

  // Get sample data
  const rows = await prisma.$queryRaw`SELECT * FROM "PurchaseInvoice" ORDER BY "createdAt" DESC LIMIT 10`;
  console.log("\nLatest 10 PurchaseInvoice rows:");
  rows.forEach(r => {
    console.log(`  [${r.createdAt?.toISOString?.().slice(0,10) || '?'}] by: ${r.uploadedBy || r.userId || '?'} | val: R$${r.aiValue || r.totalValue || r.value || '?'} | desc: ${(r.description || '').slice(0,50)}`);
    console.log(`    category: ${r.category} | source: ${r.source} | supplier: ${r.supplier || '-'} | aiCategory: ${r.aiCategory || '-'}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
