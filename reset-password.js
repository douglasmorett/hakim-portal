const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash("123456", 10);
  
  await prisma.user.updateMany({
    where: { email: { in: ['admin@firehubfood.com.br', 'admin@hakim.com.br'] } },
    data: { password: hash }
  });
  
  console.log("Passwords for admins reset to 123456");
}
main().catch(console.error).finally(() => prisma.$disconnect());
