const http = require('http');
http.get('http://127.0.0.1:3000/api/health', (res)=>{
  let b=''; res.on('data',c=>b+=c); res.on('end', ()=>{ console.log(res.statusCode); console.log(b); });
}).on('error', e=>console.error('ERR', e.message));
