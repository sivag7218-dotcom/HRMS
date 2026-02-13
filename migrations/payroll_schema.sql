-- Payroll module SQL DDL (MySQL)
-- Generated: 2026-02-13
-- Design principles: revision-safe salary structures, frozen attendance snapshots, auditable payroll runs

SET FOREIGN_KEY_CHECKS = 0;

-- 1) Employee Salary Structures (revision-safe)
CREATE TABLE IF NOT EXISTS employee_salary_structures (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  employee_id INT UNSIGNED NOT NULL,
  structure_name VARCHAR(128) NOT NULL,
  ctc_amount DECIMAL(15,2) NOT NULL,
  effective_from DATE NOT NULL,
  effective_to DATE DEFAULT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  version INT NOT NULL DEFAULT 1,
  created_by INT DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT NULL,
  notes TEXT,
  UNIQUE KEY ux_employee_structure_employee_version (employee_id, version),
  KEY idx_employee_structure_employee (employee_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 1.1) Salary Components for a given structure
CREATE TABLE IF NOT EXISTS employee_salary_components (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  structure_id INT UNSIGNED NOT NULL,
  code VARCHAR(64) NOT NULL,
  name VARCHAR(128) NOT NULL,
  component_type ENUM('EARNING','DEDUCTION') NOT NULL DEFAULT 'EARNING',
  calculation_type ENUM('FIXED','PERCENTAGE') NOT NULL DEFAULT 'FIXED',
  value DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  percentage_of_code VARCHAR(64) DEFAULT NULL,
  taxable TINYINT(1) NOT NULL DEFAULT 1,
  prorated TINYINT(1) NOT NULL DEFAULT 0,
  sequence INT NOT NULL DEFAULT 10,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT NULL,
  KEY idx_component_structure (structure_id),
  UNIQUE KEY ux_structure_code (structure_id, code),
  CONSTRAINT fk_component_structure FOREIGN KEY (structure_id) REFERENCES employee_salary_structures(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2) Payroll Cycles / Calendar
CREATE TABLE IF NOT EXISTS payroll_cycles (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  year INT NOT NULL,
  month TINYINT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status ENUM('OPEN','LOCKED','PROCESSED') NOT NULL DEFAULT 'OPEN',
  locked_at DATETIME DEFAULT NULL,
  processed_at DATETIME DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY ux_cycle_year_month (year, month)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3) Payroll-safe Attendance Snapshots (frozen per cycle)
CREATE TABLE IF NOT EXISTS payroll_attendance_snapshots (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  cycle_id INT UNSIGNED NOT NULL,
  employee_id INT UNSIGNED NOT NULL,
  working_days INT NOT NULL DEFAULT 0,
  paid_days DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  lop_days DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  total_present INT NOT NULL DEFAULT 0,
  total_absent INT NOT NULL DEFAULT 0,
  total_leave INT NOT NULL DEFAULT 0,
  snapshot_ts DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by INT DEFAULT NULL,
  notes TEXT,
  UNIQUE KEY ux_att_snap_cycle_employee (cycle_id, employee_id),
  KEY idx_att_snap_employee (employee_id),
  CONSTRAINT fk_att_snap_cycle FOREIGN KEY (cycle_id) REFERENCES payroll_cycles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4) Payroll Runs (audit-safe, supports re-runs)
CREATE TABLE IF NOT EXISTS payroll_runs (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  cycle_id INT UNSIGNED NOT NULL,
  run_by INT DEFAULT NULL,
  run_name VARCHAR(128) DEFAULT NULL,
  status ENUM('PROCESSING','COMPLETED','FAILED','LOCKED') NOT NULL DEFAULT 'PROCESSING',
  total_employees INT NOT NULL DEFAULT 0,
  total_gross DECIMAL(18,2) DEFAULT 0.00,
  total_deductions DECIMAL(18,2) DEFAULT 0.00,
  total_net DECIMAL(18,2) DEFAULT 0.00,
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME DEFAULT NULL,
  is_rerun_of INT DEFAULT NULL,
  transaction_id VARCHAR(128) DEFAULT NULL,
  notes TEXT,
  UNIQUE KEY ux_run_cycle_started (cycle_id, started_at),
  CONSTRAINT fk_run_cycle FOREIGN KEY (cycle_id) REFERENCES payroll_cycles(id) ON DELETE CASCADE,
  CONSTRAINT fk_run_rerun FOREIGN KEY (is_rerun_of) REFERENCES payroll_runs(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4.1) Final employee monthly salaries produced by a run
CREATE TABLE IF NOT EXISTS payroll_employee_salaries (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  run_id INT UNSIGNED NOT NULL,
  cycle_id INT UNSIGNED NOT NULL,
  employee_id INT UNSIGNED NOT NULL,
  structure_id INT UNSIGNED DEFAULT NULL,
  gross_earnings DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  total_deductions DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  net_pay DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  is_locked TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT NULL,
  KEY idx_emp_salary_employee (employee_id),
  CONSTRAINT fk_salary_run FOREIGN KEY (run_id) REFERENCES payroll_runs(id) ON DELETE CASCADE,
  CONSTRAINT fk_salary_cycle FOREIGN KEY (cycle_id) REFERENCES payroll_cycles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4.2) Salary component level breakup for each employee salary
CREATE TABLE IF NOT EXISTS payroll_salary_breakups (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  employee_salary_id INT UNSIGNED NOT NULL,
  component_code VARCHAR(64) NOT NULL,
  component_name VARCHAR(128) NOT NULL,
  component_type ENUM('EARNING','DEDUCTION') NOT NULL,
  amount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  taxable TINYINT(1) NOT NULL DEFAULT 1,
  prorated TINYINT(1) NOT NULL DEFAULT 0,
  metadata JSON DEFAULT NULL,
  KEY idx_breakup_employee_salary (employee_salary_id),
  CONSTRAINT fk_breakup_employee_salary FOREIGN KEY (employee_salary_id) REFERENCES payroll_employee_salaries(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5) Employee Tax Profiles
CREATE TABLE IF NOT EXISTS employee_tax_profiles (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  employee_id INT UNSIGNED NOT NULL,
  financial_year VARCHAR(9) NOT NULL, -- e.g., 2025-2026
  tax_regime ENUM('OLD','NEW') DEFAULT 'OLD',
  pan VARCHAR(16) DEFAULT NULL,
  is_tds_exempt TINYINT(1) DEFAULT 0,
  declared_investments JSON DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT NULL,
  UNIQUE KEY ux_tax_profile_employee_year (employee_id, financial_year),
  CONSTRAINT fk_tax_profile_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5.1) Payroll Tax & Statutory Deductions line items
CREATE TABLE IF NOT EXISTS payroll_tax_deductions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  employee_salary_id INT UNSIGNED NOT NULL,
  deduction_code VARCHAR(64) NOT NULL,
  deduction_name VARCHAR(128) NOT NULL,
  amount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  metadata JSON DEFAULT NULL,
  KEY idx_tax_deduction_employee_salary (employee_salary_id),
  CONSTRAINT fk_tax_deduction_employee_salary FOREIGN KEY (employee_salary_id) REFERENCES payroll_employee_salaries(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6) Employee Bank Accounts
CREATE TABLE IF NOT EXISTS employee_bank_accounts (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  employee_id INT UNSIGNED NOT NULL,
  account_holder_name VARCHAR(128) NOT NULL,
  bank_name VARCHAR(128) NOT NULL,
  account_number VARCHAR(64) NOT NULL,
  ifsc_code VARCHAR(16) DEFAULT NULL,
  is_primary TINYINT(1) DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT NULL,
  UNIQUE KEY ux_emp_bank_emp_account (employee_id, account_number),
  CONSTRAINT fk_emp_bank_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6.1) Payroll Payouts (status tracking)
CREATE TABLE IF NOT EXISTS payroll_payouts (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  employee_salary_id INT UNSIGNED NOT NULL,
  payout_date DATE NOT NULL,
  payout_amount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  payout_status ENUM('PENDING','PAID','FAILED') NOT NULL DEFAULT 'PENDING',
  bank_account_id INT UNSIGNED DEFAULT NULL,
  transaction_ref VARCHAR(128) DEFAULT NULL,
  attempted_at DATETIME DEFAULT NULL,
  paid_at DATETIME DEFAULT NULL,
  notes TEXT,
  CONSTRAINT fk_payout_employee_salary FOREIGN KEY (employee_salary_id) REFERENCES payroll_employee_salaries(id) ON DELETE CASCADE,
  CONSTRAINT fk_payout_bank_account FOREIGN KEY (bank_account_id) REFERENCES employee_bank_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7) Payslip storage (read-only snapshot for reproducibility)
CREATE TABLE IF NOT EXISTS payroll_payslips (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  employee_salary_id INT UNSIGNED NOT NULL,
  payslip_json JSON NOT NULL,
  generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by INT DEFAULT NULL,
  CONSTRAINT fk_payslip_employee_salary FOREIGN KEY (employee_salary_id) REFERENCES payroll_employee_salaries(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;
