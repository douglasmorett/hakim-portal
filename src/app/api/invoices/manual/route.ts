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

    // Concatena fornecedor na descrição (como o formato antigo fazia)
    let fullDesc = description.trim();
    if (supplier?.trim()) {
      fullDesc += ` — Fornecedor: ${supplier.trim()}`;
    }

    const invoice = await (prisma as any).purchaseInvoice.create({
      data: {
        uploadedBy:      session.user.email,
        description:     fullDesc,
        category:        category || "BUSINESS",
        imageUrl:        "",
        aiValue:         parsedValue,
        aiCategory:      expenseCategory || "Outros",
        invoiceDate:     date ? new Date(date) : new Date(),
        source:          "manual",
        status:          "APPROVED",
      },
    });

    return NextResponse.json({ invoice });
  } catch (err: any) {
    console.error("[Invoices/Manual]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
