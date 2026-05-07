const { execSync } = require('child_process');

const envs = {
  "ASAAS_API_KEY": "$aact_prod_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OmZlYWIwNWI0LTcxMWMtNDllNi05ZmVhLWEzMzhkOGRiNmQzMjo6JGFhY2hfMDkyNmY3NzUtNWI2ZC00ZjQ2LTlmMTktZTI4YTBhODY2ZjUy",
  "NEXTAUTH_SECRET": "a1b2c3d4e5f6g7h8i9j0",
  "NEXTAUTH_URL": "https://hakim-portal.vercel.app",
  "DATABASE_URL": "postgresql://neondb_owner:npg_9C4DXWRhvBUo@ep-soft-water-amzwjl9k-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
};

const token = "vcp_22WaRYt6HZq5HFOFnl2jlg4gUA49VsK1FUfGKnv4NqFGW8HpNh05tPBh";

for (const [key, value] of Object.entries(envs)) {
  try {
    console.log(`Setting ${key}...`);
    // Remove first just in case
    try {
      execSync(`npx vercel env rm ${key} production --yes --token ${token} --scope grupohakim`, { stdio: 'ignore' });
    } catch (e) {}
    
    execSync(`node -e "process.stdout.write('${value}')" | npx vercel env add ${key} production --token ${token} --scope grupohakim`);
  } catch (err) {
    console.error(`Failed to set ${key}`);
  }
}

console.log("Done setting env vars.");
