const https = require('https');

const asaasKey = process.env.ASAAS_API_KEY || '$aact_prod_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OmZlYWIwNWI0LTcxMWMtNDllNi05ZmVhLWEzMzhkOGRiNmQzMjo6JGFhY2hfMDkyNmY3NzUtNWI2ZC00ZjQ2LTlmMTktZTI4YTBhODY2ZjUy';

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
