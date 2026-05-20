/**
 * POST /api/admin/simulate-boleto
 * Consulta o boleto no Asaas ANTES de pagar — retorna dados reais para confirmação.
 * Previne pagar conta errada ou valor diferente.
 *
 * Body: { barcode: string }
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

const ASAAS_BASE = "https://api.asaas.com/v3";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const asaasKey = process.env.ASAAS_API_KEY;
  if (!asaasKey) return NextResponse.json({ error: "ASAAS_API_KEY não configurada" }, { status: 503 });

  const { barcode } = await req.json();
  if (!barcode) return NextResponse.json({ error: "Código de barras obrigatório" }, { status: 400 });

  const clean = barcode.replace(/\D/g, "");
  if (clean.length < 44) {
    return NextResponse.json({ error: "Código de barras inválido — deve ter pelo menos 44 dígitos" }, { status: 400 });
  }

  // Consulta o boleto no Asaas (simulação/validação) com timeout de 20s
  let simRes: Response;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);

    simRes = await fetch(`${ASAAS_BASE}/bill/simulate`, {
      method: "POST",
      headers: {
        "access_token": asaasKey,
        "Content-Type": "application/json",
        "User-Agent": "hakim-portal/1.0",
      },
      body: JSON.stringify({ identificationField: clean }),
      signal: controller.signal,
    });

    clearTimeout(timeout);
  } catch (err: any) {
    const isTimeout = err?.name === "AbortError";
    console.error(`[simulate-boleto] ❌ ${isTimeout ? "TIMEOUT" : "NETWORK ERROR"} ao consultar Asaas:`, err?.message || err);
    return NextResponse.json({
      error: isTimeout
        ? "Timeout — o Asaas não respondeu a tempo. Tente novamente em alguns segundos."
        : `Erro de rede com Asaas: ${err?.message || "Falha na conexão"}`,
    }, { status: 502 });
  }

  // Lê a resposta como texto e tenta parsear como JSON
  const rawText = await simRes.text();
  let simData: any;

  try {
    simData = rawText ? JSON.parse(rawText) : null;
  } catch {
    console.error(`[simulate-boleto] ❌ Resposta não-JSON do Asaas (status ${simRes.status}):`, rawText.slice(0, 500));
    return NextResponse.json({
      error: `Asaas retornou resposta inválida (status ${simRes.status}). Tente novamente.`,
    }, { status: 502 });
  }

  if (!simRes.ok || !simData) {
    const asaasMsg = simData?.errors?.[0]?.description
      || simData?.error
      || rawText.slice(0, 100)
      || "(resposta vazia)";
    const msg = simRes.status === 401
      ? "Chave de API do Asaas inválida ou expirada. Verifique ASAAS_API_KEY."
      : `Asaas (${simRes.status}): ${asaasMsg}`;
    console.error(`[simulate-boleto] ❌ Asaas HTTP ${simRes.status}:`, rawText.slice(0, 500));
    return NextResponse.json({ error: msg }, { status: simRes.status === 401 ? 503 : 400 });
  }

  // Log da resposta completa para diagnóstico
  console.log(`[simulate-boleto] ✅ Resposta Asaas:`, JSON.stringify(simData).slice(0, 800));

  // Mapeia os campos — o /bill/simulate pode usar nomes diferentes
  const beneficiary = simData.companyName
    || simData.company?.name
    || simData.beneficiaryName
    || simData.name
    || "Não identificado";

  const cnpj = simData.companyCnpj
    || simData.company?.cpfCnpj
    || simData.cpfCnpj
    || "";

  const value = simData.value ?? simData.totalValue ?? 0;
  const discount = simData.discount ?? 0;
  const fine = simData.fine ?? 0;
  const interest = simData.interest ?? 0;
  const totalValue = simData.totalValue ?? simData.value ?? 0;
  const dueDate = simData.dueDate
    || simData.minimumScheduleDate
    || simData.expirationDate
    || "";

  // Retorna dados reais do boleto para confirmação na tela
  return NextResponse.json({
    success: true,
    _debug: { keys: Object.keys(simData), raw: JSON.stringify(simData).slice(0, 400) },
    boleto: {
      beneficiary,
      cnpj,
      value,
      discount,
      fine,
      interest,
      totalValue,
      dueDate,
      barcode: clean,
    },
  });
}
