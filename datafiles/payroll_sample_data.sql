-- ============================================
-- PAYROLL MODULE - SAMPLE DATA FOR TESTING
-- ============================================
-- This file contains sample data to test the payroll module
-- Run this after setting up your HRMS database

-- Make sure you have employees in the system
-- This assumes employee IDs 1, 2, 3 exist (adjust as needed)

-- ============================================
-- 1. SALARY STRUCTURES
-- ============================================

-- Salary Structure for Employee 1 - Standard Employee
INSERT INTO salary_structures (employee_id, structure_name, ctc_amount, effective_from, effective_to, is_active, version, created_by, notes)
VALUES 
(1, 'Standard Employee Package 2026', 600000.00, '2026-01-01', NULL, 1, 1, 1, 'Annual CTC: 6 LPA'),
(2, 'Senior Employee Package 2026', 900000.00, '2026-01-01', NULL, 1, 1, 1, 'Annual CTC: 9 LPA'),
(3, 'Manager Package 2026', 1200000.00, '2026-01-01', NULL, 1, 1, 1, 'Annual CTC: 12 LPA');

-- ============================================
-- 2. SALARY COMPONENTS
-- ============================================

-- Components for Structure 1 (Employee 1 - 6 LPA)
INSERT INTO salary_components (structure_id, code, name, component_type, calculation_type, value, percentage_of_code, taxable, prorated, sequence, notes)
VALUES
-- Earnings
(1, 'BASIC', 'Basic Salary', 'EARNING', 'PERCENTAGE', 40.00, NULL, 1, 1, 10, '40% of CTC'),
(1, 'HRA', 'House Rent Allowance', 'EARNING', 'PERCENTAGE', 20.00, 'BASIC', 1, 1, 20, '20% of Basic'),
(1, 'CONVEYANCE', 'Conveyance Allowance', 'EARNING', 'FIXED', 1600.00, NULL, 0, 0, 30, 'Fixed Rs 1600/month'),
(1, 'SPECIAL', 'Special Allowance', 'EARNING', 'PERCENTAGE', 30.00, NULL, 1, 1, 40, '30% of CTC'),
(1, 'MEDICAL', 'Medical Allowance', 'EARNING', 'FIXED', 1250.00, NULL, 0, 0, 50, 'Fixed Rs 1250/month'),
-- Deductions
(1, 'PF_DEDUCT', 'PF Employee Contribution', 'DEDUCTION', 'PERCENTAGE', 12.00, 'BASIC', 0, 1, 60, '12% of Basic');

-- Components for Structure 2 (Employee 2 - 9 LPA)
INSERT INTO salary_components (structure_id, code, name, component_type, calculation_type, value, percentage_of_code, taxable, prorated, sequence, notes)
VALUES
-- Earnings
(2, 'BASIC', 'Basic Salary', 'EARNING', 'PERCENTAGE', 45.00, NULL, 1, 1, 10, '45% of CTC'),
(2, 'HRA', 'House Rent Allowance', 'EARNING', 'PERCENTAGE', 25.00, 'BASIC', 1, 1, 20, '25% of Basic'),
(2, 'CONVEYANCE', 'Conveyance Allowance', 'EARNING', 'FIXED', 2400.00, NULL, 0, 0, 30, 'Fixed Rs 2400/month'),
(2, 'SPECIAL', 'Special Allowance', 'EARNING', 'PERCENTAGE', 25.00, NULL, 1, 1, 40, '25% of CTC'),
(2, 'MEDICAL', 'Medical Allowance', 'EARNING', 'FIXED', 1500.00, NULL, 0, 0, 50, 'Fixed Rs 1500/month'),
(2, 'PERFORMANCE', 'Performance Bonus', 'EARNING', 'PERCENTAGE', 5.00, NULL, 1, 0, 55, '5% of CTC - not prorated'),
-- Deductions
(2, 'PF_DEDUCT', 'PF Employee Contribution', 'DEDUCTION', 'PERCENTAGE', 12.00, 'BASIC', 0, 1, 60, '12% of Basic');

-- Components for Structure 3 (Employee 3 - 12 LPA)
INSERT INTO salary_components (structure_id, code, name, component_type, calculation_type, value, percentage_of_code, taxable, prorated, sequence, notes)
VALUES
-- Earnings
(3, 'BASIC', 'Basic Salary', 'EARNING', 'PERCENTAGE', 50.00, NULL, 1, 1, 10, '50% of CTC'),
(3, 'HRA', 'House Rent Allowance', 'EARNING', 'PERCENTAGE', 30.00, 'BASIC', 1, 1, 20, '30% of Basic'),
(3, 'CONVEYANCE', 'Conveyance Allowance', 'EARNING', 'FIXED', 3000.00, NULL, 0, 0, 30, 'Fixed Rs 3000/month'),
(3, 'SPECIAL', 'Special Allowance', 'EARNING', 'PERCENTAGE', 15.00, NULL, 1, 1, 40, '15% of CTC'),
(3, 'MEDICAL', 'Medical Allowance', 'EARNING', 'FIXED', 2000.00, NULL, 0, 0, 50, 'Fixed Rs 2000/month'),
(3, 'PERFORMANCE', 'Performance Bonus', 'EARNING', 'PERCENTAGE', 5.00, NULL, 1, 0, 55, '5% of CTC - not prorated'),
-- Deductions
(3, 'PF_DEDUCT', 'PF Employee Contribution', 'DEDUCTION', 'PERCENTAGE', 12.00, 'BASIC', 0, 1, 60, '12% of Basic'),
(3, 'PROF_TAX', 'Professional Tax', 'DEDUCTION', 'FIXED', 200.00, NULL, 0, 0, 70, 'Fixed Rs 200/month');

