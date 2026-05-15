import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST — insere nota manual (sem foto, sem IA)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const { description, supplier, value, date, category, expenseCategory } = await req.json();

    if (!description?.trim()) {
      return NextResponse.json({ error: "Descrição obrigatória" }, { status: 400 });
    }
    const parsedValue = parseFloat(String(value).replace(",", "."));
    if (isNaN(parsedValue) || parsedValue <= 0) {
      return NextResponse.json({ error: "Valor inválido" }, { status: 400 });
    }

    const invoice = await (prisma as any).invoice.create({
      data: {
        uploadedBy:      session.user.email,
        description:     description.trim(),
        supplier:        supplier?.trim() || null,
        category:        category || "BUSINESS",
        expenseCategory: expenseCategory || "Outros",
        aiValue:         parsedValue,
        invoiceDate:     date ? new Date(date) : new Date(),
        source:          "manual",
      },
    });

    return NextResponse.json({ invoice });
  } catch (err: any) {
    console.error("[Invoices/Manual]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
