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

  // Consulta o boleto no Asaas (simulação/validação)
  const simRes = await fetch(`${ASAAS_BASE}/bill-payment/simulate`, {
    method: "POST",
    headers: {
      "access_token": asaasKey,
      "Content-Type": "application/json",
      "User-Agent": "hakim-portal/1.0",
    },
    body: JSON.stringify({ identificationField: clean }),
  });

  const simData = await simRes.json();

  if (!simRes.ok) {
    const msg = simData?.errors?.[0]?.description
      || simData?.error
      || "Boleto não encontrado ou inválido.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  // Retorna dados reais do boleto para confirmação na tela
  return NextResponse.json({
    success: true,
    boleto: {
      beneficiary:  simData.company?.name || simData.beneficiaryName || "Não identificado",
      cnpj:         simData.company?.cpfCnpj || "",
      value:        simData.value ?? simData.totalValue ?? 0,
      discount:     simData.discount ?? 0,
      fine:         simData.fine ?? 0,
      interest:     simData.interest ?? 0,
      totalValue:   simData.totalValue ?? simData.value ?? 0,
      dueDate:      simData.dueDate || "",
      barcode:      clean,
    },
  });
}
