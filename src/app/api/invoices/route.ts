import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET — lista notas do usuário logado (da tabela PurchaseInvoice que contém o histórico)
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const category = req.nextUrl.searchParams.get("category") || "BUSINESS";
  const role = (session.user as any).role;

  // ADMIN vê tudo, outros veem só os próprios
  const where: any = { category };
  if (role !== "ADMIN") {
    where.uploadedBy = session.user.email;
  }

  const invoices = await (prisma as any).purchaseInvoice.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(invoices);
}

// POST — processa nota via IA (Gemini Vision)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const { imageUrl, description, category } = await req.json();
    if (!imageUrl || !description) {
      return NextResponse.json({ error: "imageUrl e description são obrigatórios" }, { status: 400 });
    }

    // Chamar Gemini Vision para extrair dados da nota
    const geminiApiKey = process.env.GEMINI_API_KEY;
    let aiValue: number | null = null;
    let aiCategory: string | null = null;
    let invoiceDate: Date | null = null;

    if (geminiApiKey) {
      try {
        const imgResponse = await fetch(imageUrl);
        const imgBuffer = await imgResponse.arrayBuffer();
        const base64 = Buffer.from(imgBuffer).toString("base64");
        const mimeType = imgResponse.headers.get("content-type") || "image/jpeg";

        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{
                parts: [
                  { inlineData: { mimeType, data: base64 } },
                  {
                    text: `Analise esta nota fiscal/cupom fiscal brasileiro e extraia:
1. Valor total (apenas o número final, ex: 125.50)
2. Data da nota (formato YYYY-MM-DD)
3. Categoria da despesa mais adequada dentre: Matéria-prima/Ingredientes, Embalagens, Gás/Combustível, Manutenção/Equipamentos, Limpeza/Higiene, Marketing/Publicidade, Aluguel/Condomínio, Água/Energia/Internet, Frete/Logística, Material de Escritório, Salários/Freelancers, Impostos/Taxas, Outros

Contexto do usuário: "${description}"

Responda APENAS em JSON válido no formato:
{"valor": 125.50, "data": "2024-01-15", "categoria": "Matéria-prima/Ingredientes"}

Se não conseguir ler algum campo, use null.`
                  }
                ]
              }],
              generationConfig: { temperature: 0.1 }
            }),
          }
        );

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            aiValue = parsed.valor ? parseFloat(parsed.valor) : null;
            aiCategory = parsed.categoria || null;
            invoiceDate = parsed.data ? new Date(parsed.data) : null;
          }
        }
      } catch (aiErr) {
        console.error("[Invoices/AI] Erro Gemini:", aiErr);
      }
    }

    const invoice = await (prisma as any).purchaseInvoice.create({
      data: {
        uploadedBy: session.user.email,
        description,
        category: category || "BUSINESS",
        imageUrl,
        aiValue,
        aiCategory,
        invoiceDate,
        source: "ai",
        status: "APPROVED",
      },
    });

    return NextResponse.json({ invoice });
  } catch (err: any) {
    console.error("[Invoices/POST]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE — remove uma nota
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

  const invoice = await (prisma as any).purchaseInvoice.findUnique({ where: { id } });
  if (!invoice) return NextResponse.json({ error: "Nota não encontrada" }, { status: 404 });

  const role = (session.user as any).role;
  if (role !== "ADMIN" && invoice.uploadedBy !== session.user.email) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  await (prisma as any).purchaseInvoice.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
