import { NextResponse } from 'next/server';
import { prismaFirehub } from '@/lib/prismaFirehub';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const orderFirehub = await prismaFirehub.order.findMany({
    where: { id: { endsWith: 'IHLRX7' } },
    include: { items: true }
  });
  
  const orderHakim = await prisma.order.findMany({
    where: { id: { endsWith: 'IHLRX7' } },
    include: { items: true }
  });

  return NextResponse.json({
    orderFirehub,
    orderHakim
  });
}
