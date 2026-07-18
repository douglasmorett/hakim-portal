import { NextResponse } from "next/server";
import { prismaFirehub } from "@/lib/prismaFirehub";

export async function GET() {
  try {
    // 1. Busca os franqueados no banco FireHub
    const fabiano = await prismaFirehub.user.findFirst({
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
        cpfCnpj: true,
      }
    });

    const paulo = await prismaFirehub.user.findFirst({
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
        cpfCnpj: true,
      }
    });

    // 2. Busca pedidos recentes do Fabiano no banco FireHub
    const fabianoOrders = fabiano ? await prismaFirehub.order.findMany({
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

    // 3. Busca pedidos recentes do Paulo no banco FireHub
    const pauloOrders = paulo ? await prismaFirehub.order.findMany({
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

    // 4. Busca todos os produtos no banco FireHub
    const products = await prismaFirehub.product.findMany({
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
      source: "prismaFirehub",
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
