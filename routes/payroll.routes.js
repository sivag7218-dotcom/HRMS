/**
 * PAYROLL ROUTES
 * Handles payroll generation, salary slips, runs, and recalculation
 */

const express = require("express");
const router = express.Router();
const { db } = require("../config/database");
const { auth, admin, hr } = require("../middleware/auth");
const { findEmployeeByUserId } = require("../utils/helpers");
const payrollCtrl = require('../controllers/payroll.controller');
const payrollService = require('../services/payroll.service');
const payrollAdmin = require('../controllers/payroll.admin.controller');

/* ============ PAYROLL SETTINGS ============ */

// Create payroll defaults
router.post("/defaults", auth, admin, async (req, res) => {
    const { pf_percent, esi_percent, professional_tax, variable_pay_percent } = req.body;
    const c = await db();
    const [result] = await c.query("INSERT INTO payroll_defaults SET ?", {
        pf_percent, esi_percent, professional_tax, variable_pay_percent
    });
    c.end();
    res.json({ id: result.insertId, success: true });
});

// Get payroll defaults
router.get("/defaults", auth, hr, async (req, res) => {
    const c = await db();
    const [r] = await c.query("SELECT * FROM payroll_defaults LIMIT 1");
    c.end();
    res.json(r[0] || {});
});

/* ============ NEW MODERN API ENDPOINTS (Phase-1) ============ */

// Modern v2 API endpoints to avoid clashing with legacy routes
// POST /api/payroll/v2/run  { year: 2026, month: 2 }
router.post('/v2/run', auth, admin, payrollCtrl.runPayroll);

// GET /api/payroll/v2/payslips/:employeeId
router.get('/v2/payslips/:employeeId', auth, payrollCtrl.listPayslips);

// GET /api/payroll/v2/payslips/:employeeId/:year/:month
router.get('/v2/payslips/:employeeId/:year/:month', auth, payrollCtrl.payslipDetail);

// GET /api/payroll/v2/structure/:employeeId
router.get('/v2/structure/:employeeId', auth, payrollCtrl.getSalaryStructure);

// GET /api/payroll/v2/attendance-impact/:employeeId?year=2026&month=2
router.get('/v2/attendance-impact/:employeeId', auth, payrollCtrl.getAttendanceImpact);

// GET /api/payroll/v2/run?month=YYYY-MM  -> summary for a month (admin/hr)
router.get('/v2/run', auth, hr, async (req, res) => {
    const { month } = req.query; // expect YYYY-MM
    if (!month) return res.status(400).json({ error: 'month query required (YYYY-MM)' });
    const parts = month.split('-');
    if (parts.length !== 2) return res.status(400).json({ error: 'month format must be YYYY-MM' });
    const year = Number(parts[0]);
    const mon = Number(parts[1]);
    const c = await db();
    try {
        const [rows] = await c.query(
            `SELECT r.id as run_id, r.status, r.started_at, r.completed_at, COUNT(s.id) as employee_count, SUM(s.gross_earnings) as total_gross, SUM(s.net_pay) as total_net
             FROM payroll_runs r
             JOIN payroll_cycles cy ON cy.id = r.cycle_id
             LEFT JOIN payroll_employee_salaries s ON s.run_id = r.id
             WHERE cy.year = ? AND cy.month = ?
             GROUP BY r.id`,
            [year, mon]
        );
        c.end();
        res.json(rows);
    } catch (err) {
        c.end();
        res.status(500).json({ error: err.message });
    }
});

// GET /api/payroll/v2/run/:employeeId?month=YYYY-MM -> employee-level payroll breakup
router.get('/v2/run/:employeeId', auth, hr, async (req, res) => {
    const { month } = req.query;
    const employeeId = Number(req.params.employeeId);
    if (!month) return res.status(400).json({ error: 'month query required (YYYY-MM)' });
    const parts = month.split('-');
    const year = Number(parts[0]);
    const mon = Number(parts[1]);
    const c = await db();
    try {
        const [rows] = await c.query(
            `SELECT s.* FROM payroll_employee_salaries s JOIN payroll_runs r ON r.id = s.run_id JOIN payroll_cycles cy ON cy.id = r.cycle_id WHERE s.employee_id = ? AND cy.year = ? AND cy.month = ? LIMIT 1`,
            [employeeId, year, mon]
        );
        c.end();
        res.json(rows[0] || null);
    } catch (err) {
        c.end();
        res.status(500).json({ error: err.message });
    }
});

