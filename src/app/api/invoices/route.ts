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

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      console.error("[Invoices/AI] GEMINI_API_KEY não configurada!");
      return NextResponse.json(
        { error: "NAO_LEU_VALOR", message: "Erro interno: chave de IA não configurada. Avise o administrador." },
        { status: 500 }
      );
    }

    // 1. Baixar a imagem e converter para base64
    let base64: string;
    let mimeType: string;
    try {
      const imgResponse = await fetch(imageUrl);
      if (!imgResponse.ok) throw new Error(`HTTP ${imgResponse.status}`);
      const imgBuffer = await imgResponse.arrayBuffer();
      base64 = Buffer.from(imgBuffer).toString("base64");
      mimeType = imgResponse.headers.get("content-type") || "image/jpeg";
    } catch (imgErr: any) {
      console.error("[Invoices/AI] Erro ao baixar imagem:", imgErr);
      return NextResponse.json(
        { error: "NAO_LEU_VALOR", message: "Erro ao acessar a imagem enviada. Tire outra foto e tente novamente." },
        { status: 422 }
      );
    }

    // 2. Chamar Gemini 2.5 Flash para ler a nota
    let geminiText = "";
    try {
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [
                { inlineData: { mimeType, data: base64 } },
                {
                  text: `Você é um leitor especialista de notas fiscais e cupons fiscais brasileiros. Analise CUIDADOSAMENTE esta imagem e extraia:

1. VALOR TOTAL — procure "TOTAL", "TOTAL R$", "VALOR TOTAL", "TOTAL A PAGAR", "VL TOTAL". O valor usa vírgula decimal (ex: 125,50). Retorne como número com ponto (125.50).
2. DATA DE EMISSÃO — procure "DATA", "DT.EMIS", "EMISSÃO", "DT EMISSÃO". Retorne no formato YYYY-MM-DD.
3. CATEGORIA — classifique baseado no contexto: "${description}"

Categorias: Matéria-prima/Ingredientes, Embalagens, Gás/Combustível, Manutenção/Equipamentos, Limpeza/Higiene, Marketing/Publicidade, Aluguel/Condomínio, Água/Energia/Internet, Frete/Logística, Material de Escritório, Salários/Freelancers, Impostos/Taxas, Outros

IMPORTANTE:
- Se a imagem estiver ilegível, borrada ou não for uma nota fiscal, retorne: {"valor": null, "data": null, "categoria": null, "erro": "Imagem não é uma nota fiscal legível"}
- Se conseguir ler o valor mas não a data, retorne a data como null
- NUNCA invente valores. Só retorne o que realmente está escrito na nota.

Responda APENAS com JSON puro:
{"valor": 125.50, "data": "2024-01-15", "categoria": "Outros"}`
                }
              ]
            }],
            generationConfig: { temperature: 0, responseMimeType: "application/json" }
          }),
        }
      );

      if (!geminiRes.ok) {
        const errBody = await geminiRes.text();
        console.error("[Invoices/AI] Gemini HTTP", geminiRes.status, errBody);
        return NextResponse.json(
          { error: "NAO_LEU_VALOR", message: "Serviço de leitura temporariamente indisponível. Tente novamente em alguns segundos." },
          { status: 422 }
        );
      }

      const geminiData = await geminiRes.json();
      geminiText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
      console.log("[Invoices/AI] Resposta Gemini:", geminiText);
    } catch (aiErr: any) {
      console.error("[Invoices/AI] Erro na chamada Gemini:", aiErr);
      return NextResponse.json(
        { error: "NAO_LEU_VALOR", message: "Erro ao conectar com o serviço de leitura. Verifique sua conexão e tente novamente." },
        { status: 422 }
      );
    }

    // 3. Parsear o JSON da resposta do Gemini
    if (!geminiText.trim()) {
      return NextResponse.json(
        { error: "NAO_LEU_VALOR", message: "A IA não conseguiu ler nada da imagem. Tire outra foto com melhor iluminação." },
        { status: 422 }
      );
    }

    let parsed: any;
    try {
      // Suporta JSON puro ou envolvido em markdown
      const jsonMatch = geminiText.match(/```json\s*([\s\S]*?)```/) ||
                        geminiText.match(/```\s*([\s\S]*?)```/) ||
                        geminiText.match(/(\{[\s\S]*\})/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]).trim() : geminiText.trim();
      parsed = JSON.parse(jsonStr);
      console.log("[Invoices/AI] JSON parseado:", parsed);
    } catch (parseErr) {
      console.error("[Invoices/AI] Falha ao parsear JSON:", parseErr, "| texto:", geminiText);
      return NextResponse.json(
        { error: "NAO_LEU_VALOR", message: "A IA não conseguiu interpretar a nota. Tire outra foto mais nítida, focando no valor total." },
        { status: 422 }
      );
    }

    // 4. Se o Gemini reportou erro (imagem ilegível)
    if (parsed.erro) {
      return NextResponse.json(
        { error: "NAO_LEU_VALOR", message: `📷 ${parsed.erro}. Tire outra foto com melhor qualidade.` },
        { status: 422 }
      );
    }

    // 5. Extrair e validar o VALOR (obrigatório)
    let aiValue: number | null = null;
    if (parsed.valor !== null && parsed.valor !== undefined) {
      const valorStr = String(parsed.valor).replace(",", ".");
      const valorNum = parseFloat(valorStr);
      if (!isNaN(valorNum) && valorNum > 0) aiValue = valorNum;
    }

    if (!aiValue || aiValue <= 0) {
      return NextResponse.json(
        {
          error: "NAO_LEU_VALOR",
          message: "📷 Não consegui ler o valor total da nota. Tire outra foto com melhor iluminação e foco no valor total.",
        },
        { status: 422 }
      );
    }

    // 6. Extrair categoria
    const aiCategory: string | null = parsed.categoria || null;

    // 7. Extrair e sanitizar data (opcional — não bloqueia o salvamento)
    let invoiceDate: Date | null = null;
    if (parsed.data && typeof parsed.data === "string") {
      try {
        let year: number | undefined, month: number | undefined, day: number | undefined;

        const isoMatch = parsed.data.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
        const brMatch = parsed.data.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);

        if (isoMatch) {
          year = parseInt(isoMatch[1]);
          month = parseInt(isoMatch[2]);
          day = parseInt(isoMatch[3]);
        } else if (brMatch) {
          day = parseInt(brMatch[1]);
          month = parseInt(brMatch[2]);
          year = parseInt(brMatch[3]);
        }

        if (year && month && day && year >= 2020 && year <= 2030 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
          invoiceDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
        }
      } catch {
        // Data fica null — não impede o salvamento
      }
    }

    // 8. Salvar no banco
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
