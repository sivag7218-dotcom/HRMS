const spec = require('./swagger/swagger.spec');
const paths = Object.keys(spec.paths || {}).filter(p => p.includes('/payroll') || p.includes('/payslips'));
console.log('FOUND_PATHS_COUNT', paths.length);
paths.forEach(p => console.log(p));
console.log('HAS_COMPONENTS', !!spec.components);
if (spec.components) console.log('COMPONENT_KEYS', Object.keys(spec.components));
