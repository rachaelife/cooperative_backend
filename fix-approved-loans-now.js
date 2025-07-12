const { DB } = require("./sql");

console.log("🔧 FIXING APPROVED LOANS - DIRECT SQL APPROACH");

// Step 1: Create loans table if it doesn't exist
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

DB.query(createLoansTable, (createError) => {
  if (createError) {
    console.error("❌ Error creating loans table:", createError);
    process.exit(1);
  }
  
  console.log("✅ Loans table ready");
  
  // Step 2: Get all approved loans
  DB.query("SELECT * FROM loan_application WHERE loan_status = 'approved'", (selectError, approvedLoans) => {
    if (selectError) {
      console.error("❌ Error selecting approved loans:", selectError);
      process.exit(1);
    }
    
    console.log(`📋 Found ${approvedLoans.length} approved loans to process`);
    
    if (approvedLoans.length === 0) {
      console.log("✅ No approved loans to process");
      process.exit(0);
    }
    
    let processed = 0;
    let success = 0;
    
    approvedLoans.forEach((loan) => {
      console.log(`🔄 Processing loan ${loan.loan_application_id} for user ${loan.user_id}, amount: ${loan.loan_amount}`);
      
      // Step 3: Insert into loans table
      DB.query(
        "INSERT INTO loans (user_id, amount_disbursed, loan_repayment, remaining_balance, status, disbursement_date) VALUES (?,?,?,?,?,?)",
        [
          loan.user_id,
          loan.loan_amount,
          0,
          loan.loan_amount,
          'active',
          new Date().toISOString().split('T')[0]
        ],
        (insertError, insertResult) => {
          if (insertError) {
            console.error(`❌ Error inserting loan ${loan.loan_application_id}:`, insertError);
          } else {
            console.log(`✅ Created loan entry with ID: ${insertResult.insertId}`);
            
            // Step 4: Update application status to disbursed
            DB.query(
              "UPDATE loan_application SET loan_status = 'disbursed' WHERE loan_application_id = ?",
              [loan.loan_application_id],
              (updateError) => {
                if (updateError) {
                  console.error(`❌ Error updating application ${loan.loan_application_id}:`, updateError);
                } else {
                  console.log(`✅ Updated application ${loan.loan_application_id} to disbursed`);
                  success++;
                }
              }
            );
          }
          
          processed++;
          
          // Check if all loans are processed
          if (processed === approvedLoans.length) {
            console.log(`🎉 COMPLETED: ${success}/${approvedLoans.length} loans processed successfully`);
            
            // Show final status
            DB.query("SELECT COUNT(*) as approved_count FROM loan_application WHERE loan_status = 'approved'", (countError, countResult) => {
              if (!countError) {
                console.log(`📊 Remaining approved loans: ${countResult[0].approved_count}`);
              }
              
              DB.query("SELECT COUNT(*) as disbursed_count FROM loans WHERE status = 'active'", (loanCountError, loanCountResult) => {
                if (!loanCountError) {
                  console.log(`📊 Total active loans: ${loanCountResult[0].disbursed_count}`);
                }
                
                console.log("✅ DONE! Refresh your frontend to see the changes.");
                process.exit(0);
              });
            });
          }
        }
      );
    });
  });
});
