-- Enhanced Features Schema Updates
-- Run: node setup-enhanced-features.js

-- Create new tables first

CREATE TABLE IF NOT EXISTS employee_notification_preferences (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  preferences JSON NOT NULL COMMENT 'User notification preferences as JSON',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY ux_employee_prefs (employee_id),
  KEY idx_employee (employee_id),
  CONSTRAINT fk_notif_pref_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Payroll enhancements: Add overtime tracking
CREATE TABLE IF NOT EXISTS payroll_overtime (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  year INT NOT NULL,
  month TINYINT NOT NULL,
  overtime_hours DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  overtime_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  approved_by INT DEFAULT NULL,
  approved_at DATETIME DEFAULT NULL,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_employee_period (employee_id, year, month),
  CONSTRAINT fk_overtime_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Performance bonuses tracking
CREATE TABLE IF NOT EXISTS payroll_bonuses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  bonus_type ENUM('performance', 'festive', 'retention', 'referral', 'spot', 'annual') NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  paid_in_month DATE NOT NULL,
  performance_rating TINYINT DEFAULT NULL COMMENT 'Rating 1-5',
  approved_by INT DEFAULT NULL,
  approved_at DATETIME DEFAULT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_employee (employee_id),
  KEY idx_paid_month (paid_in_month),
  CONSTRAINT fk_bonus_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tax saving declarations
CREATE TABLE IF NOT EXISTS tax_declarations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  financial_year VARCHAR(9) NOT NULL COMMENT 'eg: 2025-2026',
  section VARCHAR(20) NOT NULL COMMENT 'eg: 80C, 80D, HRA',
  investment_type VARCHAR(100) NOT NULL COMMENT 'eg: PPF, LIC, HRA',
  declared_amount DECIMAL(10,2) NOT NULL,
  proof_submitted TINYINT(1) DEFAULT 0,
  proof_document_path VARCHAR(255) DEFAULT NULL,
  approved TINYINT(1) DEFAULT 0,
  approved_by INT DEFAULT NULL,
  approved_amount DECIMAL(10,2) DEFAULT NULL,
  remarks TEXT,
  submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_employee_year (employee_id, financial_year),
  KEY idx_section (section),
  CONSTRAINT fk_tax_decl_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Advanced analytics cache table (for performance)
CREATE TABLE IF NOT EXISTS analytics_cache (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cache_key VARCHAR(255) NOT NULL,
  cache_type VARCHAR(50) NOT NULL COMMENT 'department, salary, attendance, etc',
  data JSON NOT NULL,
  valid_until DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY ux_cache_key (cache_key),
  KEY idx_cache_type (cache_type),
  KEY idx_valid_until (valid_until)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Document expiry tracking
CREATE TABLE IF NOT EXISTS document_expiry_tracking (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  document_type ENUM('passport', 'visa', 'license', 'certification', 'insurance', 'contract', 'other') NOT NULL,
  document_name VARCHAR(100) NOT NULL,
  issue_date DATE DEFAULT NULL,
  expiry_date DATE NOT NULL,
  reminder_days_before INT DEFAULT 30 COMMENT 'Days before expiry to send reminder',
  document_path VARCHAR(255) DEFAULT NULL,
  status ENUM('active', 'expiring_soon', 'expired', 'renewed') DEFAULT 'active',
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_employee (employee_id),
  KEY idx_expiry (expiry_date),
  KEY idx_status (status),
  CONSTRAINT fk_doc_expiry_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Audit log for sensitive operations
CREATE TABLE IF NOT EXISTS audit_log (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  action VARCHAR(100) NOT NULL COMMENT 'eg: payroll_run, salary_update, user_create',
  entity_type VARCHAR(50) NOT NULL COMMENT 'eg: payroll, employee, user',
  entity_id INT DEFAULT NULL,
  old_value JSON DEFAULT NULL,
  new_value JSON DEFAULT NULL,
  ip_address VARCHAR(45) DEFAULT NULL,
  user_agent VARCHAR(255) DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_user (user_id),
  KEY idx_action (action),
  KEY idx_entity (entity_type, entity_id),
  KEY idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Email queue for notification emails
CREATE TABLE IF NOT EXISTS email_queue (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  to_email VARCHAR(255) NOT NULL,
  cc_email VARCHAR(255) DEFAULT NULL,
  subject VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  template_name VARCHAR(100) DEFAULT NULL,
  template_data JSON DEFAULT NULL,
  priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
  status ENUM('pending', 'sent', 'failed') DEFAULT 'pending',
  retry_count TINYINT DEFAULT 0,
  sent_at DATETIME DEFAULT NULL,
  error_message TEXT DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_status (status),
  KEY idx_priority (priority),
  KEY idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Add indexes for better performance on existing tables (ignore if exists)
-- Attendance indexes
CREATE INDEX idx_employee_date ON attendance (employee_id, attendance_date);
CREATE INDEX idx_att_work_mode ON attendance (work_mode);
CREATE INDEX idx_att_status ON attendance (status);

-- Leave indexes
CREATE INDEX idx_leave_employee_dates ON leaves (employee_id, start_date, end_date);
CREATE INDEX idx_leave_status ON leaves (status);

-- Payroll indexes
CREATE INDEX idx_payroll_sal_employee ON payroll_employee_salaries (employee_id);
CREATE INDEX idx_payroll_sal_run ON payroll_employee_salaries (run_id);

-- Employee indexes
CREATE INDEX idx_emp_department ON employees (DepartmentId);
CREATE INDEX idx_emp_designation ON employees (DesignationId);
CREATE INDEX idx_emp_status ON employees (EmploymentStatus);
CREATE INDEX idx_emp_location ON employees (LocationId);

-- Add full-text search for employees (useful for search functionality)
CREATE FULLTEXT INDEX idx_fulltext_search ON employees (FullName, WorkEmail, EmployeeNumber);

-- Add composite indexes for better query performance
CREATE INDEX idx_salary_struct_active ON salary_structures(employee_id, is_active, effective_from);
CREATE INDEX idx_payroll_cycle_status ON payroll_cycles(year, month, status);

-- Update notifications table with new columns (do this after creating new tables)
ALTER TABLE notifications ADD COLUMN type VARCHAR(50) DEFAULT 'general' AFTER message;
ALTER TABLE notifications ADD COLUMN priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium' AFTER type;
ALTER TABLE notifications ADD COLUMN category VARCHAR(50) DEFAULT 'general' AFTER priority;
ALTER TABLE notifications ADD COLUMN scheduled_for DATETIME DEFAULT NULL AFTER category;
ALTER TABLE notifications ADD COLUMN sent_at DATETIME DEFAULT NULL AFTER scheduled_for;
ALTER TABLE notifications ADD COLUMN metadata JSON DEFAULT NULL AFTER sent_at;

-- Add indexes to notifications table
CREATE INDEX idx_notif_priority ON notifications (priority);
CREATE INDEX idx_notif_category ON notifications (category);
CREATE INDEX idx_notif_scheduled ON notifications (scheduled_for);
CREATE INDEX idx_notif_type ON notifications (type);

-- SELECTs to verify the changes
-- Uncomment to test after running the migration
/*
SELECT COUNT(*) as notification_count FROM notifications;
SELECT COUNT(*) as preferences_count FROM employee_notification_preferences;
SELECT COUNT(*) as overtime_count FROM payroll_overtime;
SELECT COUNT(*) as bonus_count FROM payroll_bonuses;
*/

-- ===============================================
-- END OF SCHEMA UPDATES
-- ===============================================
