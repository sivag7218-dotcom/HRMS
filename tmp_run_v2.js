const http = require('http');

function postRun(year, month) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ year, month });
    const options = {
      hostname: '127.0.0.1',
      port: 3000,
      path: '/api/payroll/v2/run',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };
    const req = http.request(options, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', e => reject(e));
    req.write(data);
    req.end();
  });
}

function getPayslips(employeeId) {
  return new Promise((resolve, reject) => {
    const options = { hostname: '127.0.0.1', port: 3000, path: `/api/payroll/v2/payslips/${employeeId}`, method: 'GET' };
    const req = http.request(options, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', e => reject(e));
    req.end();
  });
}

function getPayslipDetail(employeeId, year, month) {
  return new Promise((resolve, reject) => {
    const options = { hostname: '127.0.0.1', port: 3000, path: `/api/payroll/v2/payslips/${employeeId}/${year}/${month}`, method: 'GET' };
    const req = http.request(options, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', e => reject(e));
    req.end();
  });
}

(async () => {
  try {
    console.log('Running payroll for 2026-02...');
    const run = await postRun(2026, 2);
    console.log('Run response:', run.status, run.body);

    console.log('Listing payslips for employee 1...');
    const list = await getPayslips(1);
    console.log('Payslips list response:', list.status, list.body);

    console.log('Getting payslip detail for employee 1, 2026-02...');
    const detail = await getPayslipDetail(1, 2026, 2);
    console.log('Payslip detail response:', detail.status, detail.body);
  } catch (e) {
    console.error('Error during tests:', e.message || e);
  }
})();
