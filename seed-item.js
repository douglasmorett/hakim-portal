const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst();
  if (user) {
    const item = await prisma.kitchenItem.create({
      data: {
        name: "50 unidades de massa de esfirra",
        franchiseeId: user.id
      }
    });
    console.log("Created item:", item.id);
  } else {
    console.log("No user found");
  }
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
