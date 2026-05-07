const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  // Victor Henriques - Gerente de Produção
  // Acesso: franqueados, logística/rotas, pedidos, contas a pagar
  const victorPerms = "franchisees,orders,routes,payables";
  const victorPassword = await bcrypt.hash("Victor@2024", 10);

  await prisma.user.upsert({
    where: { email: "victor@hakim.com.br" },
    update: { permissions: victorPerms },
    create: {
      name: "Victor Henriques",
      email: "victor@hakim.com.br",
      password: victorPassword,
      role: "STAFF",
      permissions: victorPerms,
    }
  });
  console.log("✓ Victor Henriques criado");

  // Cheila Morett - Financeiro
  // Acesso: financeiro completo, produtos (preço), contas a pagar, inadimplência
  const cheilaPerms = "finance,products,payables";
  const cheilaPassword = await bcrypt.hash("Cheila@2024", 10);

  await prisma.user.upsert({
    where: { email: "cheila@hakim.com.br" },
    update: { permissions: cheilaPerms },
    create: {
      name: "Cheila Morett",
      email: "cheila@hakim.com.br",
      password: cheilaPassword,
      role: "STAFF",
      permissions: cheilaPerms,
    }
  });
  console.log("✓ Cheila Morett criada");

  console.log("\n✅ Usuários criados com sucesso!");
  console.log("Victor: victor@hakim.com.br | Senha: Victor@2024");
  console.log("Cheila: cheila@hakim.com.br | Senha: Cheila@2024");
}

main().catch(console.error).finally(() => prisma.$disconnect());
