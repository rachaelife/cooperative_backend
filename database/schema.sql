-- Comprehensive Database Schema for Cooperative Management System

-- Users table (members)
CREATE TABLE IF NOT EXISTS users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  registration_number VARCHAR(50) UNIQUE,
  fullname VARCHAR(255) NOT NULL,
  gender ENUM('male', 'female') NOT NULL,
  mobile VARCHAR(20) NOT NULL,
  email VARCHAR(255) UNIQUE,
  address TEXT,
  referral VARCHAR(255),
  profile_image VARCHAR(500),
  status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_mobile (mobile),
  INDEX idx_status (status),
  INDEX idx_registration_number (registration_number)
);

-- Admin table
CREATE TABLE IF NOT EXISTS admin (
  admin_id INT AUTO_INCREMENT PRIMARY KEY,
  fullname VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('super_admin', 'admin', 'manager') DEFAULT 'admin',
  status ENUM('active', 'inactive') DEFAULT 'active',
  last_login TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_role (role)
);

-- Savings table
CREATE TABLE IF NOT EXISTS savings (
  savings_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  savings_type ENUM('monthly', 'voluntary', 'shares', 'building', 'development', 'special', 'emergency') NOT NULL,
  payment_type ENUM('cash', 'bank_transfer', 'mobile_money', 'check') DEFAULT 'cash',
  month_paid VARCHAR(20),
  year_paid YEAR DEFAULT (YEAR(CURDATE())),
  transaction_reference VARCHAR(100),
  notes TEXT,
  status ENUM('pending', 'confirmed', 'cancelled') DEFAULT 'confirmed',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_savings_type (savings_type),
  INDEX idx_month_year (month_paid, year_paid),
  INDEX idx_status (status)
);

-- Loan applications table
CREATE TABLE IF NOT EXISTS loan_application (
  application_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  loan_amount DECIMAL(15,2) NOT NULL,
  loan_term INT NOT NULL COMMENT 'Loan duration in months',
  loan_purpose TEXT NOT NULL,
  guarantor_name VARCHAR(255),
  guarantor_phone VARCHAR(20),
  guarantor_address TEXT,
  monthly_income DECIMAL(15,2),
  employment_status VARCHAR(100),
  loan_status ENUM('pending', 'approved', 'rejected', 'disbursed', 'cancelled') DEFAULT 'pending',
  application_date DATE DEFAULT (CURDATE()),
  reviewed_by INT NULL,
  review_date TIMESTAMP NULL,
  review_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (reviewed_by) REFERENCES admin(admin_id) ON DELETE SET NULL,
  INDEX idx_user_id (user_id),
  INDEX idx_status (loan_status),
  INDEX idx_application_date (application_date)
);

-- Loans table (disbursed loans)
CREATE TABLE IF NOT EXISTS loans (
  loan_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  application_id INT NULL,
  amount_disbursed DECIMAL(15,2) NOT NULL,
  interest_rate DECIMAL(5,2) DEFAULT 1.00 COMMENT 'Interest rate percentage',
  total_interest DECIMAL(15,2) NOT NULL,
  loan_repayment DECIMAL(15,2) DEFAULT 0.00 COMMENT 'Total amount repaid so far',
  remaining_balance DECIMAL(15,2) NOT NULL,
  loan_term INT NOT NULL COMMENT 'Loan duration in months',
  monthly_payment DECIMAL(15,2) NOT NULL,
  disbursement_date DATE NOT NULL,
  due_date DATE NOT NULL,
  next_payment_date DATE,
  payment_method ENUM('cash', 'bank_transfer', 'mobile_money', 'check') DEFAULT 'cash',
  status ENUM('active', 'completed', 'defaulted', 'partial', 'cancelled') DEFAULT 'active',
  guarantor_name VARCHAR(255),
  guarantor_phone VARCHAR(20),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (application_id) REFERENCES loan_application(application_id) ON DELETE SET NULL,
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_disbursement_date (disbursement_date),
  INDEX idx_due_date (due_date),
  INDEX idx_next_payment (next_payment_date)
);

