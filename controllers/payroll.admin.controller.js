const { db } = require('../config/database');

async function previewRun(req, res) {
  // Returns a preview calculation without committing
  try {
    // In future: run calculation logic with transaction rollback
    res.json({ success: true, preview: { message: 'Preview calculation not implemented - stub' } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function lockRun(req, res) {
  try {
    const runId = Number(req.params.runId);
    if (!runId) return res.status(400).json({ error: 'runId required' });
    const c = await db();
    await c.query('UPDATE payroll_runs SET status = ? WHERE id = ?', ['LOCKED', runId]);
    c.end();
    res.json({ success: true, runId, status: 'LOCKED' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function lockCycle(req, res) {
  try {
    const cycleId = Number(req.params.cycleId);
    if (!cycleId) return res.status(400).json({ error: 'cycleId required' });
    const c = await db();
    await c.query('UPDATE payroll_cycles SET status = ? WHERE id = ?', ['LOCKED', cycleId]);
    c.end();
    res.json({ success: true, cycleId, status: 'LOCKED' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getTaxProfile(req, res) {
  try {
    const employeeId = Number(req.params.employeeId);
    const c = await db();
    const [rows] = await c.query('SELECT * FROM employee_tax_profiles WHERE employee_id = ?', [employeeId]);
    c.end();
    res.json(rows[0] || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function putTaxProfile(req, res) {
  try {
    const employeeId = Number(req.params.employeeId);
    const payload = req.body || {};
    const c = await db();
    const [existing] = await c.query('SELECT id FROM employee_tax_profiles WHERE employee_id = ? LIMIT 1', [employeeId]);
    if (existing.length) {
      await c.query('UPDATE employee_tax_profiles SET ? WHERE employee_id = ?', [payload, employeeId]);
    } else {
      await c.query('INSERT INTO employee_tax_profiles SET ?', Object.assign({ employee_id: employeeId }, payload));
    }
    c.end();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getBankAccount(req, res) {
  try {
    const employeeId = Number(req.params.employeeId);
    const c = await db();
    const [rows] = await c.query('SELECT * FROM employee_bank_accounts WHERE employee_id = ?', [employeeId]);
    c.end();
    res.json(rows[0] || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function putBankAccount(req, res) {
  try {
    const employeeId = Number(req.params.employeeId);
    const payload = req.body || {};
    const c = await db();
    const [existing] = await c.query('SELECT id FROM employee_bank_accounts WHERE employee_id = ? LIMIT 1', [employeeId]);
    if (existing.length) {
      await c.query('UPDATE employee_bank_accounts SET ? WHERE employee_id = ?', [payload, employeeId]);
    } else {
      await c.query('INSERT INTO employee_bank_accounts SET ?', Object.assign({ employee_id: employeeId }, payload));
    }
    c.end();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Payout stubs
async function initiatePayout(req, res) {
  try {
    // Minimal: accept runId and return created payout id (stub)
    const { runId } = req.body;
    const c = await db();
    const [ins] = await c.query('INSERT INTO payroll_payouts (run_id, status, created_at) VALUES (?, ?, NOW())', [runId || null, 'INITIATED']);
    c.end();
    res.json({ success: true, payoutId: ins.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getPayout(req, res) {
  try {
    const runId = Number(req.params.runId);
    const c = await db();
    const [rows] = await c.query('SELECT * FROM payroll_payouts WHERE run_id = ?', [runId]);
    c.end();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function updatePayoutStatus(req, res) {
  try {
    const payoutId = Number(req.params.payoutId);
    const { status } = req.body;
    const c = await db();
    await c.query('UPDATE payroll_payouts SET status = ? WHERE id = ?', [status, payoutId]);
    c.end();
    res.json({ success: true, payoutId, status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  previewRun,
  lockRun,
  lockCycle,
  getTaxProfile,
  putTaxProfile,
  getBankAccount,
  putBankAccount,
  initiatePayout,
  getPayout,
  updatePayoutStatus
};
