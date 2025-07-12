const mysql = require("mysql2");
require("dotenv").config();

console.log("🚀 Setting up database...");

// First, connect without specifying database to create it
const setupConnection = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true
});

setupConnection.connect((err) => {
    if (err) {
        console.error("❌ Failed to connect to MySQL server:", err.message);
        console.error("💡 Make sure MySQL is running and credentials are correct");
        process.exit(1);
    }
    
    console.log("✅ Connected to MySQL server");
    
    // Create database if it doesn't exist
    const dbName = process.env.DB_NAME || 'coorperative';
    setupConnection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``, (err) => {
        if (err) {
            console.error("❌ Failed to create database:", err.message);
            process.exit(1);
        }
        
        console.log(`✅ Database '${dbName}' created/verified`);
        
        // Switch to the database
        setupConnection.query(`USE \`${dbName}\``, (err) => {
            if (err) {
                console.error("❌ Failed to use database:", err.message);
                process.exit(1);
            }
            
            console.log(`✅ Using database '${dbName}'`);
            
            // Create essential tables
            createTables();
        });
    });
});

function createTables() {
    console.log("🔧 Creating essential tables...");
    
    // Create users table
    const createUsersTable = `
        CREATE TABLE IF NOT EXISTS users (
            user_id INT AUTO_INCREMENT PRIMARY KEY,
            fullname VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            mobile VARCHAR(20),
            registration_number VARCHAR(50),
            password VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `;
    
    // Create loan_application table
    const createLoanApplicationTable = `
        CREATE TABLE IF NOT EXISTS loan_application (
            loan_application_id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            loan_amount DECIMAL(15,2) NOT NULL,
            loan_term INT DEFAULT 6,
            loan_purpose TEXT,
            loan_status ENUM('pending', 'approved', 'rejected', 'disbursed', 'completed') DEFAULT 'pending',
            total_interest DECIMAL(15,2) DEFAULT 0,
            monthly_installment DECIMAL(15,2) DEFAULT 0,
            total_amount DECIMAL(15,2) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(user_id)
        )
    `;
    
    // Create loans table
    const createLoansTable = `
        CREATE TABLE IF NOT EXISTS loans (
            loan_id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            amount_disbursed DECIMAL(15,2) NOT NULL,
            loan_repayment DECIMAL(15,2) DEFAULT 0,
            total_interest DECIMAL(15,2) DEFAULT 0,
            remaining_balance DECIMAL(15,2) DEFAULT 0,
            loan_term INT DEFAULT 6,
            monthly_payment DECIMAL(15,2) DEFAULT 0,
            disbursement_date DATE,
            due_date DATE,
            next_payment_date DATE,
            payment_method ENUM('cash', 'bank_transfer', 'cheque', 'mobile') DEFAULT 'bank_transfer',
            status ENUM('active', 'completed', 'defaulted', 'partial') DEFAULT 'active',
            interest_rate DECIMAL(5,2) DEFAULT 1.00,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(user_id)
        )
    `;
    
    // Create loan_repayments table
    const createLoanRepaymentsTable = `
        CREATE TABLE IF NOT EXISTS loan_repayments (
            repayment_id INT AUTO_INCREMENT PRIMARY KEY,
            loan_id INT NOT NULL,
            user_id INT NOT NULL,
            amount DECIMAL(15,2) NOT NULL,
            payment_date DATE NOT NULL,
            payment_method ENUM('cash', 'bank_transfer', 'cheque', 'mobile', 'completion') DEFAULT 'cash',
            status ENUM('pending', 'confirmed', 'failed') DEFAULT 'confirmed',
            notes TEXT,
            installment_number INT,
            principal DECIMAL(15,2) DEFAULT 0,
            total_interest DECIMAL(15,2) DEFAULT 0,
            total_amount_paid DECIMAL(15,2) DEFAULT 0,
            loan_term VARCHAR(20),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (loan_id) REFERENCES loans(loan_id),
            FOREIGN KEY (user_id) REFERENCES users(user_id)
        )
    `;
    
    const tables = [
        { name: 'users', sql: createUsersTable },
        { name: 'loan_application', sql: createLoanApplicationTable },
        { name: 'loans', sql: createLoansTable },
        { name: 'loan_repayments', sql: createLoanRepaymentsTable }
    ];
    
    let completed = 0;
    
    tables.forEach(table => {
        setupConnection.query(table.sql, (err) => {
            if (err) {
                console.error(`❌ Failed to create ${table.name} table:`, err.message);
            } else {
                console.log(`✅ Table '${table.name}' created/verified`);
            }
            
            completed++;
            if (completed === tables.length) {
                // Test the setup
                testSetup();
            }
        });
    });
}

function testSetup() {
    console.log("🧪 Testing database setup...");
    
    // Test basic queries
    setupConnection.query("SELECT COUNT(*) as count FROM loan_application WHERE loan_status = 'approved'", (err, result) => {
        if (err) {
            console.error("❌ Test query failed:", err.message);
        } else {
            console.log("✅ Test query passed");
            console.log("📊 Approved loans found:", result[0].count);
        }
        
        setupConnection.end();
        console.log("🎉 Database setup completed successfully!");
        console.log("💡 You can now restart your backend server");
    });
}