-- ============================================
-- 3. EMPLOYEE BANK ACCOUNTS (if not already present)
-- ============================================

INSERT IGNORE INTO employee_bank_accounts (employee_id, account_holder_name, bank_name, account_number, ifsc_code, is_primary)
VALUES
(1, 'Test Employee 1', 'HDFC Bank', '12345678901234', 'HDFC0001234', 1),
(2, 'Test Employee 2', 'ICICI Bank', '98765432109876', 'ICIC0009876', 1),
(3, 'Test Manager 1', 'SBI', '11223344556677', 'SBIN0001122', 1);

-- ============================================
-- 4. SAMPLE ATTENDANCE DATA FOR FEBRUARY 2026
-- ============================================

-- Clear any existing attendance for Feb 2026 testing
DELETE FROM attendance WHERE attendance_date >= '2026-02-01' AND attendance_date <= '2026-02-28';

-- Insert attendance records for employees 1, 2, 3 for February 2026
-- Assuming 20 working days, all present for now (adjust as needed)

INSERT INTO attendance (employee_id, attendance_date, status, check_in, check_out, working_hours, work_mode)
SELECT 
    emp.id,
    DATE_ADD('2026-02-01', INTERVAL (n - 1) DAY) as attendance_date,
    'present' as status,
    CONCAT(DATE_ADD('2026-02-01', INTERVAL (n - 1) DAY), ' 09:00:00') as check_in,
    CONCAT(DATE_ADD('2026-02-01', INTERVAL (n - 1) DAY), ' 18:00:00') as check_out,
    9.0 as working_hours,
    'Office' as work_mode
FROM 
    (SELECT 1 as id UNION SELECT 2 UNION SELECT 3) as emp
    CROSS JOIN (
        SELECT 1 as n UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5
        UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10
        UNION SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14 UNION SELECT 15
        UNION SELECT 16 UNION SELECT 17 UNION SELECT 18 UNION SELECT 19 UNION SELECT 20
    ) as nums
WHERE 
    DAYOFWEEK(DATE_ADD('2026-02-01', INTERVAL (n - 1) DAY)) NOT IN (1, 7) -- Exclude Sunday (1) and Saturday (7)
    AND DATE_ADD('2026-02-01', INTERVAL (n - 1) DAY) <= '2026-02-23';

-- Mark some leaves for variety
UPDATE attendance 
SET status = 'leave', working_hours = 0, check_in = NULL, check_out = NULL 
WHERE employee_id = 1 AND attendance_date IN ('2026-02-05', '2026-02-06');

UPDATE attendance 
SET status = 'absent', working_hours = 0, check_in = NULL, check_out = NULL 
WHERE employee_id = 2 AND attendance_date = '2026-02-10';

-- ============================================
-- 5. TEST TAX PROFILES (Optional)
-- ============================================

INSERT IGNORE INTO employee_tax_profiles (employee_id, financial_year, tax_regime, pan, is_tds_exempt)
VALUES
(1, '2025-2026', 'NEW', 'ABCDE1234F', 0),
(2, '2025-2026', 'OLD', 'BCDEF2345G', 0),
(3, '2025-2026', 'NEW', 'CDEFG3456H', 0);

-- ============================================
-- TESTING INSTRUCTIONS
-- ============================================
/*
After running this script, you can test the payroll module:

1. VIEW SALARY STRUCTURES:
   GET /api/payroll-master/structures
   GET /api/payroll-master/structures?employee_id=1

2. VIEW COMPONENTS FOR A STRUCTURE:
   GET /api/payroll-master/components?structure_id=1

3. RUN PAYROLL FOR FEBRUARY 2026:
   POST /api/payroll/v2/run
   Body: { "year": 2026, "month": 2 }

4. VIEW PAYSLIPS:
   GET /api/payroll/v2/payslips/1  (for employee 1)
   GET /api/payroll/v2/payslips/1/2026/2  (specific month)

5. VIEW SALARY STRUCTURE FOR AN EMPLOYEE:
   GET /api/payroll/v2/structure/1

6. VIEW ATTENDANCE IMPACT:
   GET /api/payroll/v2/attendance-impact/1?year=2026&month=2

EXPECTED RESULTS:
- Employee 1 (6 LPA): Monthly gross ~50,000, with HRA, allowances, PF deduction
- Employee 2 (9 LPA): Monthly gross ~75,000, with performance bonus
- Employee 3 (12 LPA): Monthly gross ~100,000, with professional tax

Note: Actual amounts will vary based on attendance and proration settings.
*/
