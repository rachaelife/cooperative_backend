const { DB } = require("./sql");

console.log("🔍 Checking loan applications and disbursed loans...");

// Check approved applications
DB.query("SELECT * FROM loan_application WHERE loan_status = 'approved'", (error1, approvedApps) => {
  if (error1) {
    console.error("❌ Error checking approved apps:", error1);
    return;
  }
  
  console.log("📋 APPROVED APPLICATIONS:", approvedApps.length);
  approvedApps.forEach(app => {
    console.log(`  - ID: ${app.loan_application_id}, User: ${app.user_id}, Amount: ${app.loan_amount}, Status: ${app.loan_status}`);
  });
  
  // Check loans table
  DB.query("SELECT * FROM loans", (error2, loans) => {
    if (error2) {
      console.error("❌ Error checking loans:", error2);
      return;
    }
    
    console.log("💰 DISBURSED LOANS:", loans.length);
    loans.forEach(loan => {
      console.log(`  - ID: ${loan.loan_id}, User: ${loan.user_id}, Amount: ${loan.amount_disbursed}, Status: ${loan.status}`);
    });
    
    // If there are approved apps but no corresponding loans, fix it
    if (approvedApps.length > 0) {
      console.log("🔧 FIXING: Moving approved loans to disbursed table...");
      
      let processed = 0;
      let success = 0;
      
      approvedApps.forEach(app => {
        // Create loan entry
        DB.query(
          "INSERT INTO loans (user_id, amount_disbursed, loan_repayment, remaining_balance, status, disbursement_date) VALUES (?,?,?,?,?,?)",
          [app.user_id, app.loan_amount, 0, app.loan_amount, 'active', new Date().toISOString().split('T')[0]],
          (loanError, loanResult) => {
            if (loanError) {
              console.error(`❌ Failed to create loan for app ${app.loan_application_id}:`, loanError.message);
            } else {
              console.log(`✅ Created loan ${loanResult.insertId} for app ${app.loan_application_id}`);
              
              // Update application status to disbursed
              DB.query(
                "UPDATE loan_application SET loan_status = 'disbursed' WHERE loan_application_id = ?",
                [app.loan_application_id],
                (updateError) => {
                  if (updateError) {
                    console.error(`❌ Failed to update app ${app.loan_application_id}:`, updateError.message);
                  } else {
                    console.log(`✅ Updated app ${app.loan_application_id} to disbursed`);
                    success++;
                  }
                }
              );
            }
            
            processed++;
            if (processed === approvedApps.length) {
              console.log(`🎉 COMPLETED: ${success}/${approvedApps.length} loans processed successfully`);
              
              // Show final results
              DB.query("SELECT * FROM loans", (error3, finalLoans) => {
                console.log("💰 FINAL DISBURSED LOANS:", finalLoans.length);
                finalLoans.forEach(loan => {
                  console.log(`  - ID: ${loan.loan_id}, User: ${loan.user_id}, Amount: ${loan.amount_disbursed}`);
                });
                process.exit(0);
              });
            }
          }
        );
      });
    } else {
      console.log("ℹ️ No approved applications found to process");
      process.exit(0);
    }
  });
});
