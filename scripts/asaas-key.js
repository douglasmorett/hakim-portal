/**
 * Resolve a chave do Asaas para os scripts de diagnóstico.
 *
 * Mesma ordem de prioridade do getAsaasKey() em src/lib/asaas.ts: a forma
 * base64 vem primeiro porque o `$` inicial da chave é lido como referência de
 * variável na Vercel e corrompe o valor.
 *
 * Nunca cole a chave aqui — o repositório é público.
 * Configure ASAAS_API_KEY_B64 (ou ASAAS_API_KEY) no .env local.
 */
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

function formatKey(key) {
  if (!key) return null;
  const trimmed = key.replace(/\/g, '').trim();
  if (trimmed.startsWith('$aact_')) return trimmed;
  if (trimmed.startsWith('aact_')) return '$' + trimmed;
  return null;
}

function getAsaasKey() {
  const b64 = process.env.ASAAS_API_KEY_B64;
  if (b64) {
    try {
      const formatted = formatKey(Buffer.from(b64, 'base64').toString('utf8'));
      if (formatted) return formatted;
    } catch (e) {
      console.error('[Asaas] Erro ao decodificar ASAAS_API_KEY_B64:', e.message);
    }
  }

  const direct = formatKey(process.env.ASAAS_API_KEY);
  if (direct) return direct;

  console.error(
    '[Asaas] Chave nao configurada.\n' +
    'Defina ASAAS_API_KEY_B64 (base64 da chave) ou ASAAS_API_KEY no .env.local.'
  );
  process.exit(1);
}

function getBaseUrl(key) {
  return key.includes('aact_prod')
    ? 'https://api.asaas.com/v3'
    : 'https://sandbox.asaas.com/v3';
}

module.exports = { getAsaasKey, getBaseUrl };