// GET /api/payroll/v2/earnings/:employeeId?month=YYYY-MM
router.get('/v2/earnings/:employeeId', auth, async (req, res) => {
    const { month } = req.query;
    const employeeId = Number(req.params.employeeId);
    if (!month) return res.status(400).json({ error: 'month query required (YYYY-MM)' });
    const parts = month.split('-');
    const year = Number(parts[0]);
    const mon = Number(parts[1]);
    const c = await db();
    try {
        const [rows] = await c.query(
            `SELECT b.component_code, b.component_name, b.amount FROM payroll_salary_breakups b
             JOIN payroll_employee_salaries s ON s.id = b.employee_salary_id
             JOIN payroll_runs r ON r.id = s.run_id
             JOIN payroll_cycles cy ON cy.id = r.cycle_id
             WHERE s.employee_id = ? AND cy.year = ? AND cy.month = ? AND b.component_type = 'EARNING'`,
            [employeeId, year, mon]
        );
        c.end();
        res.json(rows);
    } catch (err) {
        c.end();
        res.status(500).json({ error: err.message });
    }
});

// GET /api/payroll/v2/deductions/:employeeId?month=YYYY-MM
router.get('/v2/deductions/:employeeId', auth, async (req, res) => {
    const { month } = req.query;
    const employeeId = Number(req.params.employeeId);
    if (!month) return res.status(400).json({ error: 'month query required (YYYY-MM)' });
    const parts = month.split('-');
    const year = Number(parts[0]);
    const mon = Number(parts[1]);
    const c = await db();
    try {
        const [rows] = await c.query(
            `SELECT b.component_code, b.component_name, b.amount FROM payroll_salary_breakups b
             JOIN payroll_employee_salaries s ON s.id = b.employee_salary_id
             JOIN payroll_runs r ON r.id = s.run_id
             JOIN payroll_cycles cy ON cy.id = r.cycle_id
             WHERE s.employee_id = ? AND cy.year = ? AND cy.month = ? AND b.component_type = 'DEDUCTION'`,
            [employeeId, year, mon]
        );
        c.end();
        res.json(rows);
    } catch (err) {
        c.end();
        res.status(500).json({ error: err.message });
    }
});

// GET /api/payroll/v2/tax-summary/:employeeId?year=YYYY
router.get('/v2/tax-summary/:employeeId', auth, async (req, res) => {
    const year = Number(req.query.year);
    const employeeId = Number(req.params.employeeId);
    if (!year) return res.status(400).json({ error: 'year query required' });
    const c = await db();
    try {
        const [rows] = await c.query(
            `SELECT cy.year, td.deduction_code, SUM(td.amount) as total FROM payroll_tax_deductions td
             JOIN payroll_employee_salaries s ON s.id = td.employee_salary_id
             JOIN payroll_runs r ON r.id = s.run_id
             JOIN payroll_cycles cy ON cy.id = r.cycle_id
             WHERE s.employee_id = ? AND cy.year = ? GROUP BY td.deduction_code`,
            [employeeId, year]
        );
        c.end();
        res.json(rows);
    } catch (err) {
        c.end();
        res.status(500).json({ error: err.message });
    }
});

// GET /api/payroll/v2/form16/:employeeId?year=YYYY  (placeholder metadata)
router.get('/v2/form16/:employeeId', auth, async (req, res) => {
    const year = Number(req.query.year);
    const employeeId = Number(req.params.employeeId);
    if (!year) return res.status(400).json({ error: 'year query required' });
    // For now return basic metadata; actual PDF generation not implemented
    res.json({ employee_id: employeeId, year, form16_available: false, note: 'PDF generation not implemented' });
});

