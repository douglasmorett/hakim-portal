const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

async function main() {
  // Hakim DB
  console.log("=== HAKIM PORTAL DB ===");
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  });
  
  const hakimUsers = await prisma.user.findMany({
    where: {
      OR: [
        { name: { contains: 'centro', mode: 'insensitive' } },
        { email: { contains: 'centro', mode: 'insensitive' } },
        { storeName: { contains: 'centro', mode: 'insensitive' } },
        { name: { contains: 'hakim', mode: 'insensitive' } },
        { email: { contains: 'hakim', mode: 'insensitive' } }
      ]
    },
    select: { id: true, email: true, name: true, role: true, storeName: true, cpfCnpj: true }
  });
  console.log("Hakim users matching:", hakimUsers);
  await prisma.$disconnect();

  // Firehub DB
  console.log("\n=== FIREHUB DB ===");
  if (process.env.FIREHUB_DATABASE_URL) {
    const prismaFirehub = new PrismaClient({
      datasources: {
        db: {
          url: process.env.FIREHUB_DATABASE_URL
        }
      }
    });
    const firehubUsers = await prismaFirehub.user.findMany({
      where: {
        OR: [
          { name: { contains: 'centro', mode: 'insensitive' } },
          { email: { contains: 'centro', mode: 'insensitive' } },
          { storeName: { contains: 'centro', mode: 'insensitive' } },
          { name: { contains: 'hakim', mode: 'insensitive' } },
          { email: { contains: 'hakim', mode: 'insensitive' } }
        ]
      },
      select: { id: true, email: true, name: true, role: true, storeName: true, cpfCnpj: true }
    });
    console.log("Firehub users matching:", firehubUsers);
    await prismaFirehub.$disconnect();
  } else {
    console.log("FIREHUB_DATABASE_URL is not set.");
  }
}

main().catch(console.error);
