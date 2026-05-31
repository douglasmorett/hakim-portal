require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');

const prismaHakim = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
});
const prismaFirehub = new PrismaClient({
  datasourceUrl: process.env.FIREHUB_DATABASE_URL,
});

async function main() {
  console.log('=== HAKIM DB (portal) ===');
  const hakimUsers = await prismaHakim.user.findMany({
    where: { role: { in: ['STAFF', 'ADMIN'] } },
    select: { id: true, name: true, email: true, role: true, permissions: true },
    orderBy: { name: 'asc' }
  });

  hakimUsers.forEach(u => {
    const perms = u.permissions ? u.permissions.split(',') : [];
    console.log(`\n👤 ${u.name} (${u.email})`);
    console.log(`   Role: ${u.role}`);
    console.log(`   Permissões: ${u.permissions || '(VAZIO!)'}`);
    if (u.role === 'STAFF') {
      const all = ['dashboard','products','franchisees','orders','routes','finance','payables','invoices'];
      const missing = all.filter(p => !perms.includes(p));
      if (missing.length > 0) {
        console.log(`   ⚠️  FALTANDO: ${missing.join(', ')}`);
      } else {
        console.log(`   ✅ Todas as permissões OK`);
      }
    } else {
      console.log(`   ✅ ADMIN tem acesso total automático`);
    }
  });

  console.log('\n\n=== FIREHUB DB (icebox) ===');
  const firehubUsers = await prismaFirehub.user.findMany({
    where: { role: { in: ['STAFF', 'ADMIN'] } },
    select: { id: true, name: true, email: true, role: true, permissions: true },
    orderBy: { name: 'asc' }
  });

  if (firehubUsers.length === 0) {
    console.log('Nenhum STAFF/ADMIN encontrado no FireHub DB');
  } else {
    firehubUsers.forEach(u => {
      console.log(`\n👤 ${u.name} (${u.email})`);
      console.log(`   Role: ${u.role}`);
      console.log(`   Permissões: ${u.permissions || '(VAZIO!)'}`);
    });
  }

  // Verificar cruzamento - quem está no Hakim mas não no FireHub
  console.log('\n\n=== CRUZAMENTO ===');
  const hakimEmails = hakimUsers.map(u => u.email);
  const firehubEmails = firehubUsers.map(u => u.email);
  
  const onlyHakim = hakimEmails.filter(e => !firehubEmails.includes(e));
  const onlyFirehub = firehubEmails.filter(e => !hakimEmails.includes(e));
  const inBoth = hakimEmails.filter(e => firehubEmails.includes(e));

  if (inBoth.length > 0) console.log('✅ Em ambos DBs:', inBoth.join(', '));
  if (onlyHakim.length > 0) console.log('⚠️  Só no Hakim:', onlyHakim.join(', '));
  if (onlyFirehub.length > 0) console.log('⚠️  Só no FireHub:', onlyFirehub.join(', '));
}

main().catch(console.error).finally(async () => {
  await prismaHakim.$disconnect();
  await prismaFirehub.$disconnect();
});
