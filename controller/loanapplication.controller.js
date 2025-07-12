const { validationResult } = require("express-validator");
const { DB } = require("../sql");

require("dotenv").config();

// Helper function to calculate next payment date (30 days from now)
function getNextPaymentDate() {
  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + 30);
  return nextDate.toISOString().split('T')[0];
}

module.exports.createnewloan_application = (req, res) => {
  const errorResponse = validationResult(req);

  const { user_id, loan_amount, loan_term, loan_purpose, loan_status } = req.body;

  console.log("📝 Creating new loan application for user:", user_id);

  // Calculate installment amount with 1% added to each payment
  const baseInstallment = parseFloat(loan_amount) / parseInt(loan_term); // Divide loan equally
  const installmentWithInterest = baseInstallment * 1.01; // Add 1% to each installment
  const totalAmount = installmentWithInterest * parseInt(loan_term);
  const totalInterest = totalAmount - parseFloat(loan_amount);

  try {
    if (!errorResponse.isEmpty()) {
      return res.status(400).json({ message: errorResponse.errors[0].msg });
    }

    // Check if user already has pending or approved loan
    DB.query(
      "SELECT * FROM loan_application WHERE user_id = ? AND loan_status IN (?,?,?)",
      [user_id, "approved", "pending", "disbursed"],
      (checkError, existingLoans) => {
        if (checkError) {
          console.error("❌ Error checking existing loans:", checkError);
          return res.status(500).json({ message: checkError.message ?? "Something went wrong" });
        }

        if (existingLoans.length > 0) {
          return res.status(400).json({ message: "You already have a pending or active loan" });
        }

        // Create the loan application - try with calculated columns first, fallback to basic columns
        console.log("💰 Calculated values:", {
          baseInstallment: baseInstallment.toFixed(2),
          installmentWithInterest: installmentWithInterest.toFixed(2),
          totalInterest: totalInterest.toFixed(2),
          totalAmount: totalAmount.toFixed(2)
        });

        DB.query(
          "INSERT INTO loan_application(user_id, loan_amount, loan_term, loan_purpose, loan_status, monthly_installment, total_interest, total_amount) VALUES (?,?,?,?,?,?,?,?)",
          [
            user_id,
            loan_amount,
            loan_term,
            loan_purpose,
            loan_status || 'pending',
            installmentWithInterest.toFixed(2),
            totalInterest.toFixed(2),
            totalAmount.toFixed(2)
          ],
          (insertError, result) => {
            if (insertError && insertError.code === 'ER_BAD_FIELD_ERROR') {
              console.log("⚠️ Calculated columns don't exist, trying basic insert...");
              console.log("Column error:", insertError.message);

              // Fallback to basic columns only
              DB.query(
                "INSERT INTO loan_application(user_id, loan_amount, loan_term, loan_purpose, loan_status) VALUES (?,?,?,?,?)",
                [
                  user_id,
                  loan_amount,
                  loan_term,
                  loan_purpose,
                  loan_status || 'pending'
                ],
                (fallbackError, fallbackResult) => {
                  if (fallbackError) {
                    console.error("❌ Fallback insert also failed:", fallbackError);
                    return res.status(500).json({ message: fallbackError.message ?? "Something went wrong" });
                  }

                  console.log("✅ Loan application created successfully (basic) with ID:", fallbackResult.insertId);
                  return res.status(200).json({
                    message: "Loan application submitted successfully",
                    loanDetails: {
                      applicationId: fallbackResult.insertId,
                      loanAmount: loan_amount,
                      loanTerm: loan_term,
                      installmentAmount: installmentWithInterest.toFixed(2),
                      totalInterest: totalInterest.toFixed(2),
                      totalAmount: totalAmount.toFixed(2),
                      note: "Calculated values not stored in database (missing columns)"
                    }
                  });
                }
              );
            } else if (insertError) {
              console.error("❌ Error creating loan application:", insertError);
              return res.status(500).json({ message: insertError.message ?? "Something went wrong" });
            } else {
              console.log("✅ Loan application created successfully (full) with ID:", result.insertId);
              return res.status(200).json({
                message: "Loan application submitted successfully",
                loanDetails: {
                  applicationId: result.insertId,
                  loanAmount: loan_amount,
                  loanTerm: loan_term,
                  installmentAmount: installmentWithInterest.toFixed(2),
                  totalInterest: totalInterest.toFixed(2),
                  totalAmount: totalAmount.toFixed(2)
                }
              });
            }
          }
        );
      }
    );
  } catch (error) {
    console.error('❌ Error in loan application:', error);
    res.status(500).json({ message: error.message ?? "Something went wrong" });
  }
};

