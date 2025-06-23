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
  const errorResponse = validationResult(req);

  console.log("✏️ Updating loan application:", loan_application_id, "to status:", loan_status);

  try {
    if (!errorResponse.isEmpty()) {
      return res.status(400).json({ error: errorResponse.array() });
    }

    DB.query(
      "UPDATE loan_application SET loan_status = ? WHERE loan_application_id = ?",
      [loan_status, loan_application_id],
      (error, result) => {
        if (error) {
          console.error("❌ Error updating loan application:", error);
          return res.status(500).json({ message: error.message ?? "Something went wrong" });
        }

        if (result.affectedRows === 0) {
          return res.status(404).json({ message: "Loan application not found" });
        }

        console.log("✅ Loan application status updated successfully");

        // If loan is approved, create loan entry and repayment schedule
        if (loan_status === 'approved') {
          console.log("🔄 Loan approved, creating loan entry and repayment schedule...");

          // First, get the loan application details
          DB.query(
            "SELECT * FROM loan_application WHERE loan_application_id = ?",
            [loan_application_id],
            (appError, applications) => {
              if (appError) {
                console.error("❌ Error fetching loan application:", appError);
                return res.status(200).json({ message: "Loan status updated, but failed to create loan entry" });
              }

              if (applications.length === 0) {
                console.error("❌ Loan application not found");
                return res.status(200).json({ message: "Loan status updated, but application not found" });
              }

              const application = applications[0];
              const loanTerm = application.loan_term || 12;
              const monthlyInstallment = application.monthly_installment || 0;
              const totalAmount = application.total_amount || application.loan_amount;
              const remainingBalance = totalAmount;

              // Create loan entry in loans table
              DB.query(
                "INSERT INTO loans (user_id, amount_disbursed, loan_repayment, interest_paid, payment_method, status, disbursement_date, loan_term, monthly_payment, remaining_balance, next_payment_date) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                [
                  application.user_id,
                  application.loan_amount,
                  0, // Initial repayment is 0
                  application.total_interest || 0,
                  'bank transfer', // Default payment method
                  'active',
                  new Date().toISOString().split('T')[0], // Today's date
                  loanTerm,
                  monthlyInstallment,
                  remainingBalance,
                  getNextPaymentDate() // Calculate next payment date (30 days from now)
                ],
                (loanError, loanResult) => {
                  if (loanError) {
                    console.error("❌ Error creating loan entry:", loanError);
                    return res.status(200).json({ message: "Loan status updated, but failed to create loan entry" });
                  }

                  console.log("✅ Loan entry created with ID:", loanResult.insertId);

                  // Now create repayment schedule
                  createLoanRepaymentSchedule(loan_application_id, (scheduleError) => {
                    if (scheduleError) {
                      console.error("❌ Error creating repayment schedule:", scheduleError);
                    } else {
                      console.log("✅ Repayment schedule created successfully");
                    }

                    // Send response after all operations are complete
                    return res.status(200).json({
                      message: "Loan approved and disbursed successfully",
                      loan_id: loanResult.insertId
                    });
                  });
                }
              );
            }
          );
        } else {
          // If not approved, just send the response
          res.status(200).json({ message: "Your loan status has been updated" });
        }
      }
    );
  } catch (error) {
    console.error("❌ Error updating loan application:", error);
    res.status(500).json({ message: error.message ?? "Something went wrong" });
  }
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
