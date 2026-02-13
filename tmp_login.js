const http = require('http');
const data = JSON.stringify({ username: 'admin', password: 'admin123' });
const options = {
  hostname: 'localhost', port: 3000, path: '/api/auth/login', method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
};
const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (c) => body += c);
  res.on('end', () => {
    console.log('STATUS', res.statusCode);
    try { console.log(body); } catch(e) { console.log(body); }
  });
});
req.on('error', (e) => console.error('ERROR', e.message));
req.write(data); req.end();
