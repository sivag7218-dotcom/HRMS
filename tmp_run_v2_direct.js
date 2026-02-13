const http = require('http');
const token = process.argv[2];
if (!token) { console.error('TOKEN_REQUIRED'); process.exit(1); }

function request(opts, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(opts, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', e => reject(e));
    if (data) req.write(data);
    req.end();
  });
}

async function runTests() {
  try {
    const data = JSON.stringify({ year: 2026, month: 2 });
    console.log('POST /api/payroll/v2/run');
    const run = await request({ hostname: 'localhost', port: 3000, path: '/api/payroll/v2/run', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data), 'Authorization': 'Bearer ' + token } }, data);
    console.log('STATUS', run.status);
    console.log(run.body);

    console.log('\nGET /api/payroll/v2/payslips/1');
    const list = await request({ hostname: 'localhost', port: 3000, path: '/api/payroll/v2/payslips/1', method: 'GET', headers: { 'Authorization': 'Bearer ' + token } });
    console.log('STATUS', list.status);
    console.log(list.body);

    console.log('\nGET /api/payroll/v2/payslips/1/2026/2');
    const detail = await request({ hostname: 'localhost', port: 3000, path: '/api/payroll/v2/payslips/1/2026/2', method: 'GET', headers: { 'Authorization': 'Bearer ' + token } });
    console.log('STATUS', detail.status);
    console.log(detail.body);

    process.exit(0);
  } catch (e) {
    console.error('ERR', e && e.message ? e.message : e);
    process.exit(1);
  }
}

runTests();