module.exports.updateloan_applicationstatus = (req, res) => {
  const { loan_application_id } = req.params;
  const { loan_status } = req.body;

  console.log("🚀 UPDATING LOAN:", loan_application_id, "to", loan_status);
  console.log("📋 Status type:", typeof loan_status);
  console.log("📋 Status value:", JSON.stringify(loan_status));

  // Update the status first
  DB.query(
    "UPDATE loan_application SET loan_status = ? WHERE loan_application_id = ?",
    [loan_status, loan_application_id],
    (error, result) => {
      if (error) {
        console.error("❌ Update error:", error);
        return res.status(500).json({ message: "Update failed" });
      }

      console.log("✅ Status updated successfully");
      console.log("📊 Affected rows:", result.affectedRows);

      // Check if disbursement should trigger
      console.log("🔍 Checking if disbursement should trigger...");
      console.log("📋 loan_status === 'approved':", loan_status === 'approved');
      console.log("📋 loan_status.toLowerCase() === 'approved':", loan_status?.toLowerCase() === 'approved');

      // If approved, immediately create loan and update to disbursed
      if (loan_status === 'approved' || loan_status?.toLowerCase() === 'approved') {
        console.log("🔄 ✅ DISBURSEMENT TRIGGERED! Creating loan...");

        // Get application details
        DB.query(
          "SELECT * FROM loan_application WHERE loan_application_id = ?",
          [loan_application_id],
          (appError, apps) => {
            if (appError || apps.length === 0) {
              console.error("❌ App fetch error:", appError);
              return res.status(200).json({ message: "Status updated" });
            }

            const app = apps[0];
            console.log("📋 Found app for user:", app.user_id, "amount:", app.loan_amount);

            // First check if loans table exists
            DB.query("SHOW TABLES LIKE 'loans'", (tableError, tableResult) => {
              if (tableError) {
                console.error("❌ Error checking loans table:", tableError);
                return res.status(200).json({ message: "Status updated but table check failed" });
              }

              if (tableResult.length === 0) {
                console.log("🔧 Loans table doesn't exist, creating it...");

                const createTableSQL = `
                  CREATE TABLE loans (
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

                DB.query(createTableSQL, (createError) => {
                  if (createError) {
                    console.error("❌ Error creating loans table:", createError);
                    return res.status(200).json({ message: "Status updated but failed to create loans table" });
                  }

                  console.log("✅ Loans table created successfully");
                  createLoanEntry();
                });
              } else {
                console.log("✅ Loans table exists");
                createLoanEntry();
              }
            });

            function createLoanEntry() {
              // Create loan entry
              console.log("💰 Creating loan entry for user:", app.user_id, "amount:", app.loan_amount);
              DB.query(
                "INSERT INTO loans (user_id, amount_disbursed, loan_repayment, remaining_balance, status, disbursement_date) VALUES (?,?,?,?,?,?)",
                [app.user_id, app.loan_amount, 0, app.loan_amount, 'active', new Date().toISOString().split('T')[0]],
                (loanError, loanResult) => {
                  if (loanError) {
                    console.error("❌ Loan creation error:", loanError);
                    console.error("❌ SQL Error details:", loanError.sqlMessage);
                    return res.status(200).json({ message: "Status updated but loan creation failed: " + loanError.message });
                  }

                  console.log("✅ Loan created with ID:", loanResult.insertId);

                  // Update to disbursed
                  console.log("🔄 Updating application status to 'disbursed'...");
                  DB.query(
                    "UPDATE loan_application SET loan_status = 'disbursed' WHERE loan_application_id = ?",
                    [loan_application_id],
                    (disbursedError, disbursedResult) => {
                      if (disbursedError) {
                        console.error("❌ Disbursed update error:", disbursedError);
                        console.error("❌ SQL Error details:", disbursedError.sqlMessage);
                      } else {
                        console.log("✅ Status updated to DISBURSED");
                        console.log("✅ Affected rows:", disbursedResult.affectedRows);
                      }

                      return res.status(200).json({
                        message: "Loan approved and disbursed successfully",
                        loan_id: loanResult.insertId,
                        application_id: loan_application_id,
                        status: "disbursed"
                      });
                    }
                  );
                }
              );
            }
          }
        );
      } else {
        // Not approved, just return success
        return res.status(200).json({ message: "Status updated successfully" });
      }
    }
  );
};

module.exports.getAllapplication = (req, res) => {
  console.log("📋 Fetching all loan applications...");

  try {
    // Enhanced query to explicitly include all loan application fields
    console.log("🔍 Fetching loan applications with user details...");
    DB.query(
      `SELECT
        loan_application.loan_application_id,
        loan_application.user_id,
        loan_application.loan_amount,
        loan_application.loan_term,
        loan_application.loan_purpose,
        loan_application.loan_status,
        loan_application.monthly_installment,
        loan_application.total_interest,
        loan_application.total_amount,
        users.fullname AS fullname,
        users.mobile AS mobile,
        users.email AS email
       FROM loan_application
       JOIN users ON users.user_id = loan_application.user_id
       ORDER BY loan_application.loan_application_id DESC`,
      (error, applications) => {
        if (error) {
          console.error("❌ Error fetching loan applications:", error);
          console.error("❌ Query error details:", {
            code: error.code,
            errno: error.errno,
            sqlMessage: error.sqlMessage
          });

          // If JOIN fails or columns missing, try to get user details separately
          if (error.code === 'ER_NO_SUCH_TABLE' || error.sqlMessage?.includes('users') || error.code === 'ER_BAD_FIELD_ERROR') {
            console.log("⚠️ JOIN query failed, trying to get applications and user details separately...");
            console.log("⚠️ JOIN error:", error.message);

            // First get loan applications
            DB.query(
              "SELECT * FROM loan_application ORDER BY loan_application_id DESC",
              (fallbackError, fallbackApplications) => {
                if (fallbackError) {
                  console.error("❌ Fallback query also failed:", fallbackError);
                  return res.status(500).json({ message: fallbackError.message ?? "Something went wrong" });
                }

                console.log("✅ Loan applications query successful");
                console.log("📊 Applications found:", fallbackApplications.length);

                if (fallbackApplications.length === 0) {
                  return res.status(200).json({ message: [] });
                }

                // Now try to get user details for each application
                console.log("🔍 Attempting to get user details for applications...");

                let processedCount = 0;
                const applicationsWithUsers = [];

                fallbackApplications.forEach((application, index) => {
                  DB.query(
                    "SELECT fullname, email, mobile FROM users WHERE user_id = ?",
                    [application.user_id],
                    (userError, userResult) => {
                      if (userError) {
                        console.log(`⚠️ Could not get user details for user_id ${application.user_id}:`, userError.message);
                        // Add application without user details
                        applicationsWithUsers[index] = {
                          ...application,
                          fullname: 'N/A',
                          email: 'N/A',
                          mobile: 'N/A'
                        };
                      } else if (userResult.length > 0) {
                        // Add application with user details
                        applicationsWithUsers[index] = {
                          ...application,
                          fullname: userResult[0].fullname,
                          email: userResult[0].email,
                          mobile: userResult[0].mobile
                        };
                      } else {
                        console.log(`⚠️ No user found for user_id ${application.user_id}`);
                        // Add application without user details
                        applicationsWithUsers[index] = {
                          ...application,
                          fullname: 'User Not Found',
                          email: 'N/A',
                          mobile: 'N/A'
                        };
                      }

                      processedCount++;

                      // When all applications are processed, return the result
                      if (processedCount === fallbackApplications.length) {
                        console.log("✅ All user details processed");

                        // Log sample data
                        if (applicationsWithUsers.length > 0) {
                          console.log("📋 Sample application with user data:", {
                            loan_application_id: applicationsWithUsers[0].loan_application_id,
                            user_id: applicationsWithUsers[0].user_id,
                            loan_amount: applicationsWithUsers[0].loan_amount,
                            loan_term: applicationsWithUsers[0].loan_term,
                            loan_purpose: applicationsWithUsers[0].loan_purpose,
                            loan_status: applicationsWithUsers[0].loan_status,
                            fullname: applicationsWithUsers[0].fullname,
                            email: applicationsWithUsers[0].email,
                            mobile: applicationsWithUsers[0].mobile
                          });
                        }

                        res.status(200).json({ message: applicationsWithUsers });
                      }
                    }
                  );
                });
              }
            );
          } else {
            res.status(500).json({ message: error.message ?? "Something went wrong" });
          }
        } else {
          console.log("✅ Query with user details successful");
          console.log("📊 Applications found:", applications.length);

          // Log sample data to verify loan_amount is included
          if (applications.length > 0) {
            console.log("📋 Sample application data:", {
              loan_application_id: applications[0].loan_application_id,
              user_id: applications[0].user_id,
              loan_amount: applications[0].loan_amount,
              loan_term: applications[0].loan_term,
              loan_purpose: applications[0].loan_purpose,
              loan_status: applications[0].loan_status,
              fullname: applications[0].fullname
            });
          }

          res.status(200).json({ message: applications });
        }
      }
    );
  } catch (error) {
    console.error("❌ Error fetching loan applications:", error);
    res.status(500).json({ message: error.message ?? "Something went wrong" });
  }
};

module.exports.deleteapplication = (req, res) => {
  const { loan_application_id } = req.params;

  console.log("🗑️ Deleting loan application with ID:", loan_application_id);

  try {
    if (!loan_application_id) {
      return res.status(400).json({ message: "loan_application ID is required" });
    }

    DB.query(
      "DELETE FROM loan_application WHERE loan_application_id = ?",
      [loan_application_id],
      (error, result) => {
        if (error) {
          console.error("❌ Error deleting loan application:", error);
          return res.status(500).json({ message: error.message ?? "Something went wrong" });
        }

        if (result.affectedRows === 0) {
          return res.status(404).json({ message: "Loan application not found" });
        }

        console.log("✅ Loan application deleted successfully");
        res.status(200).json({ message: "loan_application deleted successfully" });
      }
    );
  } catch (error) {
    console.error("❌ Error deleting loan application:", error);
    res.status(500).json({ message: error.message ?? "Something went wrong" });
  }
};

// Helper function to create loan repayment schedule when loan is approved
function createLoanRepaymentSchedule(loan_application_id, callback) {
  console.log("📅 Creating repayment schedule for loan application:", loan_application_id);

  // First get loan application details
  DB.query(
    "SELECT * FROM loan_application WHERE loan_application_id = ?",
    [loan_application_id],
    (error, applications) => {
      if (error) {
        console.error("❌ Error fetching loan application:", error);
        return callback(error);
      }

      if (applications.length === 0) {
        console.error("❌ Loan application not found:", loan_application_id);
        return callback(new Error("Loan application not found"));
      }

      const application = applications[0];
      console.log("📋 Loan details:", {
        user_id: application.user_id,
        loan_amount: application.loan_amount,
        loan_term: application.loan_term
      });

      // Calculate installment amount with 1% added
      const baseInstallment = parseFloat(application.loan_amount) / parseInt(application.loan_term);
      const installmentWithInterest = baseInstallment * 1.01; // Add 1% to each installment

      console.log("💰 Installment calculation:", {
        baseInstallment: baseInstallment.toFixed(2),
        installmentWithInterest: installmentWithInterest.toFixed(2)
      });

      // Create repayment records for each installment
      const repayments = [];
      const currentDate = new Date();

      for (let i = 1; i <= parseInt(application.loan_term); i++) {
        const dueDate = new Date(currentDate);
        dueDate.setMonth(dueDate.getMonth() + i); // Each installment due monthly

        repayments.push([
          loan_application_id,
          application.user_id,
          i, // installment_number
          installmentWithInterest.toFixed(2), // amount_due
          0.00, // amount_paid (initially 0)
          dueDate.toISOString().split('T')[0], // due_date (YYYY-MM-DD format)
          null, // payment_date (null initially)
          'pending' // status
        ]);
      }

      console.log(`📊 Creating ${repayments.length} repayment records...`);

      // Insert all repayment records
      DB.query(
        "INSERT INTO loan_repayments (loan_application_id, user_id, installment_number, amount_due, amount_paid, due_date, payment_date, status) VALUES ?",
        [repayments],
        (insertError, result) => {
          if (insertError) {
            console.error("❌ Error creating repayment schedule:", insertError);
            // If table doesn't exist, try to create it first
            if (insertError.code === 'ER_NO_SUCH_TABLE') {
              console.log("⚠️ loan_repayments table doesn't exist, creating it...");
              createLoanRepaymentsTable((tableError) => {
                if (tableError) {
                  return callback(tableError);
                } else {
                  // Retry the insert after creating table
                  DB.query(
                    "INSERT INTO loan_repayments (loan_application_id, user_id, installment_number, amount_due, amount_paid, due_date, payment_date, status) VALUES ?",
                    [repayments],
                    (retryError, retryResult) => {
                      if (retryError) {
                        return callback(retryError);
                      } else {
                        console.log("✅ Repayment schedule created successfully after table creation");
                        return callback(null);
                      }
                    }
                  );
                }
              });
            } else {
              return callback(insertError);
            }
          } else {
            console.log("✅ Repayment schedule created successfully");
            console.log(`📊 ${result.affectedRows} repayment records created`);
            return callback(null);
          }
        }
      );
    }
  );
}

// Helper function to create loan_repayments table if it doesn't exist
function createLoanRepaymentsTable(callback) {
  console.log("🔧 Creating loan_repayments table...");

  const createTableSQL = `
    CREATE TABLE loan_repayments (
      repayment_id INT AUTO_INCREMENT PRIMARY KEY,
      loan_application_id INT NOT NULL,
      user_id INT NOT NULL,
      installment_number INT NOT NULL,
      amount_due DECIMAL(15,2) NOT NULL,
      amount_paid DECIMAL(15,2) DEFAULT 0.00,
      due_date DATE NOT NULL,
      payment_date DATE NULL,
      status ENUM('pending', 'paid', 'overdue') DEFAULT 'pending',
      payment_method VARCHAR(50) NULL,
      notes TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_loan_application (loan_application_id),
      INDEX idx_user_id (user_id),
      INDEX idx_status (status),
      INDEX idx_due_date (due_date),
      UNIQUE KEY unique_loan_installment (loan_application_id, installment_number)
    )
  `;

  DB.query(createTableSQL, (error) => {
    if (error) {
      console.error("❌ Error creating loan_repayments table:", error);
      return callback(error);
    } else {
      console.log("✅ loan_repayments table created successfully");
      return callback(null);
    }
  });
}

// Helper function to calculate due date (final repayment date)
function getDueDate(loanTermMonths = 6) {
  const dueDate = new Date();
  dueDate.setMonth(dueDate.getMonth() + loanTermMonths);
  return dueDate.toISOString().split('T')[0];
}

// Helper function to calculate next payment date (30 days from now)
function getNextPaymentDate() {
  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + 30);
  return nextDate.toISOString().split('T')[0];
}

// Force disbursement for testing
module.exports.forceDisburse = (req, res) => {
  const { loan_application_id } = req.params;

  console.log("🚀 FORCE DISBURSEMENT for application:", loan_application_id);

  // Get the application
  DB.query(
    "SELECT * FROM loan_application WHERE loan_application_id = ?",
    [loan_application_id],
    (error, applications) => {
      if (error || applications.length === 0) {
        console.error("❌ Application not found:", error);
        return res.status(404).json({ message: "Application not found" });
      }

      const app = applications[0];
      console.log("📋 Found application:", app);

      // Create loan entry
      DB.query(
        "INSERT INTO loans (user_id, amount_disbursed, loan_repayment, remaining_balance, status, disbursement_date) VALUES (?,?,?,?,?,?)",
        [app.user_id, app.loan_amount, 0, app.loan_amount, 'active', new Date().toISOString().split('T')[0]],
        (loanError, loanResult) => {
          if (loanError) {
            console.error("❌ Error creating loan:", loanError);
            return res.status(500).json({ message: "Failed to create loan", error: loanError.message });
          }

          console.log("✅ Loan created with ID:", loanResult.insertId);

          // Update status to disbursed
          DB.query(
            "UPDATE loan_application SET loan_status = 'disbursed' WHERE loan_application_id = ?",
            [loan_application_id],
            (updateError) => {
              if (updateError) {
                console.error("❌ Error updating status:", updateError);
              } else {
                console.log("✅ Status updated to disbursed");
              }

              res.status(200).json({
                message: "Force disbursement completed",
                loan_id: loanResult.insertId,
                application_id: loan_application_id
              });
            }
          );
        }
      );
    }
  );
};

// Manual disbursement for specific application
module.exports.manualDisburse = (req, res) => {
  const { loan_application_id } = req.params;

  console.log("🔧 Manual disbursement requested for application:", loan_application_id);

  try {
    // First check if loans table exists and get its structure
    DB.query("DESCRIBE loans", (descError, tableStructure) => {
      if (descError) {
        console.error("❌ Loans table doesn't exist or can't be accessed:", descError);
        return res.status(500).json({
          message: "Loans table error",
          error: descError.message,
          suggestion: "Run database setup script"
        });
      }

      console.log("✅ Loans table structure:", tableStructure.map(col => col.Field));

      // Get the application
      DB.query(
        "SELECT * FROM loan_application WHERE loan_application_id = ?",
        [loan_application_id],
        (error, applications) => {
          if (error) {
            console.error("❌ Error fetching application:", error);
            return res.status(500).json({ message: error.message });
          }

          if (applications.length === 0) {
            console.log("❌ Application not found with ID:", loan_application_id);
            return res.status(404).json({ message: "Application not found" });
          }

          const application = applications[0];
          console.log("📋 Found application:", {
            id: application.loan_application_id,
            user_id: application.user_id,
            amount: application.loan_amount,
            status: application.loan_status
          });

          if (application.loan_status !== 'approved') {
            return res.status(400).json({
              message: `Application status is '${application.loan_status}', not 'approved'`
            });
          }

          // Create loan entry with minimal required fields
          const disbursementDate = new Date().toISOString().split('T')[0];

          console.log("💰 Creating loan with data:", {
            user_id: application.user_id,
            amount_disbursed: application.loan_amount,
            disbursement_date: disbursementDate
          });

          DB.query(
            "INSERT INTO loans (user_id, amount_disbursed, loan_repayment, remaining_balance, status, disbursement_date) VALUES (?,?,?,?,?,?)",
            [
              application.user_id,
              application.loan_amount,
              0,
              application.loan_amount,
              'active',
              disbursementDate
            ],
            (loanError, loanResult) => {
              if (loanError) {
                console.error("❌ Error creating loan:", loanError);
                console.error("❌ SQL Error:", loanError.sqlMessage);
                return res.status(500).json({
                  message: "Failed to create loan",
                  error: loanError.sqlMessage || loanError.message
                });
              }

              console.log("✅ Loan created with ID:", loanResult.insertId);

              // Update application status to disbursed
              DB.query(
                "UPDATE loan_application SET loan_status = 'disbursed' WHERE loan_application_id = ?",
                [loan_application_id],
                (updateError) => {
                  if (updateError) {
                    console.error("❌ Error updating status:", updateError);
                    return res.status(500).json({
                      message: "Loan created but failed to update application status",
                      loan_id: loanResult.insertId,
                      error: updateError.message
                    });
                  }

                  console.log("✅ Application status updated to disbursed");

                  res.status(200).json({
                    success: true,
                    message: "Manual disbursement completed successfully",
                    loan_id: loanResult.insertId,
                    application_id: loan_application_id,
                    amount: application.loan_amount
                  });
                }
              );
            }
          );
        }
      );
    });
  } catch (error) {
    console.error("❌ Unexpected error in manualDisburse:", error);
    return res.status(500).json({
      message: "Unexpected error occurred",
      error: error.message
    });
  }
};

// Simple test function to check database connection
module.exports.testConnection = (req, res) => {
  console.log("🔍 Testing database connection...");

  try {
    // Test basic query
    DB.query("SELECT 1 as test", (error, result) => {
      if (error) {
        console.error("❌ Database connection failed:", error);
        return res.status(500).json({ message: "Database connection failed", error: error.message });
      }

      console.log("✅ Database connection successful");

      // Test loan_application table
      DB.query("SELECT COUNT(*) as count FROM loan_application WHERE loan_status = 'approved'", (error2, result2) => {
        if (error2) {
          console.error("❌ loan_application table query failed:", error2);
          return res.status(500).json({ message: "loan_application table error", error: error2.message });
        }

        console.log("✅ loan_application table accessible, approved count:", result2[0].count);

        // Test loans table
        DB.query("DESCRIBE loans", (error3, result3) => {
          if (error3) {
            console.error("❌ loans table structure check failed:", error3);
            return res.status(500).json({ message: "loans table error", error: error3.message });
          }

          console.log("✅ loans table structure:", result3.map(col => col.Field));

          return res.status(200).json({
            message: "Database tests passed",
            approved_applications: result2[0].count,
            loans_table_columns: result3.map(col => col.Field)
          });
        });
      });
    });
  } catch (error) {
    console.error("❌ Unexpected error in testConnection:", error);
    return res.status(500).json({ message: "Unexpected error", error: error.message });
  }
};

// Simple debug function to check what's happening
module.exports.debugApproval = (req, res) => {
  const { loan_application_id } = req.params;

  console.log("🔍 DEBUG: Checking application:", loan_application_id);

  // Get application details
  DB.query(
    "SELECT * FROM loan_application WHERE loan_application_id = ?",
    [loan_application_id],
    (error, applications) => {
      if (error) {
        console.error("❌ Error fetching application:", error);
        return res.status(500).json({ message: error.message });
      }

      if (applications.length === 0) {
        return res.status(404).json({ message: "Application not found" });
      }

      const app = applications[0];
      console.log("📋 Application found:", app);

      // Check if loans table exists
      DB.query("SHOW TABLES LIKE 'loans'", (tableError, tableResult) => {
        console.log("📋 Loans table check:", tableResult);

        // Try to create a simple loan entry
        if (app.loan_status === 'approved') {
          console.log("🚀 Attempting to create loan entry...");

          DB.query(
            "INSERT INTO loans (user_id, amount_disbursed, status, disbursement_date) VALUES (?,?,?,?)",
            [app.user_id, app.loan_amount, 'active', new Date().toISOString().split('T')[0]],
            (loanError, loanResult) => {
              if (loanError) {
                console.error("❌ Error creating loan:", loanError);
                return res.status(500).json({
                  message: "Failed to create loan",
                  error: loanError.message,
                  application: app
                });
              }

              console.log("✅ Loan created successfully:", loanResult.insertId);

              // Update status to disbursed
              DB.query(
                "UPDATE loan_application SET loan_status = 'disbursed' WHERE loan_application_id = ?",
                [loan_application_id],
                (updateError) => {
                  if (updateError) {
                    console.error("❌ Error updating status:", updateError);
                  } else {
                    console.log("✅ Status updated to disbursed");
                  }

                  res.status(200).json({
                    message: "Debug disbursement completed",
                    loan_id: loanResult.insertId,
                    application: app
                  });
                }
              );
            }
          );
        } else {
          res.status(200).json({
            message: "Application status is not approved",
            application: app,
            loans_table_exists: tableResult.length > 0
          });
        }
      });
    }
  );
};

// Check loan status - shows what's in both tables
module.exports.checkLoanStatus = (req, res) => {
  console.log("🔍 Checking loan status...");

  // Get approved applications
  DB.query("SELECT * FROM loan_application WHERE loan_status = 'approved'", (error1, approvedApps) => {
    if (error1) {
      return res.status(500).json({ message: "Error checking approved apps", error: error1.message });
    }

    // Get disbursed loans
    DB.query("SELECT * FROM loans", (error2, loans) => {
      if (error2) {
        return res.status(500).json({ message: "Error checking loans", error: error2.message });
      }

      // Get all applications
      DB.query("SELECT * FROM loan_application", (error3, allApps) => {
        if (error3) {
          return res.status(500).json({ message: "Error checking all apps", error: error3.message });
        }

        return res.status(200).json({
          approved_applications: approvedApps.length,
          approved_details: approvedApps,
          disbursed_loans: loans.length,
          disbursed_details: loans,
          all_applications: allApps.length,
          all_applications_details: allApps
        });
      });
    });
  });
};

// Direct disbursement - moves all approved loans immediately
module.exports.directDisburse = (req, res) => {
  console.log("🚀 DIRECT DISBURSEMENT STARTED");

  // Get all approved loans
  DB.query(
    "SELECT * FROM loan_application WHERE loan_status = 'approved'",
    (error, applications) => {
      if (error) {
        console.error("❌ Error:", error);
        return res.status(500).json({ message: "Database error" });
      }

      console.log("📋 Found approved applications:", applications.length);

      if (applications.length === 0) {
        return res.status(200).json({ message: "No approved loans found", count: 0 });
      }

      let processed = 0;
      let success = 0;

      applications.forEach((app) => {
        // Create loan entry
        DB.query(
          "INSERT INTO loans (user_id, amount_disbursed, loan_repayment, remaining_balance, status, disbursement_date) VALUES (?,?,?,?,?,?)",
          [app.user_id, app.loan_amount, 0, app.loan_amount, 'active', new Date().toISOString().split('T')[0]],
          (loanError, loanResult) => {
            if (!loanError) {
              console.log("✅ Loan created:", loanResult.insertId);

              // Update status to disbursed
              DB.query(
                "UPDATE loan_application SET loan_status = 'disbursed' WHERE loan_application_id = ?",
                [app.loan_application_id],
                (updateError) => {
                  if (!updateError) {
                    console.log("✅ Status updated for:", app.loan_application_id);
                    success++;
                  }
                }
              );
            }

            processed++;
            if (processed === applications.length) {
              return res.status(200).json({
                message: "Direct disbursement completed",
                total: applications.length,
                success: success
              });
            }
          }
        );
      });
    }
  );
};

// Approve loan endpoint - handles approval and disbursement
module.exports.approveLoan = (req, res) => {
  const { loanId } = req.params;

  console.log("🚀 === LOAN APPROVAL PROCESS STARTED ===");
  console.log("📋 Loan Application ID:", loanId);

  // Step 1: Find the loan application
  DB.query(
    "SELECT * FROM loan_application WHERE loan_application_id = ?",
    [loanId],
    (findError, applications) => {
      if (findError) {
        console.error("❌ Error finding loan application:", findError);
        return res.status(500).json({
          success: false,
          message: "Database error while finding loan application",
          error: findError.message
        });
      }

      if (applications.length === 0) {
        console.log("❌ Loan application not found");
        return res.status(404).json({
          success: false,
          message: "Loan application not found"
        });
      }

      const application = applications[0];
      console.log("✅ Found loan application:", {
        id: application.loan_application_id,
        user_id: application.user_id,
        amount: application.loan_amount,
        current_status: application.loan_status
      });

      // Step 2: Check if loan is already approved or disbursed
      if (application.loan_status === 'approved' || application.loan_status === 'disbursed') {
        console.log("⚠️ Loan already processed, status:", application.loan_status);
        return res.status(400).json({
          success: false,
          message: `Loan is already ${application.loan_status}`
        });
      }

      // Step 3: Update loan status to approved
      console.log("🔄 Updating loan status to approved...");
      DB.query(
        "UPDATE loan_application SET loan_status = 'approved' WHERE loan_application_id = ?",
        [loanId],
        (updateError, updateResult) => {
          if (updateError) {
            console.error("❌ Error updating loan status:", updateError);
            return res.status(500).json({
              success: false,
              message: "Failed to update loan status",
              error: updateError.message
            });
          }

          console.log("✅ Loan status updated to approved");
          console.log("📊 Update affected rows:", updateResult.affectedRows);

          // Step 4: Create entry in disbursed loans table
          console.log("💰 Creating disbursed loan entry...");

          const disbursementDate = new Date().toISOString().split('T')[0];

          DB.query(
            "INSERT INTO loans (user_id, amount_disbursed, loan_repayment, remaining_balance, status, disbursement_date) VALUES (?,?,?,?,?,?)",
            [
              application.user_id,
              application.loan_amount,
              0, // Initial repayment is 0
              application.loan_amount, // Remaining balance equals loan amount initially
              'active',
              disbursementDate
            ],
            (loanError, loanResult) => {
              if (loanError) {
                console.error("❌ Error creating disbursed loan:", loanError);

                // Rollback: Update status back to pending
                DB.query(
                  "UPDATE loan_application SET loan_status = 'pending' WHERE loan_application_id = ?",
                  [loanId],
                  (rollbackError) => {
                    if (rollbackError) {
                      console.error("❌ Rollback failed:", rollbackError);
                    } else {
                      console.log("🔄 Rolled back loan status to pending");
                    }
                  }
                );

                return res.status(500).json({
                  success: false,
                  message: "Failed to create disbursed loan entry",
                  error: loanError.message
                });
              }

              console.log("✅ Disbursed loan created with ID:", loanResult.insertId);

              // Step 5: Update loan application status to disbursed
              console.log("🔄 Updating loan application status to disbursed...");
              DB.query(
                "UPDATE loan_application SET loan_status = 'disbursed' WHERE loan_application_id = ?",
                [loanId],
                (disbursedError, disbursedResult) => {
                  if (disbursedError) {
                    console.error("❌ Error updating to disbursed status:", disbursedError);
                    // Note: Loan entry was created, so we don't rollback completely
                    return res.status(200).json({
                      success: true,
                      message: "Loan approved and disbursed, but status update had issues",
                      loan_id: loanResult.insertId,
                      application_id: loanId,
                      warning: "Status update to 'disbursed' failed"
                    });
                  }

                  console.log("✅ Loan application status updated to disbursed");
                  console.log("📊 Disbursed update affected rows:", disbursedResult.affectedRows);
                  console.log("🎉 === LOAN APPROVAL PROCESS COMPLETED ===");

                  // Step 6: Return success response
                  return res.status(200).json({
                    success: true,
                    message: "Loan approved and disbursed successfully",
                    data: {
                      loan_id: loanResult.insertId,
                      application_id: loanId,
                      user_id: application.user_id,
                      amount_disbursed: application.loan_amount,
                      disbursement_date: disbursementDate,
                      status: "disbursed"
                    }
                  });
                }
              );
            }
          );
        }
      );
    }
  );
};

// Force process approved loans
module.exports.forceProcessApproved = (req, res) => {
  console.log("🔧 FORCE PROCESSING APPROVED LOANS");

  // Get all approved loans
  DB.query(
    "SELECT * FROM loan_application WHERE loan_status = 'approved'",
    (error, applications) => {
      if (error) {
        console.error("❌ Error:", error);
        return res.status(500).json({ message: "Database error" });
      }

      console.log("📋 Found approved applications:", applications.length);

      if (applications.length === 0) {
        return res.status(200).json({ message: "No approved loans found", count: 0 });
      }

      let processed = 0;
      let success = 0;

      applications.forEach((app) => {
        console.log(`🔄 Processing application ${app.loan_application_id} for user ${app.user_id}`);

        // Create loan entry
        DB.query(
          "INSERT INTO loans (user_id, amount_disbursed, loan_repayment, remaining_balance, status, disbursement_date) VALUES (?,?,?,?,?,?)",
          [app.user_id, app.loan_amount, 0, app.loan_amount, 'active', new Date().toISOString().split('T')[0]],
          (loanError, loanResult) => {
            if (!loanError) {
              console.log("✅ Loan created:", loanResult.insertId);

              // Update status to disbursed
              DB.query(
                "UPDATE loan_application SET loan_status = 'disbursed' WHERE loan_application_id = ?",
                [app.loan_application_id],
                (updateError) => {
                  if (!updateError) {
                    console.log("✅ Status updated to disbursed for:", app.loan_application_id);
                    success++;
                  } else {
                    console.error("❌ Failed to update status:", updateError);
                  }
                }
              );
            } else {
              console.error("❌ Failed to create loan:", loanError);
            }

            processed++;
            if (processed === applications.length) {
              return res.status(200).json({
                message: "Force processing completed",
                total: applications.length,
                success: success
              });
            }
          }
        );
      });
    }
  );
};

// IMMEDIATE FIX - Move all approved loans to disbursed
module.exports.fixApprovedLoansNow = (req, res) => {
  console.log("🔧 IMMEDIATE FIX: Moving approved loans to disbursed");

  // Get approved loans
  DB.query("SELECT * FROM loan_application WHERE loan_status = 'approved'", (error, approvedLoans) => {
    if (error) {
      return res.status(500).json({ message: "Database error", error: error.message });
    }

    if (approvedLoans.length === 0) {
      return res.status(200).json({ message: "No approved loans to fix", count: 0 });
    }

    console.log(`Found ${approvedLoans.length} approved loans to fix`);
    let processed = 0;
    let success = 0;

    approvedLoans.forEach((loan) => {
      // Create loan entry
      DB.query(
        "INSERT INTO loans (user_id, amount_disbursed, loan_repayment, remaining_balance, status, disbursement_date) VALUES (?,?,?,?,?,?)",
        [loan.user_id, loan.loan_amount, 0, loan.loan_amount, 'active', new Date().toISOString().split('T')[0]],
        (loanError) => {
          if (!loanError) {
            // Update to disbursed
            DB.query(
              "UPDATE loan_application SET loan_status = 'disbursed' WHERE loan_application_id = ?",
              [loan.loan_application_id],
              (updateError) => {
                if (!updateError) {
                  success++;
                }
              }
            );
          }

          processed++;
          if (processed === approvedLoans.length) {
            return res.status(200).json({
              message: `Fixed ${success}/${approvedLoans.length} approved loans`,
              total: approvedLoans.length,
              success: success
            });
          }
        }
      );
    });
  });
};

// Simple test endpoint
module.exports.simpleTest = (req, res) => {
  console.log("🧪 Simple test endpoint called");

  try {
    // Test database connection
    DB.query("SELECT 1 as test", (error, result) => {
      if (error) {
        console.error("❌ Database test failed:", error);
        return res.status(500).json({
          message: "Database test failed",
          error: error.message
        });
      }

      console.log("✅ Database test passed");

      // Check for approved loans
      DB.query(
        "SELECT COUNT(*) as count FROM loan_application WHERE loan_status = 'approved'",
        (countError, countResult) => {
          if (countError) {
            console.error("❌ Count query failed:", countError);
            return res.status(500).json({
              message: "Count query failed",
              error: countError.message
            });
          }

          const approvedCount = countResult[0].count;
          console.log("📊 Found approved loans:", approvedCount);

          return res.status(200).json({
            message: "Simple test completed successfully",
            database_connection: "OK",
            approved_loans_count: approvedCount,
            timestamp: new Date().toISOString()
          });
        }
      );
    });
  } catch (error) {
    console.error("❌ Unexpected error in simpleTest:", error);
    return res.status(500).json({
      message: "Unexpected error",
      error: error.message
    });
  }
};

// Test function to manually disburse approved loans
module.exports.testDisbursement = (req, res) => {
  console.log("🧪 Testing disbursement process...");

  try {
    // Get all approved loans that haven't been disbursed
    DB.query(
      "SELECT * FROM loan_application WHERE loan_status = 'approved'",
      (error, applications) => {
        if (error) {
          console.error("❌ Error fetching approved applications:", error);
          console.error("❌ SQL Error details:", error.sqlMessage);
          return res.status(500).json({
            message: "Database query failed",
            error: error.message,
            sqlError: error.sqlMessage
          });
        }

        console.log("📋 Found approved applications:", applications.length);
        console.log("📋 Applications data:", applications);

        if (applications.length === 0) {
          return res.status(200).json({
            message: "No approved applications found",
            count: 0
          });
        }

      // Process each approved application
      let processed = 0;
      let errors = [];

      applications.forEach((application, index) => {
        console.log(`🔄 Processing application ${index + 1}/${applications.length}:`, application.loan_application_id);

        const loanTerm = application.loan_term || 12;
        const monthlyInstallment = application.monthly_installment || 0;
        const totalAmount = application.total_amount || application.loan_amount;
        const remainingBalance = totalAmount;

        // Create loan entry with simplified columns
        const disbursementDate = new Date().toISOString().split('T')[0];
        const dueDate = getDueDate(loanTerm);
        const nextPaymentDate = getNextPaymentDate();

        console.log("💰 Creating loan with simplified data:", {
          user_id: application.user_id,
          amount_disbursed: application.loan_amount,
          loan_term: loanTerm,
          disbursement_date: disbursementDate
        });

        DB.query(
          "INSERT INTO loans (user_id, amount_disbursed, loan_repayment, remaining_balance, status, disbursement_date) VALUES (?,?,?,?,?,?)",
          [
            application.user_id,
            application.loan_amount,
            0, // Initial repayment
            application.loan_amount, // Remaining balance = full amount initially
            'active',
            disbursementDate
          ],
          (loanError, loanResult) => {
            if (loanError) {
              console.error(`❌ Error creating loan for application ${application.loan_application_id}:`, loanError);
              errors.push({ application_id: application.loan_application_id, error: loanError.message });
            } else {
              console.log(`✅ Loan created for application ${application.loan_application_id}, loan ID:`, loanResult.insertId);

              // Update application status to disbursed
              DB.query(
                "UPDATE loan_application SET loan_status = 'disbursed' WHERE loan_application_id = ?",
                [application.loan_application_id],
                (updateError) => {
                  if (updateError) {
                    console.error(`⚠️ Error updating application ${application.loan_application_id} status:`, updateError);
                  } else {
                    console.log(`✅ Application ${application.loan_application_id} status updated to disbursed`);
                  }
                }
              );
            }

            processed++;

            // Send response when all are processed
            if (processed === applications.length) {
              res.status(200).json({
                message: "Disbursement test completed",
                total_applications: applications.length,
                errors: errors,
                success_count: applications.length - errors.length
              });
            }
          }
        );
      });
    }
  );
  } catch (error) {
    console.error("❌ Unexpected error in testDisbursement:", error);
    return res.status(500).json({
      message: "Unexpected error occurred",
      error: error.message
    });
  }
};
