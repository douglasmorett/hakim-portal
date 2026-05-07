const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function generateCpf() {
  const n = () => Math.floor(Math.random() * 9);
  const n1 = n(), n2 = n(), n3 = n(), n4 = n(), n5 = n(), n6 = n(), n7 = n(), n8 = n(), n9 = n();
  let d1 = n9 * 2 + n8 * 3 + n7 * 4 + n6 * 5 + n5 * 6 + n4 * 7 + n3 * 8 + n2 * 9 + n1 * 10;
  d1 = 11 - (d1 % 11);
  if (d1 >= 10) d1 = 0;
  let d2 = d1 * 2 + n9 * 3 + n8 * 4 + n7 * 5 + n6 * 6 + n5 * 7 + n4 * 8 + n3 * 9 + n2 * 10 + n1 * 11;
  d2 = 11 - (d2 % 11);
  if (d2 >= 10) d2 = 0;
  return '' + n1 + n2 + n3 + n4 + n5 + n6 + n7 + n8 + n9 + d1 + d2;
}

async function fixUsers() {
  const users = await prisma.user.findMany();
  for (const u of users) {
    if (!u.cpfCnpj) {
      const validCpf = generateCpf();
      await prisma.user.update({
        where: { id: u.id },
        data: { cpfCnpj: validCpf }
      });
      console.log(`Updated user ${u.name} with CPF ${validCpf}`);
    }
  }
}

fixUsers().finally(() => prisma.$disconnect());
