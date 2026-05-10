/**
 * Script para configurar variáveis de ambiente no Vercel
 * Execute: VERCEL_TOKEN=seu_token node scripts/push-env.js
 * 
 * NUNCA commite tokens ou senhas neste arquivo.
 * Use variáveis de ambiente locais.
 */
const { execSync } = require('child_process');

const token = process.env.VERCEL_TOKEN;
if (!token) {
  console.error("❌ VERCEL_TOKEN não definido. Execute: VERCEL_TOKEN=xxx node scripts/push-env.js");
  process.exit(1);
}

const envs = {
  "NEXTAUTH_URL": process.env.NEXTAUTH_URL || "https://hakim-portal.vercel.app",
  // As demais variáveis devem ser configuradas manualmente no painel do Vercel
  // ou via: VARNAME=valor VERCEL_TOKEN=xxx node scripts/push-env.js
};

for (const [key, value] of Object.entries(envs)) {
  try {
    console.log(`Setting ${key}...`);
    try {
      execSync(`npx vercel env rm ${key} production --yes --token ${token}`, { stdio: 'ignore' });
    } catch (e) {}
    execSync(`echo "${value}" | npx vercel env add ${key} production --token ${token}`);
    console.log(`✅ ${key} definido`);
  } catch (err) {
    console.error(`❌ Falha ao definir ${key}`);
  }
}

console.log("Concluído.");
