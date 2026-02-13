const payrollService = require('../services/payroll.service');

async function runPayroll(req, res) {
  try {
    const { year, month } = req.body;
    if (!year || !month) return res.status(400).json({ error: 'year and month required' });
    const runBy = req.body.run_by || (req.user && req.user.id) || null;
    const result = await payrollService.runPayroll(Number(year), Number(month), runBy);
    res.json({ success: true, result });
  } catch (err) {
    console.error('Payroll run error:', err.message);
    res.status(500).json({ error: err.message });
  }
}

async function listPayslips(req, res) {
  try {
    const employeeId = req.params.employeeId || req.query.employeeId;
    if (!employeeId) return res.status(400).json({ error: 'employeeId required' });
    const rows = await payrollService.getPayslipsForEmployee(Number(employeeId));
    res.json({ success: true, payslips: rows });
  } catch (err) {
    console.error('List payslips error:', err.message);
    res.status(500).json({ error: err.message });
  }
}

async function payslipDetail(req, res) {
  try {
    const employeeId = Number(req.params.employeeId);
    const year = Number(req.params.year);
    const month = Number(req.params.month);
    if (!employeeId || !year || !month) return res.status(400).json({ error: 'employeeId, year, month required' });
    const detail = await payrollService.getPayslipDetail(employeeId, year, month);
    if (!detail) return res.status(404).json({ error: 'Payslip not found' });
    res.json({ success: true, payslip: JSON.parse(detail) });
  } catch (err) {
    console.error('Payslip detail error:', err.message);
    res.status(500).json({ error: err.message });
  }
}

async function getSalaryStructure(req, res) {
  try {
    const employeeId = Number(req.params.employeeId);
    if (!employeeId) return res.status(400).json({ error: 'employeeId required' });
    const data = await payrollService.getSalaryStructureForEmployee(employeeId);
    if (!data) return res.status(404).json({ error: 'Salary structure not found' });
    res.json({ success: true, data });
  } catch (err) {
    console.error('Get salary structure error:', err.message);
    res.status(500).json({ error: err.message });
  }
}

async function getAttendanceImpact(req, res) {
  try {
    const { year, month } = req.query;
    const employeeId = Number(req.query.employeeId || req.params.employeeId);
    if (!year || !month || !employeeId) return res.status(400).json({ error: 'year, month, employeeId required' });
    const data = await payrollService.getPayrollAttendanceImpact(Number(year), Number(month), employeeId);
    res.json({ success: true, data });
  } catch (err) {
    console.error('Get attendance impact error:', err.message);
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  runPayroll,
  listPayslips,
  payslipDetail,
  getSalaryStructure,
  getAttendanceImpact
};
