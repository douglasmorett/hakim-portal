/**
 * POST /api/payables/ai — Extrai APENAS o código de barras de uma foto de boleto
 * Usa Gemini Vision para ler a linha digitável (números) da imagem
 */
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
    return NextResponse.json({ error: "Chave de IA não configurada" }, { status: 500 });
  }

  const { imageUrl } = await req.json();
  if (!imageUrl) {
    return NextResponse.json({ error: "URL da imagem é obrigatória" }, { status: 400 });
  }

  // 1. Baixar imagem e converter para base64
  let base64: string;
  let mimeType: string;

  try {
    const imageRes = await fetch(imageUrl);
    if (!imageRes.ok) throw new Error("Failed to download image");
    mimeType = (imageRes.headers.get("content-type") || "image/jpeg").split(";")[0].trim();
    base64 = Buffer.from(await imageRes.arrayBuffer()).toString("base64");
  } catch {
    return NextResponse.json(
      { error: "Erro ao acessar a imagem. Tire outra foto." },
      { status: 422 }
    );
  }

  // 2. Prompt focado EXCLUSIVAMENTE em extrair a linha digitável
  const prompt = `Você é um especialista em leitura de boletos bancários brasileiros.

Analise esta imagem e encontre a LINHA DIGITÁVEL do boleto.

A linha digitável é uma sequência de 47 ou 48 dígitos numéricos, geralmente impressa na parte superior do boleto ou logo acima/abaixo do código de barras (as barras pretas).

Exemplos de formato:
- 23790.33000 90000.897125 89007.000006 7 14640000024045
- 74891.12628 64990.981363 10487.801044 2 14520000202836

REGRAS:
- Retorne APENAS os dígitos numéricos, sem pontos, espaços ou traços
- Se encontrar múltiplas sequências numéricas longas, escolha a que tem 47 ou 48 dígitos
- Se a imagem NÃO for um boleto ou estiver ilegível, retorne null
- NUNCA invente números. Só retorne o que realmente está escrito

Responda APENAS com JSON:
{"codigoBarras": "string com apenas dígitos ou null"}`;

  // 3. Chamar Gemini
  let geminiText: string;
  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [
            { inlineData: { mimeType, data: base64 } },
            { text: prompt },
          ]}],
          generationConfig: { temperature: 0, responseMimeType: "application/json" },
        }),
      }
    );

    if (!geminiRes.ok) throw new Error("Gemini API error");
    const geminiData = await geminiRes.json();
    geminiText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  } catch {
    return NextResponse.json(
      { error: "Serviço de leitura indisponível. Tente novamente." },
      { status: 422 }
    );
  }

  if (!geminiText.trim()) {
    return NextResponse.json(
      { error: "Não foi possível ler a foto. Tire outra mais nítida." },
      { status: 422 }
    );
  }

  // 4. Parsear resposta
  let parsed: { codigoBarras: string | null };
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

  // 5. Limpar e validar o código
  const barcode = parsed.codigoBarras?.replace(/\D/g, "") || null;

  if (!barcode || barcode.length < 44) {
    return NextResponse.json(
      { error: "Código de barras não encontrado na foto. Tire outra foto mais próxima dos números." },
      { status: 422 }
    );
  }

  return NextResponse.json({ barcode });
}
