import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PAYMENT_METHODS = [
  { method: "CASH", label: "Dinheiro" },
  { method: "CARD_CREDIT", label: "Cartão Crédito" },
  { method: "CARD_DEBIT", label: "Cartão Débito" },
  { method: "PIX", label: "PIX" },
  { method: "VOUCHER", label: "Vale/Voucher" },
  { method: "OTHER", label: "Outro" },
];

// GET — busca caixa aberto ou histórico
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN")
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("mode") || "current"; // "current" | "history"

  if (mode === "current") {
    const open = await prisma.cashRegister.findFirst({
      where: { status: "OPEN" },
      include: { entries: true },
      orderBy: { openedAt: "desc" },
    });
    return NextResponse.json({ register: open, methods: PAYMENT_METHODS });
  }

  // histórico
  const history = await prisma.cashRegister.findMany({
    where: { status: "CLOSED" },
    include: { entries: true },
    orderBy: { closedAt: "desc" },
    take: 30,
  });
  return NextResponse.json(history);
}

// POST — abrir caixa
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN")
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  // Verifica se já tem caixa aberto
  const existing = await prisma.cashRegister.findFirst({ where: { status: "OPEN" } });
  if (existing) return NextResponse.json({ error: "Já existe um caixa aberto." }, { status: 400 });

  const { openingAmount } = await req.json();
  const register = await prisma.cashRegister.create({
    data: {
      openingAmount: parseFloat(openingAmount),
      openedBy: session.user?.email || "admin",
      status: "OPEN",
    },
  });
  return NextResponse.json(register);
}

// PUT — fechar caixa
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN")
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { registerId, entries, justification } = await req.json();
  // entries: [{ method, methodLabel, actualAmount }]

  // Calcular total esperado baseado nos pedidos do período de caixa aberto
  const register = await prisma.cashRegister.findUnique({
    where: { id: registerId },
    include: { entries: true },
  });
  if (!register) return NextResponse.json({ error: "Caixa não encontrado." }, { status: 404 });

  // Buscar pedidos entregues desde a abertura do caixa
  const orders = await prisma.customerOrder.findMany({
    where: {
      status: "ENTREGUE",
      createdAt: { gte: register.openedAt },
    },
  });

  // Calcular esperado por forma de pagamento
  const expectedByMethod: Record<string, number> = {};
  for (const order of orders) {
    const method = order.paymentMethod || "OTHER";
    expectedByMethod[method] = (expectedByMethod[method] || 0) + order.totalAmount;
  }
  // Adicionar dinheiro de abertura no CASH esperado
  expectedByMethod["CASH"] = (expectedByMethod["CASH"] || 0) + register.openingAmount;

  const expectedTotal = Object.values(expectedByMethod).reduce((a, b) => a + b, 0);
  const actualTotal = entries.reduce((sum: number, e: any) => sum + parseFloat(e.actualAmount || 0), 0);
  const discrepancy = actualTotal - expectedTotal;

  // Exigir justificativa se discrepância > R$0.50
  if (Math.abs(discrepancy) > 0.5 && !justification?.trim()) {
    return NextResponse.json({
      error: "Há uma discrepância no caixa. Você deve informar uma justificativa.",
      discrepancy,
      expectedTotal,
      actualTotal,
    }, { status: 400 });
  }

  // Salvar entradas e fechar
  const entriesData = entries.map((e: any) => ({
    method: e.method,
    methodLabel: e.methodLabel,
    expectedAmount: expectedByMethod[e.method] || 0,
    actualAmount: parseFloat(e.actualAmount || 0),
    registerId,
  }));

  await prisma.cashRegisterEntry.createMany({ data: entriesData });
  const closed = await prisma.cashRegister.update({
    where: { id: registerId },
    data: {
      status: "CLOSED",
      closedAt: new Date(),
      closedBy: session.user?.email || "admin",
      expectedTotal,
      actualTotal,
      discrepancy,
      justification: justification || null,
    },
    include: { entries: true },
  });

  return NextResponse.json(closed);
}