// GET /api/payroll/v2/form16/:employeeId/:year/download (placeholder)
router.get('/v2/form16/:employeeId/:year/download', auth, async (req, res) => {
    res.status(501).json({ error: 'Form16 PDF download not implemented' });
});

// GET /api/payroll/v2/payslips/:employeeId/:month (month=YYYY-MM)
router.get('/v2/payslips/:employeeId/:month', auth, async (req, res) => {
    const employeeId = Number(req.params.employeeId);
    const month = req.params.month; // YYYY-MM
    if (!month) return res.status(400).json({ error: 'month required (YYYY-MM)' });
    const parts = month.split('-');
    const year = Number(parts[0]);
    const mon = Number(parts[1]);
    try {
        const detail = await payrollService.getPayslipDetail(employeeId, year, mon);
        if (!detail) return res.status(404).json({ error: 'Payslip not found' });
        res.json({ success: true, payslip: JSON.parse(detail) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// -------- Admin/HR stubs (scaffolded) --------
// POST /api/payroll/v2/runs/preview
router.post('/v2/runs/preview', auth, hr, payrollAdmin.previewRun);

// POST /api/payroll/v2/runs/:runId/lock
router.post('/v2/runs/:runId/lock', auth, hr, payrollAdmin.lockRun);

// PUT /api/payroll/v2/cycles/:cycleId/lock
router.put('/v2/cycles/:cycleId/lock', auth, hr, payrollAdmin.lockCycle);

// Tax profile (employee-level)
router.get('/v2/employees/:employeeId/tax-profile', auth, hr, payrollAdmin.getTaxProfile);
router.put('/v2/employees/:employeeId/tax-profile', auth, hr, payrollAdmin.putTaxProfile);

// Bank account (employee-level)
router.get('/v2/employees/:employeeId/bank-account', auth, hr, payrollAdmin.getBankAccount);
router.put('/v2/employees/:employeeId/bank-account', auth, hr, payrollAdmin.putBankAccount);

// Payouts
router.post('/v2/payouts/initiate', auth, hr, payrollAdmin.initiatePayout);
router.get('/v2/payouts/:runId', auth, hr, payrollAdmin.getPayout);
router.put('/v2/payouts/:payoutId/status', auth, hr, payrollAdmin.updatePayoutStatus);


// Update payroll defaults
router.put("/defaults/:id", auth, admin, async (req, res) => {
    const c = await db();
    await c.query("UPDATE payroll_defaults SET ? WHERE id = ?", [req.body, req.params.id]);
    c.end();
    res.json({ success: true });
});

/* ============ SALARY STRUCTURE ============ */

// Create/Update salary structure
router.post("/salary/structure/:empId", auth, hr, async (req, res) => {
    const { empId } = req.params;
    const components = [
        { name: "basic", value: req.body.basic },
        { name: "hra", value: req.body.hra },
        { name: "conveyance", value: req.body.conveyance },
        { name: "special_allowance", value: req.body.special_allowance },
        { name: "pf", value: req.body.pf },
        { name: "esi", value: req.body.esi },
        { name: "professional_tax", value: req.body.professional_tax },
        { name: "other_deductions", value: req.body.other_deductions }
    ];

    const c = await db();
    // Remove existing structure for this employee
    await c.query("DELETE FROM salary_structures WHERE employee_id = ?", [empId]);

    // Insert each component as a row
    for (const comp of components) {
        if (comp.value !== undefined && comp.value !== null) {
            await c.query(
                "INSERT INTO salary_structures (employee_id, component_name, component_value) VALUES (?, ?, ?)",
                [empId, comp.name, parseFloat(comp.value) || 0]
            );
        }
    }
    c.end();
    res.json({ success: true });
});

// Get salary structure
router.get("/salary/structure/:empId", auth, async (req, res) => {
    const c = await db();
    const [rows] = await c.query("SELECT * FROM salary_structures WHERE employee_id = ?", [req.params.empId]);
    c.end();
    res.json({ success: true, salaryStructure: rows });
});

/* ============ PAYROLL GENERATION ============ */

// Generate payroll for a month
router.post("/generate", auth, admin, async (req, res) => {
    const { month, year } = req.body;
    const c = await db();
    
    try {
        // Create payroll run
        const [runResult] = await c.query(
            "INSERT INTO payroll_runs (month, year, status, created_by) VALUES (?, ?, 'processing', ?)",
            [month, year, req.user.id]
        );
        const runId = runResult.insertId;
        
        // Get all active employees
        const [employees] = await c.query("SELECT id FROM employees WHERE status = 'active'");
        
        let processedCount = 0;
        
        for (const emp of employees) {
            // Get salary structure as rows
            const [structureRows] = await c.query("SELECT component_name, component_value FROM salary_structures WHERE employee_id = ?", [emp.id]);
            if (structureRows.length === 0) continue;
            // Map to object: { basic: value, hra: value, ... }
            const s = {};
            for (const row of structureRows) {
                s[row.component_name] = parseFloat(row.component_value) || 0;
            }
            // Calculate attendance
            const [attendance] = await c.query(
                "SELECT COUNT(*) as present_days FROM attendance WHERE employee_id = ? AND MONTH(attendance_date) = ? AND YEAR(attendance_date) = ? AND status = 'present'",
                [emp.id, month, year]
            );
            const presentDays = attendance[0]?.present_days || 0;
            const workingDays = 30; // You can make this dynamic
            // Pro-rata calculation
            const basicEarned = (s.basic / workingDays) * presentDays;
            const hraEarned = (s.hra / workingDays) * presentDays;
            const conveyanceEarned = (s.conveyance / workingDays) * presentDays;
            const specialAllowanceEarned = (s.special_allowance / workingDays) * presentDays;
            const grossEarned = basicEarned + hraEarned + conveyanceEarned + specialAllowanceEarned;
            const netEarned = grossEarned - (s.pf + s.esi + s.professional_tax + s.other_deductions);
            // Create payslip
            await c.query(
                `INSERT INTO payroll_slips (run_id, employee_id, month, year, 
                 basic, hra, conveyance, special_allowance, gross_salary, 
                 pf, esi, professional_tax, other_deductions, total_deductions, 
                 net_salary, days_worked, days_in_month, status) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'generated')`,
                [runId, emp.id, month, year, 
                 basicEarned, hraEarned, conveyanceEarned, specialAllowanceEarned, grossEarned,
                 s.pf, s.esi, s.professional_tax, s.other_deductions, 
                 (s.pf + s.esi + s.professional_tax + s.other_deductions),
                 netEarned, presentDays, workingDays]
            );
            
            processedCount++;
        }
        
        // Update run status
        await c.query(
            "UPDATE payroll_runs SET status = 'completed', completed_at = NOW() WHERE id = ?",
            [runId]
        );
        
        c.end();
        res.json({ success: true, run_id: runId, processed: processedCount });
        
    } catch (error) {
        c.end();
        res.status(500).json({ error: error.message });
    }
});

// List payroll runs
router.get("/runs", auth, hr, async (req, res) => {
    const c = await db();
    const [runs] = await c.query(
        `SELECT pr.*, COUNT(ps.id) as slip_count, SUM(ps.net_pay) as total_payout
         FROM payroll_runs pr
         LEFT JOIN payroll_slips ps ON pr.id = ps.payroll_run_id
         GROUP BY pr.id
         ORDER BY pr.created_at DESC`
    );
    c.end();
    res.json(runs);
});

// Get payroll by run (legacy endpoint)
router.get("/:run", auth, async (req, res) => {
    const c = await db();
    const [r] = await c.query(
        "SELECT ps.*, e.FirstName, e.LastName FROM payroll_slips ps LEFT JOIN employees e ON ps.employee_id = e.id WHERE ps.payroll_run_id = ?",
        [req.params.run]
    );
    c.end();
    res.json(r);
});

// Recalculate payroll for employee
router.post("/recalculate/:empId", auth, admin, async (req, res) => {
    const { empId } = req.params;
    const { month, year } = req.body;
    
    const c = await db();
    
    try {
        // Get salary structure
        const [structure] = await c.query("SELECT * FROM salary_structures WHERE employee_id = ?", [empId]);
        
        if (structure.length === 0) {
            c.end();
            return res.status(404).json({ error: "Salary structure not found" });
        }
        
        const s = structure[0];
        
        // Calculate attendance
        const [attendance] = await c.query(
            "SELECT COUNT(*) as present_days FROM attendance WHERE employee_id = ? AND MONTH(attendance_date) = ? AND YEAR(attendance_date) = ? AND status = 'present'",
            [empId, month, year]
        );
        
        const presentDays = attendance[0]?.present_days || 0;
        const workingDays = 30;
        
        const basicEarned = (s.basic / workingDays) * presentDays;
        const hraEarned = (s.hra / workingDays) * presentDays;
        const grossEarned = basicEarned + hraEarned + (s.conveyance || 0) + (s.special_allowance || 0);
        const netEarned = grossEarned - (s.pf + s.esi + s.professional_tax + s.other_deductions);
        
        // Update existing slip or create new one
        await c.query(
            `INSERT INTO payroll_slips (employee_id, month, year, basic, hra, gross_salary, pf, esi, professional_tax, net_salary, days_worked, days_in_month)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE basic=VALUES(basic), hra=VALUES(hra), gross_salary=VALUES(gross_salary), net_salary=VALUES(net_salary), days_worked=VALUES(days_worked)`,
            [empId, month, year, basicEarned, hraEarned, grossEarned, s.pf, s.esi, s.professional_tax, netEarned, presentDays, workingDays]
        );
        
        c.end();
        res.json({ success: true, net_salary: netEarned });
        
    } catch (error) {
        c.end();
        res.status(500).json({ error: error.message });
    }
});

/* ============ PAYSLIPS ============ */

// Get all payslips (HR)
router.get("/slips/all", auth, hr, async (req, res) => {
    const c = await db();
    const [r] = await c.query(
        "SELECT ps.*, e.FirstName, e.LastName FROM payroll_slips ps LEFT JOIN employees e ON ps.employee_id = e.id ORDER BY ps.created_at DESC"
    );
    c.end();
    res.json(r);
});

// Get employee payslips
router.get("/slips/employee/:employee_id", auth, async (req, res) => {
    const c = await db();
    const [r] = await c.query("SELECT * FROM payroll_slips WHERE employee_id = ? ORDER BY year DESC, month DESC", 
        [req.params.employee_id]);
    c.end();
    res.json(r);
});

// Get single payslip
router.get("/slips/:employee_id/:slip_id", auth, async (req, res) => {
    const c = await db();
    const [r] = await c.query("SELECT * FROM payroll_slips WHERE employee_id = ? AND id = ?", 
        [req.params.employee_id, req.params.slip_id]);
    c.end();
    res.json(r[0] || null);
});

// Get payslip by ID
router.get("/slip/:id", auth, async (req, res) => {
    const c = await db();
    const [r] = await c.query("SELECT * FROM payroll_slips WHERE id = ?", [req.params.id]);
    c.end();
    res.json(r[0] || null);
});

// Generate PDF (placeholder)
router.get("/slip/:id/pdf", auth, async (req, res) => {
    res.json({ message: "PDF generation not implemented yet" });
});


/* ============ MODERN PAYROLL COMPONENT-BASED MODEL ============ */

const hrOrAdmin = require("../middleware/auth").hr;

// ---- Salary Components CRUD ----
router.get("/components", auth, hrOrAdmin, async (req, res) => {
    const c = await db();
    const [rows] = await c.query("SELECT * FROM salary_components ORDER BY name ASC");
    c.end();
    res.json(rows);
});
router.post("/components", auth, hrOrAdmin, async (req, res) => {
    try {
        const c = await db();
        const { name, type, is_statutory, is_taxable, calculation_type } = req.body;
        
        if (!name || !type || !calculation_type) {
            c.end();
            return res.status(400).json({ success: false, error: "Missing required fields" });
        }
        
        const [result] = await c.query("INSERT INTO salary_components SET ?", { 
            name, 
            type, 
            is_statutory: is_statutory || 0, 
            is_taxable: is_taxable || 1, 
            calculation_type,
            created_by: req.user.id
        });
        c.end();
        res.json({ id: result.insertId, success: true, message: "Salary component created successfully" });
    } catch (error) {
        console.error("Error creating salary component:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});
router.put("/components/:id", auth, hrOrAdmin, async (req, res) => {
    try {
        const c = await db();
        await c.query("UPDATE salary_components SET ? WHERE component_id = ?", [req.body, req.params.id]);
        c.end();
        res.json({ success: true, message: "Salary component updated successfully" });
    } catch (error) {
        console.error("Error updating salary component:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});
router.delete("/components/:id", auth, hrOrAdmin, async (req, res) => {
    try {
        const c = await db();
        await c.query("DELETE FROM salary_components WHERE component_id = ?", [req.params.id]);
        c.end();
        res.json({ success: true, message: "Salary component deleted successfully" });
    } catch (error) {
        console.error("Error deleting salary component:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ---- Salary Structure Templates CRUD ----
router.get("/templates", auth, hrOrAdmin, async (req, res) => {
    const c = await db();
    const [rows] = await c.query("SELECT * FROM salary_structure_templates ORDER BY template_name ASC");
    c.end();
    res.json(rows);
});
router.post("/templates", auth, hrOrAdmin, async (req, res) => {
    try {
        const c = await db();
        const { template_name, description } = req.body;
        
        if (!template_name) {
            c.end();
            return res.status(400).json({ success: false, error: "Template name is required" });
        }
        
        const [result] = await c.query("INSERT INTO salary_structure_templates SET ?", { 
            template_name, 
            description, 
            created_by: req.user.id 
        });
        c.end();
        res.json({ id: result.insertId, success: true, message: "Salary template created successfully" });
    } catch (error) {
        console.error("Error creating salary template:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});
router.put("/templates/:id", auth, hrOrAdmin, async (req, res) => {
    try {
        const c = await db();
        await c.query("UPDATE salary_structure_templates SET ? WHERE template_id = ?", [req.body, req.params.id]);
        c.end();
        res.json({ success: true, message: "Salary template updated successfully" });
    } catch (error) {
        console.error("Error updating salary template:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});
router.delete("/templates/:id", auth, hrOrAdmin, async (req, res) => {
    try {
        const c = await db();
        await c.query("DELETE FROM salary_structure_templates WHERE template_id = ?", [req.params.id]);
        c.end();
        res.json({ success: true, message: "Salary template deleted successfully" });
    } catch (error) {
        console.error("Error deleting salary template:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ---- Structure Composition CRUD ----
router.get("/template/:templateId/components", auth, hrOrAdmin, async (req, res) => {
    const c = await db();
    const [rows] = await c.query("SELECT sc.*, comp.name, comp.type FROM structure_composition sc JOIN salary_components comp ON sc.component_id = comp.component_id WHERE sc.template_id = ? ORDER BY sc.composition_id ASC", [req.params.templateId]);
    c.end();
    res.json(rows);
});
router.post("/template/:templateId/components", auth, hrOrAdmin, async (req, res) => {
    try {
        const c = await db();
        const { component_id, formula_or_value } = req.body;
        
        if (!component_id || !formula_or_value) {
            c.end();
            return res.status(400).json({ success: false, error: "Component and formula/value are required" });
        }
        
        const [result] = await c.query("INSERT INTO structure_composition SET ?", { 
            template_id: req.params.templateId, 
            component_id, 
            formula_or_value, 
            created_by: req.user.id 
        });
        c.end();
        res.json({ id: result.insertId, success: true, message: "Component added to template successfully" });
    } catch (error) {
        console.error("Error adding component to template:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});
router.put("/template/:templateId/components/:id", auth, hrOrAdmin, async (req, res) => {
    const c = await db();
    await c.query("UPDATE structure_composition SET ? WHERE composition_id = ? AND template_id = ?", [req.body, req.params.id, req.params.templateId]);
    c.end();
    res.json({ success: true });
});
router.delete("/template/:templateId/components/:id", auth, hrOrAdmin, async (req, res) => {
    const c = await db();
    await c.query("DELETE FROM structure_composition WHERE composition_id = ? AND template_id = ?", [req.params.id, req.params.templateId]);
    c.end();
    res.json({ success: true });
});

// ---- Employee Salary Contracts CRUD ----
router.get("/contracts", auth, hrOrAdmin, async (req, res) => {
    const c = await db();
    const [rows] = await c.query("SELECT esc.*, e.EmployeeNumber, e.FullName, t.template_name FROM employee_salary_contracts esc JOIN employees e ON esc.employee_id = e.id JOIN salary_structure_templates t ON esc.template_id = t.template_id ORDER BY esc.effective_from DESC");
    c.end();
    res.json(rows);
});
router.post("/contracts", auth, hrOrAdmin, async (req, res) => {
    try {
        const c = await db();
        const { employee_id, template_id, annual_ctc, effective_from, status } = req.body;
        
        if (!employee_id || !template_id || !annual_ctc || !effective_from) {
            c.end();
            return res.status(400).json({ success: false, error: "Missing required fields" });
        }
        
        const [result] = await c.query("INSERT INTO employee_salary_contracts SET ?", { 
            employee_id, 
            template_id, 
            annual_ctc, 
            effective_from, 
            status: status || 'Active', 
            created_by: req.user.id 
        });
        c.end();
        res.json({ id: result.insertId, success: true, message: "Employee contract created successfully" });
    } catch (error) {
        console.error("Error creating employee contract:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});
router.put("/contracts/:id", auth, hrOrAdmin, async (req, res) => {
    const c = await db();
    await c.query("UPDATE employee_salary_contracts SET ? WHERE contract_id = ?", [req.body, req.params.id]);
    c.end();
    res.json({ success: true });
});
router.delete("/contracts/:id", auth, hrOrAdmin, async (req, res) => {
    const c = await db();
    await c.query("DELETE FROM employee_salary_contracts WHERE contract_id = ?", [req.params.id]);
    c.end();
    res.json({ success: true });
});

// ---- Payroll Periods CRUD ----
router.get("/periods", auth, hrOrAdmin, async (req, res) => {
    const c = await db();
    const [rows] = await c.query("SELECT * FROM payroll_periods ORDER BY year DESC, month DESC");
    c.end();
    res.json(rows);
});
router.post("/periods", auth, hrOrAdmin, async (req, res) => {
    try {
        const c = await db();
        const { month, year, status } = req.body;
        
        if (!month || !year) {
            c.end();
            return res.status(400).json({ success: false, error: "Month and year are required" });
        }
        
        const [result] = await c.query("INSERT INTO payroll_periods SET ?", { 
            month, 
            year, 
            status: status || 'Draft' 
        });
        c.end();
        res.json({ id: result.insertId, success: true, message: "Payroll period created successfully" });
    } catch (error) {
        console.error("Error creating payroll period:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});
router.put("/periods/:id", auth, hrOrAdmin, async (req, res) => {
    const c = await db();
    await c.query("UPDATE payroll_periods SET ? WHERE period_id = ?", [req.body, req.params.id]);
    c.end();
    res.json({ success: true });
});
router.delete("/periods/:id", auth, hrOrAdmin, async (req, res) => {
    const c = await db();
    await c.query("DELETE FROM payroll_periods WHERE period_id = ?", [req.params.id]);
    c.end();
    res.json({ success: true });
});

// ---- Payslips (Read Only) ----
router.get("/payslips", auth, hrOrAdmin, async (req, res) => {
    const c = await db();
    const [rows] = await c.query("SELECT ps.*, e.EmployeeNumber, e.FullName FROM payslips ps JOIN employees e ON ps.employee_id = e.id ORDER BY ps.generated_at DESC");
    c.end();
    res.json(rows);
});
router.get("/payslips/:id", auth, hrOrAdmin, async (req, res) => {
    const c = await db();
    const [rows] = await c.query("SELECT ps.*, e.EmployeeNumber, e.FullName FROM payslips ps JOIN employees e ON ps.employee_id = e.id WHERE ps.payslip_id = ?", [req.params.id]);
    c.end();
    res.json(rows[0] || null);
});

// ---- Payslip Items (Read Only) ----
router.get("/payslips/:id/items", auth, hrOrAdmin, async (req, res) => {
    const c = await db();
    const [rows] = await c.query("SELECT pi.*, sc.name, sc.type FROM payslip_items pi JOIN salary_components sc ON pi.component_id = sc.component_id WHERE pi.payslip_id = ?", [req.params.id]);
    c.end();
    res.json(rows);
});

// ---- Payroll Run Endpoint ----
router.post("/run", auth, hrOrAdmin, async (req, res) => {
    const { period_id } = req.body;
    const c = await db();
    try {
        // Get payroll period
        const [periodRows] = await c.query("SELECT * FROM payroll_periods WHERE period_id = ?", [period_id]);
        if (!periodRows.length) throw new Error("Payroll period not found");
        const period = periodRows[0];

        // Get all employees with active contracts in this period
        const [contracts] = await c.query(
            `SELECT esc.*, e.FullName, e.EmployeeNumber, t.template_name FROM employee_salary_contracts esc
             JOIN employees e ON esc.employee_id = e.id
             JOIN salary_structure_templates t ON esc.template_id = t.id
             WHERE esc.is_active = 1 AND (esc.contract_start_date <= ? AND (esc.contract_end_date IS NULL OR esc.contract_end_date >= ?))`,
            [period.period_end, period.period_start]
        );

        let processed = 0;
        for (const contract of contracts) {
            // Fetch template composition
            const [composition] = await c.query(
                `SELECT sc.*, comp.code, comp.name, comp.type FROM structure_composition sc
                 JOIN salary_components comp ON sc.component_id = comp.id
                 WHERE sc.template_id = ? AND sc.is_active = 1 ORDER BY sc.sort_order ASC`,
                [contract.template_id]
            );

            // Assume CTC is stored in contract or employee (add logic as needed)
            const ctc = contract.ctc || 0;
            let net_pay = 0;
            let items = [];
            for (const comp of composition) {
                let amount = 0;
                if (comp.amount_type === 'fixed') {
                    amount = comp.value;
                } else if (comp.amount_type === 'percentage') {
                    amount = (comp.value / 100) * ctc;
                }
                items.push({ component_id: comp.component_id, amount, component_type: comp.type });
                if (comp.type === 'earning' || comp.type === 'reimbursement') net_pay += amount;
                if (comp.type === 'deduction' || comp.type === 'contribution') net_pay -= amount;
            }

            // Insert payslip
            const [psRes] = await c.query(
                `INSERT INTO payslips SET ?`,
                {
                    employee_id: contract.employee_id,
                    payroll_period_id: period_id,
                    contract_id: contract.id,
                    net_pay,
                    status: 'finalized',
                    generated_at: new Date(),
                    created_by: req.user.id
                }
            );
            const payslip_id = psRes.insertId;

            // Insert payslip items
            for (const item of items) {
                await c.query(
                    `INSERT INTO payslip_items SET ?`,
                    {
                        payslip_id,
                        component_id: item.component_id,
                        amount: item.amount,
                        component_type: item.component_type
                    }
                );
            }
            processed++;
        }
        c.end();
        res.json({ success: true, processed });
    } catch (err) {
        c.end();
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;