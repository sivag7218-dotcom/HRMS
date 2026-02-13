const spec = require('./swagger/swagger.spec');
const existing = Object.keys(spec.paths||{});

const endpoints = [
  '/payroll/salary-templates',
  '/payroll/salary-templates/{templateId}',
  '/payroll/salary-templates/{templateId}/components',
  '/payroll/salary-template-components/{componentId}',
  '/payroll/components',
  '/payroll/employees/{employeeId}/salary-structure',
  '/payroll/employees/{employeeId}/salary-structure/{structureId}',
  '/payroll/employees/{employeeId}/salary-components',
  '/payroll/employees/{employeeId}/tax-profile',
  '/payroll/employees/{employeeId}/bank-account',
  '/payroll/cycles',
  '/payroll/cycles/{cycleId}',
  '/payroll/cycles/{cycleId}/attendance-snapshot',
  '/payroll/runs',
  '/payroll/runs/{runId}',
  '/payroll/runs/{runId}/lock',
  '/payroll/runs/preview',
  '/payroll/runs/{runId}/employees',
  '/payroll/runs/{runId}/employees/{employeeId}',
  '/payroll/employees/{employeeId}/payslips',
  '/payroll/employees/{employeeId}/payslips/{year}/{month}',
  '/payroll/employees/{employeeId}/payslips/{year}/{month}/download',
  '/payroll/employees/{employeeId}/salary-summary',
  '/payroll/tax-declarations',
  '/payroll/tax-declarations/{employeeId}',
  '/payroll/tax-declarations/{declarationId}',
  '/payroll/employees/{employeeId}/tax-summary',
  '/payroll/reports/pf',
  '/payroll/reports/esi',
  '/payroll/reports/pt',
  '/payroll/reports/tds',
  '/payroll/payouts/initiate',
  '/payroll/payouts/{runId}',
  '/payroll/payouts/{runId}/bank-advice',
  '/payroll/payouts/{payoutId}/status',
  '/payroll/adjustments',
  '/payroll/adjustments/{employeeId}',
  '/payroll/adjustments/{adjustmentId}',
  '/payroll/audit-logs',
  '/payroll/runs/{runId}/reverse',
  '/payroll/health-check',
  '/payroll/validation/{cycleId}',
  '/payroll/components',
  '/payroll/statutory-slabs',
  '/payroll/config'
];

function toRegex(path){
  // accept optional /api prefix
  let p = path.replace(/\{[^}]+\}/g, '[^/]+');
  p = p.replace(/\//g, '\\/');
  const r = new RegExp('^(?:/api)?' + p + '$');
  return r;
}

const results = [];
for(const ep of endpoints){
  const re = toRegex(ep);
  const matches = existing.filter(p => re.test(p));
  results.push({ endpoint: ep, found: matches.length>0, matches });
}

console.log('CHECKED', endpoints.length, 'endpoints');
let found=0;
results.forEach(r=>{
  if(r.found){ found++; console.log('[FOUND]', r.endpoint, '->', r.matches.join(', ')); }
  else console.log('[MISSING]', r.endpoint);
});
console.log('\nSUMMARY: ', found, '/', endpoints.length, 'found');
