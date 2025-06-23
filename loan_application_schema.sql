-- Loan application table
CREATE TABLE IF NOT EXISTS loan_application (
    loan_application_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    loan_amount DECIMAL(10, 2) NOT NULL,
    loan_term INT NOT NULL,
    loan_purpose VARCHAR(255) NOT NULL,
    loan_status ENUM('pending', 'approved', 'rejected', 'disbursed') DEFAULT 'pending',
    monthly_installment DECIMAL(10, 2) NOT NULL,
    total_interest DECIMAL(10, 2) NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Add indexes for faster lookups
CREATE INDEX idx_loan_application_user_id ON loan_application(user_id);
CREATE INDEX idx_loan_application_status ON loan_application(loan_status); 