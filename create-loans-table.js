const { DB } = require("./sql");

console.log("🔧 Creating loans table...");

const createLoansTable = `
CREATE TABLE IF NOT EXISTS loans (
  loan_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  amount_disbursed DECIMAL(15,2) NOT NULL,
  loan_repayment DECIMAL(15,2) DEFAULT 0,
  remaining_balance DECIMAL(15,2) DEFAULT 0,
  status ENUM('active', 'completed', 'defaulted') DEFAULT 'active',
  disbursement_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
`;

DB.query(createLoansTable, (error) => {
  if (error) {
    console.error("❌ Error creating loans table:", error);
  } else {
    console.log("✅ Loans table created successfully");
  }
  
  // Test the table
  DB.query("DESCRIBE loans", (descError, result) => {
    if (descError) {
      console.error("❌ Error describing table:", descError);
    } else {
      console.log("✅ Loans table structure:");
      result.forEach(col => {
        console.log(`  - ${col.Field}: ${col.Type}`);
      });
    }
    process.exit(0);
  });
});
