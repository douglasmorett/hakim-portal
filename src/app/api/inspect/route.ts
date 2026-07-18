import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // 1. Busca os franqueados
    const fabiano = await prisma.user.findFirst({
      where: {
        email: {
          contains: "tst.fabiano.andrade@gmail.com",
          mode: "insensitive"
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        storeName: true,
        isFranqueadoHakim: true,
      }
    });

    const paulo = await prisma.user.findFirst({
      where: {
        email: {
          contains: "paulocoutinhocastilho@gmail.com",
          mode: "insensitive"
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        storeName: true,
        isFranqueadoHakim: true,
      }
    });

    // 2. Busca pedidos recentes do Fabiano
    const fabianoOrders = fabiano ? await prisma.order.findMany({
      where: { userId: fabiano.id },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, name: true, price: true }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 5
    }) : [];

    // 3. Busca pedidos recentes do Paulo
    const pauloOrders = paulo ? await prisma.order.findMany({
      where: { userId: paulo.id },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, name: true, price: true }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 5
    }) : [];

    // 4. Busca todos os produtos para achar a massa (pacote de 500)
    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        price: true,
        description: true,
        franchiseOnly: true,
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        fabiano: {
          info: fabiano,
          orders: fabianoOrders
        },
        paulo: {
          info: paulo,
          orders: pauloOrders
        },
        products
      }
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || error
    }, { status: 500 });
  }
}
