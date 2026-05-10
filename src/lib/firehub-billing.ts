/**
 * FireHub — Modelo de Mensalidade "Pay as You Grow"
 * 
 * Regras:
 *  - Faturamento = 0 no mês        → R$0 (sem cobrança)
 *  - Faturamento > 0                → mínimo de R$60/mês
 *  - Faturamento < R$10.000/mês    → 4% do faturamento (mín R$60)
 *  - Faturamento ≥ R$10.000/mês    → R$400 fixo (teto máximo)
 *  - Apenas pedidos FireHub contam (iFood, 99Food, Rappi = fora)
 *  - 1ª cobrança: após trial de 15 dias
 *  - Débito automático do saldo online (Pagar.me)
 *  - Se saldo insuficiente: dívida acumula para o próximo mês
 *
 * Comparativo: Brendi cobra R$300 teto — FireHub cobra até R$400 (mais justo para alto volume)
 */

export const FIREHUB_PLAN = {
  PERCENT_RATE: 4,          // 4% sobre o faturamento
  MIN_MONTHLY: 60,          // Mínimo R$60/mês
  MAX_MONTHLY: 400,         // Teto R$400/mês (atualizado 10/05/2026 — Brendi = R$300)
  THRESHOLD: 10000,         // A partir de R$10.000, vai pro teto fixo (4% × R$10.000 = R$400)
  TRIAL_DAYS: 15,           // Dias de trial gratuito (atualizado 10/05/2026)
  PIX_RATE: 0.005,          // 0,5% por transação PIX
  PIX_FIXED: 0.40,          // R$0,40 fixo por transação PIX
  CREDIT_RATE: 0.0399,      // 3,99% cartão crédito (spread MDR)
  DEBIT_RATE: 0.0149,       // 1,49% débito
  VOUCHER_RATE: 0.0249,     // 2,49% voucher VR
  SPLIT_PLATFORM: 0.04,     // 4% do faturamento inclui a mensalidade
};

/**
 * Calcula a mensalidade do mês com base no faturamento FireHub
 * 
 * Regra especial:
 * - Se faturamento = 0 → cobra R$0 (restaurante não vendeu nada online)
 * - Se faturamento > 0 → mínimo de R$60 se aplica
 */
export function calcMensalidade(faturamentoMes: number): {
  mensalidade: number;
  modelo: "zero" | "percentual" | "fixo";
  faturamento: number;
  economia: number; // Quanto economiza vs Brendi
} {
  let mensalidade: number;
  let modelo: "zero" | "percentual" | "fixo";

  // REGRA PRINCIPAL: sem vendas = sem cobrança
  if (faturamentoMes === 0) {
    mensalidade = 0;
    modelo = "zero";
  } else if (faturamentoMes >= FIREHUB_PLAN.THRESHOLD) {
    mensalidade = FIREHUB_PLAN.MAX_MONTHLY; // R$400 fixo
    modelo = "fixo";
  } else {
    // 4% do faturamento, com mínimo de R$60
    mensalidade = Math.max(
      FIREHUB_PLAN.MIN_MONTHLY,
      faturamentoMes * (FIREHUB_PLAN.PERCENT_RATE / 100)
    );
    modelo = "percentual";
  }

  // Economia vs Brendi (R$300 teto, threshold R$7.500)
  // Nota: FireHub tem teto maior (R$400) mas é mais justo para restaurantes menores
  const brendiMensalidade = faturamentoMes === 0 ? 0
    : faturamentoMes >= 7500 ? 300
    : Math.max(60, faturamentoMes * 0.04);
  // economia pode ser negativa para alto volume (FireHub cobra mais que Brendi acima de R$7.500)
  // mas FireHub oferece MUITO mais features que justificam o valor
  const economia = brendiMensalidade - mensalidade;

  return { mensalidade, modelo, faturamento: faturamentoMes, economia };
}

/**
 * Calcula quanto deve ser cobrado considerando dívida acumulada de meses anteriores
 * Se o lojista não vendeu nos meses anteriores mas teve mísero meses com cobrança,
 * o sistema tenta cobrar a dívida acumulada junto com o mês atual.
 */
export function calcCobrancaComAcumulado(
  faturamentoMes: number,
  dividaAcumulada: number = 0
): {
  mensalidadeBase: number;    // Cobrança do mês atual
  dividaAnterior: number;      // Dívida de meses anteriores
  totalDevido: number;         // Total a cobrar (base + dívida)
  modelo: "zero" | "percentual" | "fixo";
} {
  const { mensalidade, modelo } = calcMensalidade(faturamentoMes);
  const totalDevido = mensalidade + dividaAcumulada;
  return {
    mensalidadeBase: mensalidade,
    dividaAnterior: dividaAcumulada,
    totalDevido,
    modelo,
  };
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
