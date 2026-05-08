// Update boleto URLs no banco via Neon serverless
require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function main() {
  console.log('🔗 Conectando ao Neon...\n');

  // Update #2QCC37 - Carne moída corrigida
  const r1 = await sql`
    UPDATE "Order" 
    SET "asaasPaymentId" = ${'pay_rvn1nflordakazb7'}, 
        "boletoUrl" = ${'https://www.asaas.com/i/rvn1nflordakazb7'}, 
        "totalAmount" = ${1337.30}
    WHERE id = ${'cmoudgv340001k404u12qcc37'} 
    RETURNING id, "totalAmount", "asaasPaymentId", "boletoUrl"
  `;
  console.log('✅ #2QCC37:', r1[0] ? `Total R$ ${r1[0].totalAmount} | ${r1[0].boletoUrl}` : 'NÃO ENCONTRADO');

  // Update #98BC4R - Boleto regenerado
  const r2 = await sql`
    UPDATE "Order" 
    SET "asaasPaymentId" = ${'pay_lxg8q5ulsjguk48t'}, 
        "boletoUrl" = ${'https://www.asaas.com/i/lxg8q5ulsjguk48t'}
    WHERE id = ${'cmoudefyo0007jr043198bc4r'} 
    RETURNING id, "totalAmount", "asaasPaymentId", "boletoUrl"
  `;
  console.log('✅ #98BC4R:', r2[0] ? `Total R$ ${r2[0].totalAmount} | ${r2[0].boletoUrl}` : 'NÃO ENCONTRADO');

  console.log('\n🎉 Links de pagamento atualizados no banco!');
}

main().catch(e => console.error('❌ Erro:', e.message));
