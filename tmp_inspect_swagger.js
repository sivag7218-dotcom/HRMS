const s = require('./swagger/swagger.spec');
const paths = Object.keys(s.paths||{}).filter(p => p.includes('/payroll') || p.includes('/payslips') || p.includes('/payslip'));
console.log('PAYROLL_PATHS_COUNT', paths.length);
paths.forEach(p => {
  const ops = s.paths[p];
  Object.keys(ops).forEach(m => {
    console.log(p, m.toUpperCase(), 'TAGS =>', ops[m].tags || []);
  });
});
