import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    return NextResponse.json(
      { error: "Chave de IA não configurada" },
      { status: 500 }
    );
  }

  const { imageUrl } = await req.json();
  if (!imageUrl) {
    return NextResponse.json(
      { error: "URL da imagem é obrigatória" },
      { status: 400 }
    );
  }

  let base64: string;
  let mimeType: string;

  try {
    const imageRes = await fetch(imageUrl);
    if (!imageRes.ok) throw new Error("Failed to download image");

    const contentType = imageRes.headers.get("content-type") || "image/jpeg";
    mimeType = contentType.split(";")[0].trim();

    const buffer = Buffer.from(await imageRes.arrayBuffer());
    base64 = buffer.toString("base64");
  } catch {
    return NextResponse.json(
      { error: "Erro ao acessar a imagem. Tire outra foto." },
      { status: 422 }
    );
  }

  const prompt = `Você é um especialista em leitura de boletos bancários brasileiros.

Analise a imagem enviada e extraia os seguintes dados do boleto:

1. **fornecedor**: Nome do beneficiário/cedente. Geralmente aparece na parte superior do boleto, no campo "Beneficiário" ou "Cedente".
2. **codigoBarras**: A linha digitável completa (sequência numérica longa de 47 ou 48 dígitos, impressa acima ou abaixo do código de barras). Retorne TODOS os dígitos, incluindo pontos e espaços removidos.
3. **vencimento**: Data de vencimento no formato YYYY-MM-DD. Procure pelos campos "Vencimento", "Data de Vencimento", "Dt.Venc" ou similar.
4. **valor**: Valor do documento como número decimal com ponto (ex: 2028.36). Procure pelos campos "Valor do Documento", "Valor Cobrado", "Valor" ou similar. Não inclua o símbolo R$.

Regras importantes:
- Se a imagem NÃO for um boleto ou estiver ilegível, retorne todos os valores como null.
- NUNCA invente dados. Se não conseguir ler um campo com certeza, retorne null para aquele campo.
- Retorne APENAS o JSON, sem explicações adicionais.

Formato de resposta JSON:
{"fornecedor": "string ou null", "codigoBarras": "string ou null", "vencimento": "YYYY-MM-DD ou null", "valor": number ou null}`;

  let geminiText: string;

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { inlineData: { mimeType, data: base64 } },
                { text: prompt },
              ],
            },
          ],
          generationConfig: {
            temperature: 0,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!geminiRes.ok) throw new Error("Gemini API error");

    const geminiData = await geminiRes.json();
    geminiText =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  } catch {
    return NextResponse.json(
      { error: "Serviço de leitura indisponível. Tente novamente." },
      { status: 422 }
    );
  }

  if (!geminiText.trim()) {
    return NextResponse.json(
      { error: "Não foi possível ler o boleto. Tire outra foto mais nítida." },
      { status: 422 }
    );
  }

  let parsed: {
    fornecedor: string | null;
    codigoBarras: string | null;
    vencimento: string | null;
    valor: number | null;
  };

  try {
    const jsonMatch =
      geminiText.match(/```json\s*([\s\S]*?)```/) ||
      geminiText.match(/```\s*([\s\S]*?)```/) ||
      geminiText.match(/(\{[\s\S]*\})/);

    const raw = jsonMatch ? jsonMatch[1].trim() : geminiText.trim();
    parsed = JSON.parse(raw);
  } catch {
    return NextResponse.json(
      { error: "Não foi possível ler o boleto. Tire outra foto mais nítida." },
      { status: 422 }
    );
  }

  if (
    !parsed.fornecedor &&
    !parsed.codigoBarras &&
    !parsed.vencimento &&
    !parsed.valor
  ) {
    return NextResponse.json(
      { error: "Foto ilegível. Tire outra com melhor iluminação." },
      { status: 422 }
    );
  }

  return NextResponse.json({
    data: {
      supplierName: parsed.fornecedor || null,
      barcode: parsed.codigoBarras || null,
      dueDate: parsed.vencimento || null,
      value: parsed.valor || null,
    },
  });
}
