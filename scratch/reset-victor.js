const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('hakim2026', 10);
  const result = await prisma.user.updateMany({
    where: { email: 'victor@hakim.com.br' },
    data: { password: hash }
  });
  console.log('Registros atualizados:', result.count);
  console.log('Nova senha: hakim2026');
}

main().catch(console.error).finally(() => prisma.$disconnect());
