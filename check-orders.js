require('dotenv').config({path:'.env'});
require('dotenv').config({path:'.env.local',override:true});
const {PrismaClient}=require('@prisma/client');
const p=new PrismaClient();
(async()=>{
  const orders = await p.order.findMany({
    where: { status: { in: ['PENDING_PAYMENT','EMERGENCIA_PENDENTE'] } },
    select: { id:true, totalAmount:true, status:true, boletoUrl:true, asaasPaymentId:true, isEmergency:true, emergencyStatus:true },
    orderBy: { createdAt: 'desc' }
  });
  console.log(`\n${orders.length} pedidos pendentes:\n`);
  orders.forEach(o => {
    const sid = o.id.slice(-6).toUpperCase();
    console.log(`#${sid} | ${o.status} | R$${o.totalAmount.toFixed(2)} | ${o.isEmergency?'EMERG':'Normal'} | ${o.emergencyStatus||'-'} | ${o.asaasPaymentId||'SEM ASAAS'} | ${o.boletoUrl?'TEM LINK':'SEM LINK'}`);
  });
  await p.$disconnect();
})();
