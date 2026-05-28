require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Dar TODAS as permissões ao Victor
  const allPerms = "dashboard,products,franchisees,orders,routes,finance,payables,invoices";
  
  const result = await prisma.user.update({
    where: { email: 'victor@hakim.com.br' },
    data: { permissions: allPerms },
    select: { name: true, email: true, permissions: true }
  });
  
  console.log('✅ Permissões atualizadas com sucesso!');
  console.log('  Nome:', result.name);
  console.log('  Email:', result.email);
  console.log('  Novas permissões:', result.permissions);
  console.log('  Array:', result.permissions.split(','));
}

main().catch(console.error).finally(() => prisma.$disconnect());
