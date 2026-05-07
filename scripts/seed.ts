import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando o seed do banco de dados...');

  // Criar o Administrador padrão
  const adminEmail = 'admin@hakim.com.br';
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail }
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('123456', 10);
    await prisma.user.create({
      data: {
        name: 'Administrador Hakim',
        email: adminEmail,
        password: hashedPassword,
        role: 'ADMIN',
      }
    });
    console.log(`Admin criado: ${adminEmail} | Senha: 123456`);
  } else {
    console.log(`Admin já existe: ${adminEmail}`);
  }

  // Criar um franqueado de teste
  const franqueadoEmail = 'franqueado@hakim.com.br';
  const existingFranqueado = await prisma.user.findUnique({
    where: { email: franqueadoEmail }
  });

  if (!existingFranqueado) {
    const hashedPassword = await bcrypt.hash('123456', 10);
    await prisma.user.create({
      data: {
        name: 'Franquia Rio das Ostras',
        email: franqueadoEmail,
        password: hashedPassword,
        role: 'FRANCHISEE',
        city: 'Rio das Ostras'
      }
    });
    console.log(`Franqueado criado: ${franqueadoEmail} | Senha: 123456 | Cidade: Rio das Ostras`);
  }

  console.log('Seed finalizado com sucesso!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
