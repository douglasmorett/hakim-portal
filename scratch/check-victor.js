const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  const prismaFirehub = new PrismaClient({ datasourceUrl: process.env.FIREHUB_DATABASE_URL });
  
  const email = 'victor@hakim.com.br';
  console.log('=== Verificando:', email, '===\n');
  
  const u = await prisma.user.findUnique({ 
    where: { email }, 
    select: { id: true, name: true, role: true, cpfCnpj: true } 
  });
  console.log('Hakim User:', JSON.stringify(u, null, 2));
  
  if (!u) { console.log('NAO ENCONTRADO NO HAKIM'); return; }

  // FireHub por email
  const fb = await prismaFirehub.user.findUnique({ 
    where: { email }, 
    select: { id: true, name: true, cpfCnpj: true } 
  }).catch(() => null);
  console.log('\nFireHub User (email):', JSON.stringify(fb, null, 2));

  // FireHub por cpfCnpj
  if (u.cpfCnpj) {
    const fbByCpf = await prismaFirehub.user.findMany({ 
      where: { cpfCnpj: u.cpfCnpj }, 
      select: { id: true, name: true } 
    });
    console.log('\nFireHub Users (cpfCnpj ' + u.cpfCnpj + '):', JSON.stringify(fbByCpf, null, 2));
    
    if (fbByCpf.length > 0) {
      const ids = fbByCpf.map(x => x.id);
      const orders = await prismaFirehub.order.findMany({ 
        where: { userId: { in: ids } }, 
        select: { id: true, totalAmount: true, status: true, createdAt: true },
        orderBy: { createdAt: 'desc' } 
      });
      console.log('\nFireHub Orders (via cpfCnpj):', orders.length);
      orders.forEach(o => console.log('  #' + o.id.slice(-6).toUpperCase(), 'R$', o.totalAmount.toFixed(2), o.status));
    }
  } else {
    console.log('\nSem cpfCnpj no Hakim!');
    if (fb) {
      const orders = await prismaFirehub.order.findMany({ 
        where: { userId: fb.id }, 
        select: { id: true, totalAmount: true, status: true, createdAt: true },
        orderBy: { createdAt: 'desc' } 
      });
      console.log('\nFireHub Orders (via email):', orders.length);
      orders.forEach(o => console.log('  #' + o.id.slice(-6).toUpperCase(), 'R$', o.totalAmount.toFixed(2), o.status));
    } else {
      console.log('Sem match por email no FireHub tambem!');
    }
  }

  // Hakim orders
  const hOrders = await prisma.order.findMany({ 
    where: { userId: u.id }, 
    select: { id: true, totalAmount: true, status: true },
    orderBy: { createdAt: 'desc' } 
  });
  console.log('\nHakim Orders:', hOrders.length);
  hOrders.forEach(o => console.log('  #' + o.id.slice(-6).toUpperCase(), 'R$', o.totalAmount.toFixed(2), o.status));

  await prisma["$disconnect"]();
  await prismaFirehub["$disconnect"]();
}

main().catch(console.error);
