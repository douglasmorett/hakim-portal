/**
 * lib/billing.ts
 * 
 * Motor de faturamento "Use First, Pay Later"
 * 
 * Fluxo:
 * 1. A cada pagamento online confirmado (Pagar.me webhook) → applyOnlinePaymentOffset()
 * 2. No fechamento do mês (API /api/billing/close-month) → closeBillingCycle()
 * 3. Se ainda há saldo → gera cobrança Asaas com apenas a diferença
 */

import { prisma } from "@/lib/prisma";

/** Retorna "YYYY-MM" do mês atual (ou do mês passado se passar -1) */
export function getCurrentYearMonth(offset = 0): string {
  const d = new Date();
  d.setMonth(d.getMonth() + offset);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/**
 * Garante que existe um ciclo OPEN para o franqueado no mês atual.
 * Se não existir, cria um novo com planPercent snapshot do usuário.
 */
export async function ensureBillingCycle(franchiseeId: string): Promise<string> {
  const yearMonth = getCurrentYearMonth();

  const existing = await prisma.franchiseeBillingCycle.findUnique({
    where: { franchiseeId_yearMonth: { franchiseeId, yearMonth } },
  });

  if (existing) return existing.id;

  const user = await prisma.user.findUnique({
    where: { id: franchiseeId },
    select: { planPercent: true },
  });

  const cycle = await prisma.franchiseeBillingCycle.create({
    data: {
      franchiseeId,
      yearMonth,
      planPercent: user?.planPercent ?? 0,
      status: "OPEN",
    },
  });

  return cycle.id;
}

/**
 * Chamada a cada CustomerOrder pago via Pagar.me.
 * 
 * 1. Recalcula o totalSales do mês (soma de todos os pedidos pagos do mês)
 * 2. Aplica o offset = valor pago neste pedido  
 * 3. Atualiza amountDue, amountOffset e amountPending em tempo real
 */
export async function applyOnlinePaymentOffset(params: {
  franchiseeId: string;
  orderId: string;
  paidAmount: number;         // Valor do pedido pago agora
  pagarmeOrderId?: string;
}) {
  const { franchiseeId, orderId, paidAmount, pagarmeOrderId } = params;
  const yearMonth = getCurrentYearMonth();

  await ensureBillingCycle(franchiseeId);

  const cycle = await prisma.franchiseeBillingCycle.findUnique({
    where: { franchiseeId_yearMonth: { franchiseeId, yearMonth } },
  });

  if (!cycle || cycle.status !== "OPEN") return;

  // Recalcula totalSales: soma todos os pedidos online PAGOS do mês para este franqueado
  const [y, m] = yearMonth.split("-").map(Number);
  const monthStart = new Date(y, m - 1, 1);
  const monthEnd = new Date(y, m, 1);

  const salesAgg = await prisma.customerOrder.aggregate({
    where: {
      franchiseeId,
      pagarmeStatus: "paid",
      paymentPaidAt: { gte: monthStart, lt: monthEnd },
    },
    _sum: { totalAmount: true },
  });

  const totalSales = salesAgg._sum.totalAmount ?? 0;
  const amountDue = parseFloat(((totalSales * cycle.planPercent) / 100).toFixed(2));
  const newOffset = parseFloat((cycle.amountOffset + paidAmount).toFixed(2));
  const amountPending = parseFloat(Math.max(0, amountDue - newOffset).toFixed(2));

  // Atualiza log de abatimentos
  const prevLog = Array.isArray(cycle.offsetLog) ? (cycle.offsetLog as any[]) : [];
  const offsetLog = [
    ...prevLog,
    {
      date: new Date().toISOString(),
      orderId,
      pagarmeOrderId: pagarmeOrderId ?? null,
      amount: paidAmount,
    },
  ];

  await prisma.franchiseeBillingCycle.update({
    where: { id: cycle.id },
    data: {
      totalSales,
      amountDue,
      amountOffset: newOffset,
      amountPending,
      offsetLog,
      // Se o offset já cobriu tudo, marca como PAID automaticamente
      status: newOffset >= amountDue ? "PAID" : "OPEN",
    },
  });

  console.log(
    `[Billing] ${franchiseeId} ${yearMonth} | Vendas=${totalSales.toFixed(2)} ` +
    `Devido=${amountDue.toFixed(2)} Offset=${newOffset.toFixed(2)} Pendente=${amountPending.toFixed(2)}`
  );
}

/**
 * Fecha o mês de um franqueado:
 * 1. Recalcula totais finais
 * 2. Se amountPending > R$1 → gera cobrança Asaas pelo valor restante
 * 3. Marca o ciclo como CLOSED (ou PAID se offset cobriu tudo)
 */
export async function closeBillingCycle(franchiseeId: string, yearMonth: string) {
  const cycle = await prisma.franchiseeBillingCycle.findUnique({
    where: { franchiseeId_yearMonth: { franchiseeId, yearMonth } },
    include: { franchisee: true },
  });

  if (!cycle) throw new Error(`Ciclo ${yearMonth} não encontrado para ${franchiseeId}`);
  if (cycle.status !== "OPEN") throw new Error(`Ciclo já está ${cycle.status}`);

  // Recalcula totalSales final (soma pedidos pagos do mês todo)
  const [y, m] = yearMonth.split("-").map(Number);
  const monthStart = new Date(y, m - 1, 1);
  const monthEnd = new Date(y, m, 1);

  const salesAgg = await prisma.customerOrder.aggregate({
    where: {
      franchiseeId,
      pagarmeStatus: "paid",
      paymentPaidAt: { gte: monthStart, lt: monthEnd },
    },
    _sum: { totalAmount: true },
  });

  const totalSales = salesAgg._sum.totalAmount ?? 0;
  const amountDue = parseFloat(((totalSales * cycle.planPercent) / 100).toFixed(2));
  const amountPending = parseFloat(Math.max(0, amountDue - cycle.amountOffset).toFixed(2));

  // Se não há nada a cobrar, marca como PAID
  if (amountPending < 1) {
    await prisma.franchiseeBillingCycle.update({
      where: { id: cycle.id },
      data: {
        totalSales,
        amountDue,
        amountPending: 0,
        status: "PAID",
        closedAt: new Date(),
      },
    });
    return { charged: false, amountPending: 0, message: "Offset cobriu o valor total. Nada a cobrar." };
  }

  // Gera cobrança Asaas apenas com a diferença restante
  const asaasKey = process.env.ASAAS_API_KEY;
  let asaasPaymentId: string | null = null;
  let asaasBoletoUrl: string | null = null;
  let asaasBoletoCode: string | null = null;

  if (asaasKey && cycle.franchisee.cpfCnpj) {
    const ASAAS_BASE = asaasKey.startsWith("$aact_prod")
      ? "https://api.asaas.com/v3"
      : "https://sandbox.asaas.com/v3";

    // Busca ou cria cliente no Asaas
    let customerId: string | null = null;
    const search = await fetch(
      `${ASAAS_BASE}/customers?cpfCnpj=${encodeURIComponent(cycle.franchisee.cpfCnpj)}`,
      { headers: { access_token: asaasKey } }
    );
    if (search.ok) {
      const sd = await search.json();
      if (sd.data?.length > 0) customerId = sd.data[0].id;
    }

    if (!customerId) {
      const cr = await fetch(`${ASAAS_BASE}/customers`, {
        method: "POST",
        headers: { "Content-Type": "application/json", access_token: asaasKey },
        body: JSON.stringify({
          name: cycle.franchisee.name,
          email: cycle.franchisee.email,
          cpfCnpj: cycle.franchisee.cpfCnpj,
        }),
      });
      const cd = await cr.json();
      if (cr.ok) customerId = cd.id;
    }

    if (customerId) {
      // Vencimento: dia 5 do próximo mês
      const dueDate = new Date(y, m, 5); // mês seguinte, dia 5
      const dueDateStr = dueDate.toISOString().split("T")[0];

      const pr = await fetch(`${ASAAS_BASE}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", access_token: asaasKey },
        body: JSON.stringify({
          customer: customerId,
          billingType: "BOLETO",
          value: amountPending,
          dueDate: dueDateStr,
          description: `Taxa do sistema ${yearMonth} — Hakim FireHub (diferença após abatimentos)`,
          externalReference: `billing:${cycle.id}`,
        }),
      });

      if (pr.ok) {
        const pd = await pr.json();
        asaasPaymentId = pd.id;
        asaasBoletoUrl = pd.invoiceUrl || pd.bankSlipUrl || null;
        asaasBoletoCode = pd.barCode || null;
      }
    }
  }

  await prisma.franchiseeBillingCycle.update({
    where: { id: cycle.id },
    data: {
      totalSales,
      amountDue,
      amountPending,
      status: "CLOSED",
      closedAt: new Date(),
      asaasPaymentId,
      asaasBoletoUrl,
      asaasBoletoCode,
    },
  });

  return { charged: true, amountPending, asaasBoletoUrl, message: "Link gerado com o valor restante." };
}
