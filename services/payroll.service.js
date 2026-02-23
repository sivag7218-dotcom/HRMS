const { db } = require('../config/database');

// Simplified payroll engine - Phase-1
// Assumptions (documented in code):
// - Attendance table exists with columns: employee_id, attendance_date, status ('present','absent','leave'), working_hours, work_mode
// - Salary structures and components are managed via employee_salary_structures and employee_salary_components
// - Basic statutory rules (PF, TDS) are simplified placeholders and should be replaced with real rules later

async function runPayroll(year, month, runBy = null) {
  const conn = await db.getConnection();
  await conn.beginTransaction();
  try {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // last day
    const sd = startDate.toISOString().slice(0, 10);
    const ed = endDate.toISOString().slice(0, 10);

    // Create or get payroll cycle
    const [existing] = await conn.query(
      'SELECT * FROM payroll_cycles WHERE year = ? AND month = ? LIMIT 1',
      [year, month]
    );
    let cycleId;
    if (existing.length === 0) {
      const [ins] = await conn.query(
        'INSERT INTO payroll_cycles (year, month, start_date, end_date, status) VALUES (?, ?, ?, ?, ?)',
        [year, month, sd, ed, 'OPEN']
      );
      cycleId = ins.insertId;
    } else {
      cycleId = existing[0].id;
      if (existing[0].status === 'LOCKED' || existing[0].status === 'PROCESSED') {
        throw new Error('Payroll cycle is locked or already processed');
      }
    }

    // Create payroll run (processing)
    const [runRes] = await conn.query(
      'INSERT INTO payroll_runs (cycle_id, run_by, status, started_at) VALUES (?, ?, ?, NOW())',
      [cycleId, runBy, 'PROCESSING']
    );
    const runId = runRes.insertId;

    // Snapshot attendance per employee (simple aggregation)
    const [att] = await conn.query(
      `SELECT employee_id,
              COUNT(*) as working_days,
              SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_days,
              SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent_days,
              SUM(CASE WHEN status = 'leave' THEN 1 ELSE 0 END) as leave_days
         FROM attendance
         WHERE attendance_date BETWEEN ? AND ?
         GROUP BY employee_id`,
      [sd, ed]
    );

    // Insert snapshots (upsert behavior)
    for (const row of att) {
      const paid_days = Number(row.present_days) + Number(row.leave_days);
      await conn.query(
        `INSERT INTO payroll_attendance_snapshots (cycle_id, employee_id, working_days, paid_days, lop_days, total_present, total_absent, total_leave, snapshot_ts)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE working_days=VALUES(working_days), paid_days=VALUES(paid_days), lop_days=VALUES(lop_days), total_present=VALUES(total_present), total_absent=VALUES(total_absent), total_leave=VALUES(total_leave), snapshot_ts=NOW()`,
        [cycleId, row.employee_id, row.working_days, paid_days, Math.max(0, row.working_days - paid_days), row.present_days, row.absent_days, row.leave_days]
      );
    }

    // Fetch snapshots to process employees
    const [snapshots] = await conn.query(
      'SELECT * FROM payroll_attendance_snapshots WHERE cycle_id = ?',
      [cycleId]
    );

    let totalEmployees = 0;
    let totalGross = 0.0;
    let totalDeductions = 0.0;
    let totalNet = 0.0;

    for (const s of snapshots) {
      const employeeId = s.employee_id;

      // Find active salary structure for the period
      const [structRows] = await conn.query(
        `SELECT * FROM salary_structures WHERE employee_id = ? AND effective_from <= ? AND (effective_to IS NULL OR effective_to >= ?) ORDER BY version DESC LIMIT 1`,
        [employeeId, sd, ed]
      );
      if (structRows.length === 0) {
        // No structure - skip payroll for this employee (auditable by logging)
        continue;
      }
      const structure = structRows[0];

      // Load components
      const [components] = await conn.query(
        'SELECT * FROM salary_components WHERE structure_id = ? ORDER BY sequence ASC',
        [structure.id]
      );

      // Helper to find component amount by code (already computed)
      const computed = {};

      // First pass: compute FIXED components and PERCENTAGE-of-CTC placeholders
      let gross = 0.0;
      for (const comp of components) {
        let amount = 0.0;
        if (comp.calculation_type === 'FIXED') {
          amount = Number(comp.value);
        } else {
          // PERCENTAGE: if percentage_of_code available and already computed, use that, else percentage of CTC
          const pct = Number(comp.value);
          if (comp.percentage_of_code) {
            const baseAmt = Number(computed[comp.percentage_of_code] || 0);
            amount = (baseAmt * pct) / 100.0;
          } else {
            amount = (Number(structure.ctc_amount || 0) * pct) / 100.0;
          }
        }

        // Prorate if flagged
        if (comp.prorated) {
          const working = Number(s.working_days || 0);
          const paid = Number(s.paid_days || 0);
          if (working > 0) amount = (amount * paid) / working;
        }

        computed[comp.code] = amount;
        if (comp.component_type === 'EARNING') gross += amount;
      }

      // Basic statutory deductions - simplified example
      // PF: 12% of BASIC if BASIC exists
      let pfAmount = 0.0;
      if (computed['BASIC']) {
        pfAmount = Number(computed['BASIC']) * 0.12;
      }

      // Sum earnings and deductions
      let deductions = 0.0;
      // Include component-level deductions
      for (const comp of components) {
        if (comp.component_type === 'DEDUCTION') {
          deductions += Number(computed[comp.code] || 0);
        }
      }

      deductions += pfAmount;

      // Tax (TDS) - simplified: 10% of taxable earnings (earnings with taxable=1)
      let taxableEarnings = 0.0;
      for (const comp of components) {
        if (comp.component_type === 'EARNING' && comp.taxable) {
          taxableEarnings += Number(computed[comp.code] || 0);
        }
      }
      const tds = taxableEarnings * 0.10; // placeholder
      deductions += tds;

      const net = gross - deductions;

      // Insert payroll_employee_salaries
      const [salaryRes] = await conn.query(
        `INSERT INTO payroll_employee_salaries (run_id, cycle_id, employee_id, structure_id, gross_earnings, total_deductions, net_pay, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [runId, cycleId, employeeId, structure.id, gross.toFixed(2), deductions.toFixed(2), net.toFixed(2)]
      );
      const employeeSalaryId = salaryRes.insertId;

      // Insert component breakups
      for (const comp of components) {
        const amt = Number(computed[comp.code] || 0).toFixed(2);
        await conn.query(
          `INSERT INTO payroll_salary_breakups (employee_salary_id, component_code, component_name, component_type, amount, taxable, prorated, metadata)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [employeeSalaryId, comp.code, comp.name, comp.component_type, amt, comp.taxable, comp.prorated, null]
        );
      }

      // Insert PF and TDS as payroll_tax_deductions lines
      if (pfAmount > 0) {
        await conn.query(
          `INSERT INTO payroll_tax_deductions (employee_salary_id, deduction_code, deduction_name, amount, metadata)
           VALUES (?, ?, ?, ?, ?)`,
          [employeeSalaryId, 'PF_EMP', 'Employee PF', pfAmount.toFixed(2), null]
        );
      }
      if (tds > 0) {
        await conn.query(
          `INSERT INTO payroll_tax_deductions (employee_salary_id, deduction_code, deduction_name, amount, metadata)
           VALUES (?, ?, ?, ?, ?)`,
          [employeeSalaryId, 'TDS', 'TDS', tds.toFixed(2), null]
        );
      }

      // Create payslip JSON snapshot
      const [breakups] = await conn.query(
        `SELECT component_code, component_name, component_type, amount FROM payroll_salary_breakups WHERE employee_salary_id = ?`,
        [employeeSalaryId]
      );
      const [taxLines] = await conn.query(
        `SELECT deduction_code, deduction_name, amount FROM payroll_tax_deductions WHERE employee_salary_id = ?`,
        [employeeSalaryId]
      );

      const payslip = {
        employee_id: employeeId,
        cycle: { year, month, start: sd, end: ed },
        structure: { id: structure.id, name: structure.structure_name, ctc: Number(structure.ctc_amount) },
        attendance_snapshot: s,
        earnings: breakups.filter(b => b.component_type === 'EARNING'),
        component_deductions: breakups.filter(b => b.component_type === 'DEDUCTION'),
        statutory_deductions: taxLines,
        totals: { gross: Number(gross.toFixed(2)), deductions: Number(deductions.toFixed(2)), net: Number(net.toFixed(2)) }
      };

      await conn.query(
        `INSERT INTO payroll_payslips (employee_salary_id, payslip_json, generated_at) VALUES (?, ?, NOW())`,
        [employeeSalaryId, JSON.stringify(payslip)]
      );

      totalEmployees += 1;
      totalGross += Number(gross);
      totalDeductions += Number(deductions);
      totalNet += Number(net);
    }

    // Update run totals and mark completed
    await conn.query(
      `UPDATE payroll_runs SET status = ?, total_employees = ?, total_gross = ?, total_deductions = ?, total_net = ?, completed_at = NOW() WHERE id = ?`,
      ['COMPLETED', totalEmployees, totalGross.toFixed(2), totalDeductions.toFixed(2), totalNet.toFixed(2), runId]
    );

    await conn.commit();
    await conn.end();

    return { runId, cycleId, totalEmployees, totalGross, totalDeductions, totalNet };
  } catch (err) {
    try {
      await conn.rollback();
      await conn.end();
    } catch (e) {}
    throw err;
  }
}

