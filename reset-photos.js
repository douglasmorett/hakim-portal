const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ids = [
  "cmo3jwqdq0000em6w13g4uvsb", "cmoiyffqc0000l404uffcjefz", "cmoiyh0h90000jr04gf8ztxpi",
  "cmoiyheqm0000ju041m5ae774", "cmoiyi3fk0001jr04iy9ic9k4", "cmoiyio290001ju04tylulfnt",
  "cmoiylo350001l404bgxyggav", "cmoiymvrk0003ju048cffneyt", "cmoiypdng0002jr04ju643gox",
  "cmoiyqpzf0003jr04ueyms3io", "cmoiyrd5i0000jr043kj19drn", "cmoiyrtjk0001jr04qcwoxy24",
  "cmoiytg5x0004ju04q42fo9ci", "cmoiyu5hr0005ju04dm9xo6fd", "cmoiyup210002jr04n8b8uyxc",
  "cmoiyv89v0002l404t203m05r", "cmoiyvyoo0006ju04t69o1kzk", "cmoiywdfn0003l404x9gn6xg2",
  "cmoiywtqr0003jr041az0w3km", "cmoiyxrp30005jr04hw2fyvrb", "cmoiyxcel0004jr045b8osx58"
];

async function main() {
  await prisma.product.updateMany({
    where: { id: { in: ids } },
    data: { imageUrl: null }
  });
  console.log('Reset completed!');
}
main().finally(() => prisma.$disconnect());
