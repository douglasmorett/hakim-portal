const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

async function testAllEnvs() {
  const files = [
    '.env',
    '.env.local',
    '.env.prod-check',
    '.env.vercel',
    '.env.vercel-pulled',
    '.env.vercel.prod'
  ];

  const keys = new Set();

  files.forEach(file => {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      const parsed = dotenv.parse(fs.readFileSync(filePath));
      ['ASAAS_API_KEY', 'ASAAS_API_KEY_B64'].forEach(varName => {
        if (parsed[varName]) {
          let val = parsed[varName];
          if (varName === 'ASAAS_API_KEY_B64') {
            try { val = Buffer.from(val, 'base64').toString('utf8'); } catch (e) {}
          }
          val = val.trim().replace(/[\r\n\t]/g, '').replace(/\\/g, '');
          if (val.startsWith('aact_')) val = '$' + val;
          keys.add(val);
          console.log(`Found key in ${file} (${varName}): len=${val.length}, prefix=${val.substring(0, 20)}...`);
        }
      });
    }
  });

  console.log(`\nTesting ${keys.size} unique keys against Asaas API...\n`);

  for (const key of keys) {
    const isProd = key.includes('aact_prod');
    const base = isProd ? "https://api.asaas.com/v3" : "https://sandbox.asaas.com/v3";
    console.log(`Testing key prefix: ${key.substring(0, 20)}... on ${base}`);

    try {
      const res = await fetch(`${base}/payments?limit=1`, {
        headers: { "access_token": key, "User-Agent": "hakim-portal/1.0" }
      });
      console.log(`Status: ${res.status}`);
      if (res.ok) {
        const data = await res.json();
        console.log('🎉 WORKING ASAAS KEY FOUND!');
        console.log('Response:', JSON.stringify(data, null, 2).substring(0, 300));
        return key;
      } else {
        const text = await res.text();
        console.log('Error:', text.substring(0, 200));
      }
    } catch (e) {
      console.log('Fetch error:', e.message);
    }
  }
  return null;
}

testAllEnvs().catch(console.error);
