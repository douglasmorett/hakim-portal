require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');

const prismaHakim = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
});
const prismaFirehub = new PrismaClient({
  datasourceUrl: process.env.FIREHUB_DATABASE_URL,
});

const ALL_PERMS = "dashboard,products,franchisees,orders,routes,finance,payables,invoices";

const staffToFix = [
  'victor@hakim.com.br',
  'cheila@hakim.com.br',
  'elis@hakim.com.br',
];

async function main() {
  for (const email of staffToFix) {
    // Atualizar no Hakim DB
    const h = await prismaHakim.user.update({
      where: { email },
      data: { permissions: ALL_PERMS },
      select: { name: true, email: true, permissions: true }
    });
    console.log(`✅ [HAKIM] ${h.name} → ${h.permissions}`);

    // Atualizar no FireHub DB
    const f = await prismaFirehub.user.update({
      where: { email },
      data: { permissions: ALL_PERMS },
      select: { name: true, email: true, permissions: true }
    });
    console.log(`✅ [FIREHUB] ${f.name} → ${f.permissions}`);
    console.log('');
  }

  console.log('🎉 Todos os acessos sincronizados nos dois bancos!');
}

main().catch(console.error).finally(async () => {
  await prismaHakim.$disconnect();
  await prismaFirehub.$disconnect();
});
