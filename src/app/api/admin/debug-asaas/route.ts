/**
 * TEMPORARY DEBUG ENDPOINT — retorna a resposta bruta do Asaas /bill/simulate
 * REMOVER APÓS DIAGNÓSTICO
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const asaasKey = process.env.ASAAS_API_KEY;
  if (!asaasKey) return NextResponse.json({ error: "ASAAS_API_KEY não configurada" }, { status: 503 });

  const { barcode } = await req.json();
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
    status: res.status,
    rawText,
    parsed: (() => { try { return JSON.parse(rawText); } catch { return null; } })(),
    keyPrefix: asaasKey.slice(0, 12) + "...",
  });
}