async function getPayslipsForEmployee(employeeId, limit = 20) {
  const c = await db();
  const [rows] = await c.query(
    `SELECT p.id as payslip_id, p.employee_salary_id, p.generated_at, r.cycle_id, r.started_at, r.completed_at
     FROM payroll_payslips p
     JOIN payroll_employee_salaries s ON s.id = p.employee_salary_id
     JOIN payroll_runs r ON r.id = s.run_id
     WHERE s.employee_id = ?
     ORDER BY p.generated_at DESC
     LIMIT ?`,
    [employeeId, limit]
  );
  c.end();
  return rows;
}

async function getPayslipDetail(employeeId, year, month) {
  const c = await db();
  const [rows] = await c.query(
    `SELECT p.payslip_json
     FROM payroll_payslips p
     JOIN payroll_employee_salaries s ON s.id = p.employee_salary_id
     JOIN payroll_runs r ON r.id = s.run_id
     JOIN payroll_cycles c ON c.id = r.cycle_id
     WHERE s.employee_id = ? AND c.year = ? AND c.month = ?
     ORDER BY p.generated_at DESC
     LIMIT 1`,
    [employeeId, year, month]
  );
  c.end();
  if (rows.length === 0) return null;
  return rows[0].payslip_json;
}

async function getSalaryStructureForEmployee(employeeId) {
  const c = await db();
  const [rows] = await c.query(
    `SELECT * FROM salary_structures WHERE employee_id = ? ORDER BY effective_from DESC, version DESC LIMIT 1`,
    [employeeId]
  );
  if (rows.length === 0) {
    c.end();
    return null;
  }
  const structure = rows[0];
  const [components] = await c.query('SELECT * FROM salary_components WHERE structure_id = ? ORDER BY sequence ASC', [structure.id]);
  c.end();
  return { structure, components };
}

async function getPayrollAttendanceImpact(year, month, employeeId) {
  const startDate = new Date(year, month - 1, 1).toISOString().slice(0, 10);
  const endDate = new Date(year, month, 0).toISOString().slice(0, 10);
  const c = await db();
  const [rows] = await c.query(
    `SELECT employee_id, COUNT(*) as working_days,
            SUM(CASE WHEN status='present' THEN 1 ELSE 0 END) as present_days,
            SUM(CASE WHEN status='absent' THEN 1 ELSE 0 END) as absent_days,
            SUM(CASE WHEN status='leave' THEN 1 ELSE 0 END) as leave_days
     FROM attendance
     WHERE attendance_date BETWEEN ? AND ? AND employee_id = ?
     GROUP BY employee_id`,
    [startDate, endDate, employeeId]
  );
  c.end();
  return rows[0] || { employee_id: employeeId, working_days: 0, present_days: 0, absent_days: 0, leave_days: 0 };
}

module.exports = {
  runPayroll,
  getPayslipsForEmployee,
  getPayslipDetail,
  getSalaryStructureForEmployee,
  getPayrollAttendanceImpact
};
