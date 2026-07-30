/**
 * Utilitários de validação e conversão de boletos bancários brasileiros
 */

/**
 * Converte um código de barras de 44 dígitos para a Linha Digitável de 47 dígitos (Boleto Bancário).
 * Se o código já tiver 47 ou 48 dígitos, ou for boleto de concessionária (inicia com 8), retorna a string limpa.
 */
export function convert44ToLinhaDigitavel(barcode: string): string {
  const clean = barcode.replace(/\D/g, "");
  if (clean.length !== 44) return clean;

  // Se iniciar com 8, é boleto de concessionária/arrecadação (48 dígitos)
  if (clean.startsWith("8")) return clean;

  // Boleto Bancário (44 dígitos):
  // Pos 0-3: Banco (3) + Moeda (1)
  // Pos 4: DV Geral (1)
  // Pos 5-18: Fator Vencimento (4) + Valor (10)
  // Pos 19-43: Campo Livre (25)
  const bancoMoeda = clean.slice(0, 4);
  const dvGeral = clean.slice(4, 5);
  const fatorValor = clean.slice(5, 19);
  const campoLivre = clean.slice(19, 44);

  // Campo 1: Banco (3) + Moeda (1) + CampoLivre[0..4] (5) + DV Mod10
  const c1Base = bancoMoeda + campoLivre.slice(0, 5);
  const c1Dv = calcModulo10(c1Base);
  const campo1 = c1Base + c1Dv;

  // Campo 2: CampoLivre[5..14] (10) + DV Mod10
  const c2Base = campoLivre.slice(5, 15);
  const c2Dv = calcModulo10(c2Base);
  const campo2 = c2Base + c2Dv;

  // Campo 3: CampoLivre[15..24] (10) + DV Mod10
  const c3Base = campoLivre.slice(15, 25);
  const c3Dv = calcModulo10(c3Base);
  const campo3 = c3Base + c3Dv;

  // Campo 4: DV Geral (1)
  const campo4 = dvGeral;

  // Campo 5: Fator Vencimento + Valor (14)
  const campo5 = fatorValor;

  return `${campo1}${campo2}${campo3}${campo4}${campo5}`;
}

function calcModulo10(str: string): number {
  let sum = 0;
  let multiplier = 2;
  for (let i = str.length - 1; i >= 0; i--) {
    let res = parseInt(str[i], 10) * multiplier;
    if (res > 9) res = Math.floor(res / 10) + (res % 10);
    sum += res;
    multiplier = multiplier === 2 ? 1 : 2;
  }
  const remainder = sum % 10;
  return remainder === 0 ? 0 : 10 - remainder;
}
