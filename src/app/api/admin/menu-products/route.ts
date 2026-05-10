import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

// GET - listar produtos (usado pelo PDV e cardápio)
export async function GET() {
  const products = await prisma.menuProduct.findMany({
    where: { active: true },
    include: {
      comboGroups: { include: { items: { include: { menuProduct: true } } } }
    },
    orderBy: [{ category: "asc" }, { name: "asc" }]
  });
  return NextResponse.json(products);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session || (role !== "ADMIN" && role !== "FRANCHISEE")) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await req.json();
  const product = await prisma.menuProduct.create({
    data: {
      name: body.name, description: body.description, price: body.price,
      cost: body.cost || null,
      tags: body.tags ? JSON.stringify(body.tags) : null,
      category: body.category || "Lanches", imageUrl: body.imageUrl || null,
      active: body.active ?? true, isCombo: body.isCombo ?? false,
      activePDV: body.activePDV ?? true,
      activeDelivery: body.activeDelivery ?? true,
      activeTotem: body.activeTotem ?? false,
      activeGarcom: body.activeGarcom ?? false,
    }
  });

  // Create combo groups if it's a combo
  if (body.isCombo && body.comboGroups) {
    for (let i = 0; i < body.comboGroups.length; i++) {
      const g = body.comboGroups[i];
      const group = await prisma.comboGroup.create({
        data: { menuProductId: product.id, title: g.title, maxQty: g.maxQty, sortOrder: i }
      });
      for (const itemId of (g.itemIds || [])) {
        await prisma.comboGroupItem.create({ data: { comboGroupId: group.id, menuProductId: itemId } });
      }
    }
  }

  return NextResponse.json(product);
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session || (role !== "ADMIN" && role !== "FRANCHISEE")) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await req.json();
  const data: any = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.description !== undefined) data.description = body.description;
  if (body.price !== undefined) data.price = body.price;
  if (body.category !== undefined) data.category = body.category;
  if (body.imageUrl !== undefined) data.imageUrl = body.imageUrl;
  if (body.cost !== undefined) data.cost = body.cost;
  if (body.tags !== undefined) data.tags = body.tags ? JSON.stringify(body.tags) : null;
  if (body.active !== undefined) data.active = body.active;
  if (body.isCombo !== undefined) data.isCombo = body.isCombo;
  if (body.activePDV !== undefined) data.activePDV = body.activePDV;
  if (body.activeDelivery !== undefined) data.activeDelivery = body.activeDelivery;
  if (body.activeTotem !== undefined) data.activeTotem = body.activeTotem;
  if (body.activeGarcom !== undefined) data.activeGarcom = body.activeGarcom;

  const product = await prisma.menuProduct.update({ where: { id: body.id }, data });

  // Rebuild combo groups if provided
  if (body.comboGroups !== undefined && body.isCombo) {
    // Delete old groups (cascade deletes items)
    await prisma.comboGroupItem.deleteMany({ where: { comboGroup: { menuProductId: body.id } } });
    await prisma.comboGroup.deleteMany({ where: { menuProductId: body.id } });
    // Create new
    for (let i = 0; i < body.comboGroups.length; i++) {
      const g = body.comboGroups[i];
      const group = await prisma.comboGroup.create({
        data: { menuProductId: body.id, title: g.title, maxQty: g.maxQty, sortOrder: i }
      });
      for (const itemId of (g.itemIds || [])) {
        await prisma.comboGroupItem.create({ data: { comboGroupId: group.id, menuProductId: itemId } });
      }
    }
  }

  return NextResponse.json(product);
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session || (role !== "ADMIN" && role !== "FRANCHISEE")) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await req.json();
  try {
    // Remover de grupos de combo onde este produto é opção
    await prisma.comboGroupItem.deleteMany({ where: { menuProductId: body.id } });
    // Remover grupos de combo criados por este produto
    await prisma.comboGroupItem.deleteMany({ where: { comboGroup: { menuProductId: body.id } } });
    await prisma.comboGroup.deleteMany({ where: { menuProductId: body.id } });
    // Deletar o produto
    await prisma.menuProduct.delete({ where: { id: body.id } });
    return NextResponse.json({ deleted: true });
  } catch (err: any) {
    // FK constraint — produto tem pedidos associados: fazer soft-delete
    await prisma.menuProduct.update({
      where: { id: body.id },
      data: { active: false, name: `[INATIVO] ${body.name || "Produto"}` }
    });
    return NextResponse.json({ deleted: true, softDeleted: true });
  }
}