-- Loan installments table (payment schedule)
CREATE TABLE IF NOT EXISTS loan_installments (
  installment_id INT AUTO_INCREMENT PRIMARY KEY,
  loan_id INT NOT NULL,
  installment_number INT NOT NULL,
  due_date DATE NOT NULL,
  principal_amount DECIMAL(15,2) NOT NULL,
  interest_amount DECIMAL(15,2) NOT NULL,
  total_amount DECIMAL(15,2) NOT NULL,
  payment_date DATE NULL,
  amount_paid DECIMAL(15,2) DEFAULT 0.00,
  status ENUM('pending', 'paid', 'overdue', 'partial') DEFAULT 'pending',
  late_fee DECIMAL(15,2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (loan_id) REFERENCES loans(loan_id) ON DELETE CASCADE,
  INDEX idx_loan_id (loan_id),
  INDEX idx_due_date (due_date),
  INDEX idx_status (status),
  UNIQUE KEY unique_loan_installment (loan_id, installment_number)
);

-- Loan payments table (payment history)
CREATE TABLE IF NOT EXISTS loan_payments (
  payment_id INT AUTO_INCREMENT PRIMARY KEY,
  loan_id INT NOT NULL,
  installment_id INT NULL,
  amount DECIMAL(15,2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_method ENUM('cash', 'bank_transfer', 'mobile_money', 'check') DEFAULT 'cash',
  transaction_reference VARCHAR(100),
  received_by INT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (loan_id) REFERENCES loans(loan_id) ON DELETE CASCADE,
  FOREIGN KEY (installment_id) REFERENCES loan_installments(installment_id) ON DELETE SET NULL,
  FOREIGN KEY (received_by) REFERENCES admin(admin_id) ON DELETE SET NULL,
  INDEX idx_loan_id (loan_id),
  INDEX idx_payment_date (payment_date),
  INDEX idx_payment_method (payment_method)
);

-- Loan repayments table (alternative/legacy table)
CREATE TABLE IF NOT EXISTS loan_repayments (
  repayment_id INT AUTO_INCREMENT PRIMARY KEY,
  loan_id INT NOT NULL,
  user_id INT NOT NULL,
  repayment_amount DECIMAL(15,2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_method ENUM('cash', 'bank_transfer', 'mobile_money', 'check') DEFAULT 'cash',
  remaining_balance DECIMAL(15,2) NOT NULL,
  transaction_reference VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (loan_id) REFERENCES loans(loan_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  INDEX idx_loan_id (loan_id),
  INDEX idx_user_id (user_id),
  INDEX idx_payment_date (payment_date)
);

-- Financial transactions table (general ledger)
CREATE TABLE IF NOT EXISTS transactions (
  transaction_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  transaction_type ENUM('savings', 'loan_disbursement', 'loan_repayment', 'fee', 'penalty', 'dividend', 'withdrawal') NOT NULL,
  reference_id INT NULL COMMENT 'Reference to savings_id, loan_id, etc.',
  amount DECIMAL(15,2) NOT NULL,
  transaction_date DATE NOT NULL,
  description TEXT,
  debit_account VARCHAR(100),
  credit_account VARCHAR(100),
  status ENUM('pending', 'completed', 'cancelled', 'failed') DEFAULT 'completed',
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES admin(admin_id) ON DELETE SET NULL,
  INDEX idx_user_id (user_id),
  INDEX idx_transaction_type (transaction_type),
  INDEX idx_transaction_date (transaction_date),
  INDEX idx_status (status)
);

-- System settings table
CREATE TABLE IF NOT EXISTS system_settings (
  setting_id INT AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT,
  setting_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
  description TEXT,
  is_editable BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_setting_key (setting_key)
);

-- Insert default system settings
INSERT IGNORE INTO system_settings (setting_key, setting_value, setting_type, description) VALUES
('default_interest_rate', '1.00', 'number', 'Default loan interest rate percentage'),
('max_loan_amount', '1000000', 'number', 'Maximum loan amount allowed'),
('min_loan_amount', '5000', 'number', 'Minimum loan amount allowed'),
('max_loan_term', '12', 'number', 'Maximum loan term in months'),
('min_loan_term', '1', 'number', 'Minimum loan term in months'),
('late_payment_fee', '500', 'number', 'Late payment fee amount'),
('cooperative_name', 'Cooperative Management System', 'string', 'Name of the cooperative'),
('currency_symbol', '₦', 'string', 'Currency symbol'),
('financial_year_start', '01-01', 'string', 'Financial year start date (MM-DD)');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_savings_created_at ON savings(created_at);
CREATE INDEX IF NOT EXISTS idx_loans_created_at ON loans(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);

-- Create views for common queries
CREATE OR REPLACE VIEW member_summary AS
SELECT 
    u.user_id,
    u.fullname,
    u.gender,
    u.mobile,
    u.email,
    u.status,
    COALESCE(SUM(s.amount), 0) as total_savings,
    COALESCE(SUM(CASE WHEN l.status = 'active' THEN l.remaining_balance ELSE 0 END), 0) as outstanding_loans,
    COUNT(DISTINCT s.savings_id) as savings_count,
    COUNT(DISTINCT l.loan_id) as loan_count,
    u.created_at as member_since
FROM users u
LEFT JOIN savings s ON u.user_id = s.user_id AND s.status = 'confirmed'
LEFT JOIN loans l ON u.user_id = l.user_id
GROUP BY u.user_id, u.fullname, u.gender, u.mobile, u.email, u.status, u.created_at;

CREATE OR REPLACE VIEW loan_summary AS
SELECT 
    l.loan_id,
    l.user_id,
    u.fullname,
    l.amount_disbursed,
    l.total_interest,
    l.loan_repayment,
    l.remaining_balance,
    l.monthly_payment,
    l.disbursement_date,
    l.due_date,
    l.next_payment_date,
    l.status,
    DATEDIFF(CURDATE(), l.next_payment_date) as days_overdue,
    CASE 
        WHEN l.status = 'completed' THEN 'Completed'
        WHEN DATEDIFF(CURDATE(), l.next_payment_date) > 30 THEN 'Overdue'
        WHEN DATEDIFF(CURDATE(), l.next_payment_date) > 0 THEN 'Late'
        ELSE 'Current'
    END as payment_status
FROM loans l
JOIN users u ON l.user_id = u.user_id;
