const http = require('http');
const data = JSON.stringify({ username: 'admin', password: 'admin123' });
const opts = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

const req = http.request(opts, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log(body);
  });
});
req.on('error', (e) => { console.error('ERROR', e.message); process.exit(1); });
req.write(data);
req.end();
