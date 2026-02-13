const http = require('http');
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzcwOTg5MDkwLCJleHAiOjE3NzA5OTI2OTB9.7ye9r3lLrwQTMt7zZGlu21RHPoXKhe9TR3TEJ6Vll5k';
const data = JSON.stringify({ year: 2026, month: 2 });
const options = {
  hostname: 'localhost', port: 3000, path: '/api/payroll/v2/run', method: 'POST',
  headers: {
    'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data),
    'Authorization': 'Bearer ' + token
  }
};
const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (c) => body += c);
  res.on('end', () => {
    console.log('STATUS', res.statusCode);
    console.log(body);
  });
});
req.on('error', (e) => console.error('ERROR', e.message));
req.write(data); req.end();
