export interface CardStatementStatus {
  cardId: string;
  cardName: string;
  lastDigits: string | null;
  bankName: string | null;
  closingDay: number;
  dueDay: number;
  bestPurchaseDay: number | null;
  needsStatementLaunch: boolean;
  expectedDueDate: Date;
  statementPeriod: string; // Formato "YYYY-MM" (mês/ano de fechamento)
}

/**
 * Calcula o status de fechamento de fatura de um cartão e se precisa ser lançado.
 */
export function getCardStatementStatus(
  card: {
    id: string;
    name: string;
    lastDigits: string | null;
    bankName: string | null;
    closingDay: number | null;
    dueDay: number | null;
    bestPurchaseDay: number | null;
  },
  existingPayables: { creditCardId: string | null; dueDate: Date | string }[]
): CardStatementStatus | null {
  if (!card.closingDay || !card.dueDay) return null;

  // Data atual no fuso do Brasil (UTC-3)
  const today = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const currentDay = today.getDate();
  const currentMonth = today.getMonth(); // 0-indexed
  const currentYear = today.getFullYear();

  // Determinar o mês e ano do fechamento mais recente
  let closingMonth = currentMonth;
  let closingYear = currentYear;

  if (currentDay >= card.closingDay) {
    // Fatura já fechou este mês
    closingMonth = currentMonth;
    closingYear = currentYear;
  } else {
    // Fatura mais recente fechada foi no mês anterior
    closingMonth = currentMonth - 1;
    if (closingMonth < 0) {
      closingMonth = 11;
      closingYear = currentYear - 1;
    }
  }

  // Determinar mês e ano do vencimento dessa fatura fechada
  let dueMonth = closingMonth;
  let dueYear = closingYear;

  if (card.dueDay > card.closingDay) {
    // Vence no mesmo mês do fechamento (ex: fecha dia 10, vence dia 20)
    dueMonth = closingMonth;
    dueYear = closingYear;
  } else {
    // Vence no mês seguinte ao fechamento (ex: fecha dia 25, vence dia 5)
    dueMonth = closingMonth + 1;
    if (dueMonth > 11) {
      dueMonth = 0;
      dueYear = closingYear + 1;
    }
  }

  // Objeto de data de vencimento esperado
  const expectedDueDate = new Date(dueYear, dueMonth, card.dueDay);

  // Período correspondente (ex: "2026-02")
  const statementPeriod = `${closingYear}-${String(closingMonth + 1).padStart(2, "0")}`;

  // Filtrar contas a pagar deste cartão
  const cardPayables = existingPayables.filter(p => p.creditCardId === card.id);
  
  // Verificar se já existe lançamento com vencimento no mesmo mês/ano calculados
  const alreadyLaunched = cardPayables.some(p => {
    const pDate = new Date(p.dueDate);
    return pDate.getFullYear() === dueYear && pDate.getMonth() === dueMonth;
  });

  return {
    cardId: card.id,
    cardName: card.name,
    lastDigits: card.lastDigits,
    bankName: card.bankName,
    closingDay: card.closingDay,
    dueDay: card.dueDay,
    bestPurchaseDay: card.bestPurchaseDay,
    needsStatementLaunch: !alreadyLaunched,
    expectedDueDate,
    statementPeriod
  };
}
