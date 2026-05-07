import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { franchiseeSlug, customerName, customerPhone, customerAddress, deliveryType, paymentMethod, notes, items } = body;

    if (!franchiseeSlug || !customerName || !customerPhone || !items || items.length === 0) {
      return NextResponse.json({ error: "Dados incompletos." }, { status: 400 });
    }

    // Find franchisee by slug
    const franchisee = await prisma.user.findUnique({ where: { slug: franchiseeSlug } });
    if (!franchisee) {
      return NextResponse.json({ error: "Loja não encontrada." }, { status: 404 });
    }

    // Get menu product prices
    const productIds = items.map((i: any) => i.menuProductId);
    const menuProducts = await prisma.menuProduct.findMany({
      where: { id: { in: productIds }, active: true }
    });

    if (menuProducts.length !== productIds.length) {
      return NextResponse.json({ error: "Um ou mais produtos não estão disponíveis." }, { status: 400 });
    }

    // Calculate total
    let totalAmount = 0;
    const orderItems = items.map((item: any) => {
      const product = menuProducts.find(p => p.id === item.menuProductId);
      if (!product) throw new Error("Produto não encontrado");
      totalAmount += product.price * item.quantity;
      return {
        menuProductId: product.id,
        quantity: item.quantity,
        price: product.price
      };
    });

    // Create order
    const order = await prisma.customerOrder.create({
      data: {
        franchiseeId: franchisee.id,
        customerName,
        customerPhone,
        customerAddress: customerAddress || null,
        deliveryType: deliveryType || "DELIVERY",
        paymentMethod: paymentMethod || null,
        notes: notes || null,
        totalAmount,
        status: "NOVO",
        items: {
          create: orderItems
        }
      }
    });

    return NextResponse.json({ orderId: order.id, total: totalAmount });

  } catch (error: any) {
    console.error("Erro ao criar pedido de cliente:", error);
    return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 });
  }
}
