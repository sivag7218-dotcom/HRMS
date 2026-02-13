const jwt = require('jsonwebtoken');
const token = jwt.sign({ id: 1, role: 'admin' }, 'abc123xyz456', { expiresIn: '1h' });
console.log(token);
