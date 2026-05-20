/**
 * TEMPORARY DEBUG — resposta bruta do Asaas /bill/simulate
 * Protegido por secret no body. REMOVER APÓS DIAGNÓSTICO.
 */
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { barcode, secret } = await req.json();
  if (secret !== "hakim-debug-2026") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const asaasKey = process.env.ASAAS_API_KEY;
  if (!asaasKey) return NextResponse.json({ error: "no key", keyLen: 0 }, { status: 503 });

  const clean = (barcode || "").replace(/\D/g, "");

  const res = await fetch("https://api.asaas.com/v3/bill/simulate", {
    method: "POST",
    headers: {
      "access_token": asaasKey,
      "Content-Type": "application/json",
      "User-Agent": "hakim-portal/1.0",
    },
    body: JSON.stringify({ identificationField: clean }),
  });

  const rawText = await res.text();

  return NextResponse.json({
    asaasStatus: res.status,
    rawResponse: rawText,
    keyPrefix: asaasKey.slice(0, 15) + "...",
    keyLength: asaasKey.length,
  });
}
