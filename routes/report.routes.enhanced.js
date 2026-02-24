/**
 * ENHANCED REPORT ROUTES
 * Advanced analytics and reporting endpoints
 */

const express = require("express");
const router = express.Router();
const { db } = require("../config/database");
const { auth, hr, admin } = require("../middleware/auth");

/* ============ DEPARTMENT ANALYTICS ============ */

// Department-wise headcount and cost analysis
router.get("/analytics/department", auth, hr, async (req, res) => {
    try {
        const c = await db();
        const [data] = await c.query(`
            SELECT 
                e.Department,
                COUNT(DISTINCT e.id) as employee_count,
                COUNT(DISTINCT CASE WHEN e.EmploymentStatus = 'active' THEN e.id END) as active_count,
                COUNT(DISTINCT CASE WHEN e.Gender = 'Male' THEN e.id END) as male_count,
                COUNT(DISTINCT CASE WHEN e.Gender = 'Female' THEN e.id END) as female_count,
                COALESCE(AVG(ss.ctc_amount), 0) as avg_ctc,
                COALESCE(SUM(ss.ctc_amount), 0) as total_cost
            FROM employees e
            LEFT JOIN salary_structures ss ON ss.employee_id = e.id AND ss.is_active = 1
            WHERE e.Department IS NOT NULL
            GROUP BY e.Department
            ORDER BY employee_count DESC
        `);
        c.end();
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Designation-wise analytics
router.get("/analytics/designation", auth, hr, async (req, res) => {
    try {
        const c = await db();
        const [data] = await c.query(`
            SELECT 
                e.Designation,
                COUNT(*) as count,
                COALESCE(AVG(ss.ctc_amount), 0) as avg_ctc,
                COALESCE(MIN(ss.ctc_amount), 0) as min_ctc,
                COALESCE(MAX(ss.ctc_amount), 0) as max_ctc
            FROM employees e
            LEFT JOIN salary_structures ss ON ss.employee_id = e.id AND ss.is_active = 1
            WHERE e.Designation IS NOT NULL AND e.EmploymentStatus = 'active'
            GROUP BY e.Designation
            ORDER BY avg_ctc DESC
        `);
        c.end();
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Location-wise distribution
router.get("/analytics/location", auth, hr, async (req, res) => {
    try {
        const c = await db();
        const [data] = await c.query(`
            SELECT 
                e.Location,
                COUNT(*) as employee_count,
                COUNT(CASE WHEN e.EmploymentStatus = 'active' THEN 1 END) as active_count
            FROM employees e
            WHERE e.Location IS NOT NULL
            GROUP BY e.Location
            ORDER BY employee_count DESC
        `);
        c.end();
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* ============ SALARY ANALYTICS ============ */

// Salary distribution report
router.get("/analytics/salary-distribution", auth, hr, async (req, res) => {
    try {
        const c = await db();
        const [data] = await c.query(`
            SELECT 
                CASE 
                    WHEN ss.ctc_amount < 300000 THEN '0-3L'
                    WHEN ss.ctc_amount < 500000 THEN '3-5L'
                    WHEN ss.ctc_amount < 800000 THEN '5-8L'
                    WHEN ss.ctc_amount < 1200000 THEN '8-12L'
                    WHEN ss.ctc_amount < 2000000 THEN '12-20L'
                    ELSE '20L+'
                END as salary_band,
                COUNT(*) as employee_count,
                AVG(ss.ctc_amount) as avg_ctc
            FROM salary_structures ss
            JOIN employees e ON e.id = ss.employee_id
            WHERE ss.is_active = 1 AND e.EmploymentStatus = 'active'
            GROUP BY salary_band
            ORDER BY MIN(ss.ctc_amount)
        `);
        c.end();
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Payroll cost trend (monthly)
router.get("/analytics/payroll-trend", auth, hr, async (req, res) => {
    try {
        const { startYear, endYear } = req.query;
        const c = await db();
        const [data] = await c.query(`
            SELECT 
                cy.year,
                cy.month,
                COUNT(DISTINCT pes.employee_id) as employee_count,
                SUM(pes.gross_earnings) as total_gross,
                SUM(pes.total_deductions) as total_deductions,
                SUM(pes.net_pay) as total_net_pay,
                AVG(pes.gross_earnings) as avg_gross
            FROM payroll_cycles cy
            JOIN payroll_runs pr ON pr.cycle_id = cy.id
            JOIN payroll_employee_salaries pes ON pes.run_id = pr.id
            WHERE cy.year BETWEEN ? AND ?
            GROUP BY cy.year, cy.month
            ORDER BY cy.year DESC, cy.month DESC
            LIMIT 12
        `, [startYear || 2024, endYear || 2026]);
        c.end();
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* ============ ATTENDANCE ANALYTICS ============ */

// Attendance trends and patterns
router.get("/analytics/attendance-trend", auth, hr, async (req, res) => {
    try {
        const { startDate, endDate, department } = req.query;
        const c = await db();
        
        let query = `
            SELECT 
                DATE_FORMAT(a.attendance_date, '%Y-%m') as month,
                COUNT(DISTINCT a.employee_id) as unique_employees,
                COUNT(*) as total_records,
                SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_count,
                SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent_count,
                SUM(CASE WHEN a.status = 'leave' THEN 1 ELSE 0 END) as leave_count,
                AVG(a.working_hours) as avg_hours,
                ROUND(SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as attendance_percentage
            FROM attendance a
            JOIN employees e ON e.id = a.employee_id
            WHERE a.attendance_date BETWEEN ? AND ?
        `;
        
        const params = [startDate || '2026-01-01', endDate || '2026-12-31'];
        
        if (department) {
            query += ' AND e.Department = ?';
            params.push(department);
        }
        
        query += `
            GROUP BY month
            ORDER BY month DESC
        `;
        
        const [data] = await c.query(query, params);
        c.end();
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Work mode distribution (Office/WFH/Remote)
router.get("/analytics/work-mode", auth, hr, async (req, res) => {
    try {
        const { month } = req.query; // YYYY-MM format
        const c = await db();
        
        const [data] = await c.query(`
            SELECT 
                a.work_mode,
                COUNT(*) as count,
                COUNT(DISTINCT a.employee_id) as unique_employees,
                ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
            FROM attendance a
            WHERE DATE_FORMAT(a.attendance_date, '%Y-%m') = ?
            GROUP BY a.work_mode
            ORDER BY count DESC
        `, [month || '2026-02']);
        
        c.end();
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Late arrivals and early departures report
router.get("/analytics/punctuality", auth, hr, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const c = await db();
        
        const [data] = await c.query(`
            SELECT 
                e.id,
                e.EmployeeNumber,
                e.FullName,
                e.Department,
                COUNT(CASE WHEN TIME(a.check_in) > '09:30:00' THEN 1 END) as late_arrivals,
                COUNT(CASE WHEN TIME(a.check_out) < '17:30:00' AND a.check_out IS NOT NULL THEN 1 END) as early_departures,
                COUNT(*) as total_days
            FROM employees e
            JOIN attendance a ON a.employee_id = e.id
            WHERE a.attendance_date BETWEEN ? AND ?
            GROUP BY e.id, e.EmployeeNumber, e.FullName, e.Department
            HAVING late_arrivals > 0 OR early_departures > 0
            ORDER BY late_arrivals DESC, early_departures DESC
            LIMIT 100
        `, [startDate || '2026-02-01', endDate || '2026-02-28']);
        
        c.end();
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* ============ LEAVE ANALYTICS ============ */

// Leave balance summary
router.get("/analytics/leave-balances", auth, hr, async (req, res) => {
    try {
        const { department } = req.query;
        const c = await db();
        
        let query = `
            SELECT 
                e.id,
                e.EmployeeNumber,
                e.FullName,
                e.Department,
                lt.leave_type_name,
                lb.allocated_days,
                lb.used_days,
                lb.balance_days,
                lb.year
            FROM leave_balances lb
            JOIN employees e ON e.id = lb.employee_id
            JOIN leave_types lt ON lt.id = lb.leave_type_id
            WHERE lb.year = YEAR(CURDATE())
        `;
        
        const params = [];
        if (department) {
            query += ' AND e.Department = ?';
            params.push(department);
        }
        
        query += ' ORDER BY e.EmployeeNumber, lt.leave_type_name';
        
        const [data] = await c.query(query, params);
        c.end();
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Leave utilization trends
router.get("/analytics/leave-utilization", auth, hr, async (req, res) => {
    try {
        const c = await db();
        const [data] = await c.query(`
            SELECT 
                lt.leave_type_name,
                COUNT(*) as total_requests,
                SUM(DATEDIFF(l.end_date, l.start_date) + 1) as total_days,
                AVG(DATEDIFF(l.end_date, l.start_date) + 1) as avg_duration,
                SUM(CASE WHEN l.status = 'Approved' THEN 1 ELSE 0 END) as approved_count,
                SUM(CASE WHEN l.status = 'Rejected' THEN 1 ELSE 0 END) as rejected_count,
                SUM(CASE WHEN l.status = 'Pending' THEN 1 ELSE 0 END) as pending_count
            FROM leaves l
            JOIN leave_types lt ON lt.id = l.leave_type_id
            WHERE YEAR(l.start_date) = YEAR(CURDATE())
            GROUP BY lt.leave_type_name
            ORDER BY total_requests DESC
        `);
        c.end();
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* ============ EMPLOYEE LIFECYCLE ============ */

// New joiners report
router.get("/analytics/new-joiners", auth, hr, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const c = await db();
        
        const [data] = await c.query(`
            SELECT 
                e.id,
                e.EmployeeNumber,
                e.FullName,
                e.Department,
                e.Designation,
                e.DateOfJoining,
                DATEDIFF(CURDATE(), e.DateOfJoining) as days_in_company,
                ss.ctc_amount
            FROM employees e
            LEFT JOIN salary_structures ss ON ss.employee_id = e.id AND ss.is_active = 1
            WHERE e.DateOfJoining BETWEEN ? AND ?
            ORDER BY e.DateOfJoining DESC
        `, [startDate || '2026-01-01', endDate || '2026-12-31']);
        
        c.end();
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Attrition analysis
router.get("/analytics/attrition", auth, hr, async (req, res) => {
    try {
        const { year } = req.query;
        const c = await db();
        
        const [data] = await c.query(`
            SELECT 
                DATE_FORMAT(e.last_working_day, '%Y-%m') as month,
                COUNT(*) as exits_count,
                e.Department,
                AVG(DATEDIFF(e.last_working_day, e.DateOfJoining)) as avg_tenure_days
            FROM employees e
            WHERE e.EmploymentStatus = 'inactive' 
                AND YEAR(e.last_working_day) = ?
                AND e.last_working_day IS NOT NULL
            GROUP BY month, e.Department
            ORDER BY month DESC
        `, [year || 2026]);
        
        const [summary] = await c.query(`
            SELECT 
                (SELECT COUNT(*) FROM employees WHERE EmploymentStatus = 'inactive' AND YEAR(last_working_day) = ?) as total_exits,
                (SELECT COUNT(*) FROM employees WHERE EmploymentStatus = 'active') as current_headcount,
                ROUND((SELECT COUNT(*) FROM employees WHERE EmploymentStatus = 'inactive' AND YEAR(last_working_day) = ?) * 100.0 / 
                      (SELECT COUNT(*) FROM employees WHERE EmploymentStatus = 'active'), 2) as attrition_rate
        `, [year || 2026, year || 2026]);
        
        c.end();
        res.json({ success: true, data, summary: summary[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* ============ COMPLIANCE ============ */

// Tax deduction summary
router.get("/analytics/tax-summary", auth, hr, async (req, res) => {
    try {
        const { year, month } = req.query;
        const c = await db();
        
        const [data] = await c.query(`
            SELECT 
                e.id,
                e.EmployeeNumber,
                e.FullName,
                pes.gross_earnings,
                pes.total_deductions,
                pes.net_pay,
                ptd.tds_amount,
                ptd.professional_tax,
                ptd.pf_employee,
                ptd.esi_employee
            FROM payroll_employee_salaries pes
            JOIN employees e ON e.id = pes.employee_id
            JOIN payroll_runs pr ON pr.id = pes.run_id
            JOIN payroll_cycles cy ON cy.id = pr.cycle_id
            LEFT JOIN payroll_tax_deductions ptd ON ptd.employee_salary_id = pes.id
            WHERE cy.year = ? AND cy.month = ?
            ORDER BY e.EmployeeNumber
        `, [year || 2026, month || 2]);
        
        c.end();
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Document compliance report
router.get("/analytics/document-compliance", auth, hr, async (req, res) => {
    try {
        const c = await db();
        const [data] = await c.query(`
            SELECT 
                e.id,
                e.EmployeeNumber,
                e.FullName,
                e.Department,
                CASE WHEN e.AadharNumber IS NOT NULL THEN 'Yes' ELSE 'No' END as has_aadhar,
                CASE WHEN e.PANNumber IS NOT NULL THEN 'Yes' ELSE 'No' END as has_pan,
                CASE WHEN e.BankAccountNumber IS NOT NULL THEN 'Yes' ELSE 'No' END as has_bank,
                CASE WHEN e.UAN IS NOT NULL THEN 'Yes' ELSE 'No' END as has_uan
            FROM employees e
            WHERE e.EmploymentStatus = 'active'
            HAVING has_aadhar = 'No' OR has_pan = 'No' OR has_bank = 'No' OR has_uan = 'No'
            ORDER BY e.EmployeeNumber
        `);
        c.end();
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* ============ EXPORT REPORTS ============ */

// Comprehensive payroll export
router.get("/export/payroll", auth, hr, async (req, res) => {
    try {
        const { year, month } = req.query;
        const c = await db();
        
        const [data] = await c.query(`
            SELECT 
                e.EmployeeNumber,
                e.FullName,
                e.Department,
                e.Designation,
                e.BankAccountNumber,
                e.IFSCCode,
                pes.gross_earnings,
                pes.total_deductions,
                pes.net_pay,
                cy.year,
                cy.month
            FROM payroll_employee_salaries pes
            JOIN employees e ON e.id = pes.employee_id
            JOIN payroll_runs pr ON pr.id = pes.run_id
            JOIN payroll_cycles cy ON cy.id = pr.cycle_id
            WHERE cy.year = ? AND cy.month = ?
            ORDER BY e.EmployeeNumber
        `, [year || 2026, month || 2]);
        
        c.end();
        
        // Format for CSV export
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=payroll_${year}_${month}.csv`);
        
        if (data.length === 0) {
            return res.send('No data available');
        }
        
        const headers = Object.keys(data[0]).join(',');
        const rows = data.map(row => Object.values(row).join(',')).join('\n');
        res.send(`${headers}\n${rows}`);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
