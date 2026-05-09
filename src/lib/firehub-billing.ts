/**
 * FireHub — Modelo de Mensalidade "Pay as You Grow"
 * 
 * Regras:
 *  - Faturamento < R$7.500/mês  → 4% do faturamento (mín R$60)
 *  - Faturamento ≥ R$7.500/mês  → R$250 fixo (teto máximo)
 *  - Apenas pedidos FireHub contam (iFood, 99Food, Rappi = fora)
 *  - 1ª cobrança: após trial de 14 dias
 *  - Débito automático do saldo online (Pagar.me)
 *
 * Comparativo: Brendi cobra R$300 teto — FireHub cobra R$250 (R$50 mais barato)
 */

export const FIREHUB_PLAN = {
  PERCENT_RATE: 4,          // 4% sobre o faturamento
  MIN_MONTHLY: 60,          // Mínimo R$60/mês
  MAX_MONTHLY: 250,         // Teto R$250/mês (Brendi = R$300)
  THRESHOLD: 6250,          // A partir de R$6.250, vai pro teto fixo (4% × R$6.250 = R$250)
  TRIAL_DAYS: 14,           // Dias de trial gratuito
  PIX_RATE: 0.005,          // 0,5% por transação PIX
  PIX_FIXED: 0.40,          // R$0,40 fixo por transação PIX
  CREDIT_RATE: 0.0399,      // 3,99% cartão crédito (spread MDR)
  DEBIT_RATE: 0.0149,       // 1,49% débito
  VOUCHER_RATE: 0.0249,     // 2,49% voucher VR
  SPLIT_PLATFORM: 0.04,     // 4% do faturamento inclui a mensalidade
};

/**
 * Calcula a mensalidade do mês com base no faturamento FireHub
 */
export function calcMensalidade(faturamentoMes: number): {
  mensalidade: number;
  modelo: "percentual" | "fixo";
  faturamento: number;
  economia: number; // Quanto economiza vs Brendi
} {
  let mensalidade: number;
  let modelo: "percentual" | "fixo";

  if (faturamentoMes >= FIREHUB_PLAN.THRESHOLD) {
    mensalidade = FIREHUB_PLAN.MAX_MONTHLY; // R$250 fixo
    modelo = "fixo";
  } else {
    mensalidade = Math.max(
      FIREHUB_PLAN.MIN_MONTHLY,
      faturamentoMes * (FIREHUB_PLAN.PERCENT_RATE / 100)
    );
    modelo = "percentual";
  }

  // Economia vs Brendi (R$300 teto, threshold R$7.500)
  const brendiMensalidade = faturamentoMes >= 7500
    ? 300
    : Math.max(60, faturamentoMes * 0.04);
  const economia = brendiMensalidade - mensalidade;

  return { mensalidade, modelo, faturamento: faturamentoMes, economia };
}

/**
 * Calcula taxa por transação PIX
 */
export function calcTaxaPix(valorPedido: number): number {
  return valorPedido * FIREHUB_PLAN.PIX_RATE + FIREHUB_PLAN.PIX_FIXED;
}

/**
 * Calcula taxa por transação cartão
 */
export function calcTaxaCartao(
  valorPedido: number,
  metodo: "credit_card" | "debit_card" | "voucher"
): number {
  const rate = metodo === "credit_card"
    ? FIREHUB_PLAN.CREDIT_RATE
    : metodo === "debit_card"
    ? FIREHUB_PLAN.DEBIT_RATE
    : FIREHUB_PLAN.VOUCHER_RATE;
  return valorPedido * rate;
}

/**
 * Simula o extrato mensal do restaurante
 */
export function simularExtrato(faturamento: number, pedidosPix: number, ticketMedio: number) {
  const { mensalidade, modelo } = calcMensalidade(faturamento);
  const totalTaxasPix = pedidosPix * calcTaxaPix(ticketMedio);
  const liquido = faturamento - mensalidade - totalTaxasPix;

  return {
    faturamentoBruto: faturamento,
    mensalidade,
    modelo,
    totalTaxasPix,
    liquido,
    percentualTotal: ((mensalidade + totalTaxasPix) / faturamento * 100).toFixed(1),
  };
}
