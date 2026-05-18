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

        // Usando gemini-1.5-pro para melhor leitura de notas fiscais
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${geminiApiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{
                parts: [
                  { inlineData: { mimeType, data: base64 } },
                  {
                    text: `Você é um leitor de notas fiscais brasileiras. Analise CUIDADOSAMENTE esta imagem de nota fiscal ou cupom fiscal e extraia as informações abaixo.

INSTRUÇÕES:
- Procure pelo VALOR TOTAL da nota (geralmente no final, pode aparecer como "TOTAL", "TOTAL R$", "VALOR TOTAL", "TOTAL A PAGAR")
- O valor pode usar vírgula como separador decimal (ex: 125,50) — converta para ponto (125.50)
- Se encontrar o valor, retorne como número (ex: 125.50, não "R$ 125,50")
- Para a data, procure "DATA", "DT.EMIS", "EMISSÃO" — formato final deve ser YYYY-MM-DD
- Contexto do usuário sobre o que foi comprado: "${description}"

Responda SOMENTE com um JSON puro, sem markdown, sem explicações:
{"valor": 125.50, "data": "2024-01-15", "categoria": "Outros"}

Categorias disponíveis: Matéria-prima/Ingredientes, Embalagens, Gás/Combustível, Manutenção/Equipamentos, Limpeza/Higiene, Marketing/Publicidade, Aluguel/Condomínio, Água/Energia/Internet, Frete/Logística, Material de Escritório, Salários/Freelancers, Impostos/Taxas, Outros

Se não conseguir ler um campo específico, use null para aquele campo.`
                  }
                ]
              }],
              generationConfig: { temperature: 0, responseMimeType: "application/json" }
            }),
          }
        );

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
          console.log("[Invoices/AI] Resposta bruta Gemini:", text);

          // Extrai JSON — suporta markdown ```json ... ```, e JSON puro
          const jsonMatch = text.match(/```json\s*([\s\S]*?)```/) ||
                            text.match(/```\s*([\s\S]*?)```/) ||
                            text.match(/(\{[\s\S]*\})/);

          if (jsonMatch) {
            const jsonStr = (jsonMatch[1] || jsonMatch[0]).trim();
            try {
              const parsed = JSON.parse(jsonStr);
              console.log("[Invoices/AI] JSON parseado:", parsed);

              // Suporta tanto vírgula (125,50) quanto ponto (125.50)
              if (parsed.valor !== null && parsed.valor !== undefined) {
                const valorStr = String(parsed.valor).replace(",", ".");
                const valorNum = parseFloat(valorStr);
                if (!isNaN(valorNum) && valorNum > 0) aiValue = valorNum;
              }

              aiCategory = parsed.categoria || null;

              // Sanitização robusta de data — Prisma exige ISO 8601
              if (parsed.data && typeof parsed.data === "string") {
                try {
                  let year: number, month: number, day: number;

                  // Tenta YYYY-MM-DD primeiro (formato pedido ao Gemini)
                  const isoMatch = parsed.data.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
                  // Tenta DD/MM/YYYY (formato brasileiro comum)
                  const brMatch = parsed.data.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);

                  if (isoMatch) {
                    year = parseInt(isoMatch[1]);
                    month = parseInt(isoMatch[2]);
                    day = parseInt(isoMatch[3]);
                  } else if (brMatch) {
                    day = parseInt(brMatch[1]);
                    month = parseInt(brMatch[2]);
                    year = parseInt(brMatch[3]);
                  } else {
                    // Fallback: tenta new Date() mas com validação extra
                    const fallback = new Date(parsed.data);
                    if (!isNaN(fallback.getTime())) {
                      year = fallback.getFullYear();
                      month = fallback.getMonth() + 1;
                      day = fallback.getDate();
                    } else {
                      throw new Error("Data não reconhecida");
                    }
                  }

                  // Valida ranges
                  if (year >= 2020 && year <= 2030 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
                    // Constrói Date de forma explícita — evita ambiguidade de timezone
                    invoiceDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
                  }
                  console.log("[Invoices/AI] Data parseada:", invoiceDate?.toISOString() ?? "null", "| original:", parsed.data);
                } catch (dateErr) {
                  console.warn("[Invoices/AI] Falha ao parsear data:", parsed.data, dateErr);
                  // invoiceDate fica null — não impede o salvamento
                }
              }
            } catch (parseErr) {
              console.error("[Invoices/AI] Erro ao parsear JSON:", parseErr, "| texto:", jsonStr);
            }
          } else {
            console.warn("[Invoices/AI] Nenhum JSON encontrado na resposta:", text);
          }
        } else {
          const errText = await geminiRes.text();
          console.error("[Invoices/AI] Gemini retornou erro HTTP", geminiRes.status, errText);
        }
      } catch (aiErr) {
        console.error("[Invoices/AI] Erro Gemini:", aiErr);
      }
    } else {
      console.error("[Invoices/AI] GEMINI_API_KEY não configurada!");
    }


    // ❌ Se não conseguiu ler o valor, não salva — pede nova foto
    if (!aiValue || aiValue <= 0) {
      return NextResponse.json(
        {
          error: "NAO_LEU_VALOR",
          message: "Não consegui ler o valor da nota. Por favor, tire outra foto com melhor iluminação e foco no valor total.",
        },
        { status: 422 }
      );
    }

    // Tenta salvar — se falhar por causa da data, tenta novamente sem a data
    let invoice;
    try {
      invoice = await (prisma as any).purchaseInvoice.create({
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
    } catch (prismaErr: any) {
      console.error("[Invoices/POST] Prisma falhou com invoiceDate, tentando sem data:", prismaErr.message);
      // Fallback: salva sem a data problemática
      invoice = await (prisma as any).purchaseInvoice.create({
        data: {
          uploadedBy: session.user.email,
          description,
          category: category || "BUSINESS",
          imageUrl,
          aiValue,
          aiCategory,
          invoiceDate: null,
          source: "ai",
          status: "APPROVED",
        },
      });
    }

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
