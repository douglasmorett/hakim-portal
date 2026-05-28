require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const victor = await prisma.user.findUnique({
    where: { email: 'victor@hakim.com.br' },
    select: { id: true, name: true, email: true, role: true, permissions: true }
  });
  
  if (!victor) {
    console.log('❌ Usuário victor@hakim.com.br NÃO encontrado no banco!');
    return;
  }
  
  console.log('✓ Usuário encontrado:');
  console.log('  ID:', victor.id);
  console.log('  Nome:', victor.name);
  console.log('  Email:', victor.email);
  console.log('  Role:', victor.role);
  console.log('  Permissões:', victor.permissions || '(VAZIO!)');
  console.log('  Permissões (array):', victor.permissions ? victor.permissions.split(',') : []);
  
  const expectedPerms = ['dashboard', 'products', 'franchisees', 'orders', 'routes', 'finance', 'payables', 'invoices'];
  const currentPerms = victor.permissions ? victor.permissions.split(',') : [];
  const missing = expectedPerms.filter(p => !currentPerms.includes(p));
  
  if (missing.length > 0) {
    console.log('\n⚠️  Permissões FALTANDO:', missing);
  } else {
    console.log('\n✓ Todas as permissões esperadas estão OK');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
