const https = require('https');

const asaasKey = process.env.ASAAS_API_KEY;
if (!asaasKey) {
  console.error("Defina ASAAS_API_KEY no ambiente antes de rodar este script.");
  process.exit(1);
}

const options = {
  hostname: 'api.asaas.com',
  path: '/v3/payments?limit=100',
  method: 'GET',
  headers: {
    'access_token': asaasKey,
    'User-Agent': 'hakim-portal/1.0'
  }
};

const req = https.request(options, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log(JSON.parse(data));
  });
});

req.on('error', error => {
  console.error(error);
});

req.end();
