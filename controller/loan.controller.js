const { validationResult } = require("express-validator");
const { DB } = require("../sql");
require("dotenv").config();





module.exports.createnewloan = async (req, res) => {
  const errorResponse = validationResult(req);
  const { user_id, amount_disbursed, loan_repayment, interest_paid, payment_method, status } = req.body;

  try {
    if (!errorResponse.isEmpty()) {
      return res.status(400).json({ message: errorResponse.errors[0].msg });
    }

    const [result] = await DB.query(
      "INSERT INTO loans (user_id, amount_disbursed, loan_repayment, interest_paid, payment_method, status) VALUES (?,?,?,?,?,?)",
      [user_id, amount_disbursed, loan_repayment, interest_paid, payment_method, status]
    );

    res.status(200).json({ message: "new loan added" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message ?? "something went wrong" });
  }
};


module.exports.getAllLoans = (req, res) => {
  console.log("📋 Fetching all loans...");

  try {
    // Try with JOIN first, fallback to simple query if users table doesn't exist
    console.log("🔍 Trying query with user details...");
    DB.query(
      `SELECT l.*, u.fullname, u.email, u.mobile
       FROM loans l
       LEFT JOIN users u ON l.user_id = u.user_id
       ORDER BY l.loan_id DESC`,
      (joinError, loans) => {
        if (joinError) {
          console.log("⚠️ JOIN query failed, trying simple query...");
          console.log("JOIN error:", joinError.message);

          // Fallback query without JOIN
          DB.query(
            "SELECT * FROM loans ORDER BY loan_id DESC",
            (fallbackError, fallbackLoans) => {
              if (fallbackError) {
                console.error("❌ Error fetching loans:", fallbackError);
                res.status(500).json({ message: fallbackError.message ?? "something went wrong" });
              } else {
                console.log("✅ Simple query successful");
                console.log("📊 Loans found:", fallbackLoans.length);
                res.status(200).json({ message: fallbackLoans });
              }
            }
          );
        } else {
          console.log("✅ Query with user details successful");
          console.log("📊 Loans found:", loans.length);
          res.status(200).json({ message: loans });
        }
      }
    );
  } catch (error) {
    console.error("❌ Error fetching loans:", error);
    res.status(500).json({ message: error.message ?? "something went wrong" });
  }
};

module.exports.getUserLoans = (req, res) => {
  const { user_id } = req.params;
  console.log("🔍 Fetching loans for user:", user_id);

  try {
    if (!user_id) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // Try with JOIN first, fallback to simple query if users table doesn't exist
    console.log("🔍 Trying query with user details for user:", user_id);
    DB.query(
      `SELECT l.*, u.fullname, u.email, u.mobile
       FROM loans l
       LEFT JOIN users u ON l.user_id = u.user_id
       WHERE l.user_id = ?
       ORDER BY l.loan_id DESC`,
      [user_id],
      (joinError, loans) => {
        if (joinError) {
          console.log("⚠️ JOIN query failed, trying simple query...");
          console.log("JOIN error:", joinError.message);

          // Fallback query without JOIN
          DB.query(
            "SELECT * FROM loans WHERE user_id = ? ORDER BY loan_id DESC",
            [user_id],
            (fallbackError, fallbackLoans) => {
              if (fallbackError) {
                console.error("❌ Error fetching user loans:", fallbackError);
                res.status(500).json({ message: fallbackError.message ?? "something went wrong" });
              } else {
                console.log("✅ Simple query successful for user loans");
                console.log("📊 User loans found:", fallbackLoans.length);
                res.status(200).json({ message: fallbackLoans });
              }
            }
          );
        } else {
          console.log("✅ Query with user details successful for user loans");
          console.log("📊 User loans found:", loans.length);
          res.status(200).json({ message: loans });
        }
      }
    );
  } catch (error) {
    console.error("❌ Error fetching user loans:", error);
    res.status(500).json({ message: error.message ?? "something went wrong" });
  }
};


module.exports.deleteloan = (req, res) => {
  const { loan_id } = req.params;

  console.log("🗑️ Deleting loan with ID:", loan_id);

  try {
    if (!loan_id) {
      return res.status(400).json({ message: "loan ID is required" });
    }

    DB.query(
      "SELECT * FROM loans WHERE loan_id = ?",
      [loan_id],
      (checkError, loan) => {
        if (checkError) {
          console.error("❌ Error checking loan:", checkError);
          return res.status(500).json({ message: checkError.message ?? "something went wrong" });
        }

        if (loan.length === 0) {
          return res.status(404).json({ message: "loan not found" });
        }

        DB.query(
          "DELETE FROM loans WHERE loan_id = ?",
          [loan_id],
          (deleteError) => {
            if (deleteError) {
              console.error("❌ Error deleting loan:", deleteError);
              return res.status(500).json({ message: deleteError.message ?? "something went wrong" });
            }

            console.log("✅ Loan deleted successfully");
            res.status(200).json({ message: "loan deleted successfully" });
          }
        );
      }
    );
  } catch (error) {
    console.error("❌ Error deleting loan:", error);
    res.status(500).json({ message: error.message ?? "something went wrong" });
  }
};

module.exports.updateloans = (req, res) => {
  const { loan_id } = req.params;
  const { amount_disbursed, loan_repayment, status } = req.body;
  const errorResponse = validationResult(req);

  console.log("✏️ Updating loan:", loan_id);

  try {
    if (!errorResponse.isEmpty()) {
      return res.status(400).json({ error: errorResponse.array() });
    }

    // Calculate remaining balance based on status
    let remaining_balance;
    if (status === 'completed') {
      remaining_balance = 0; // If completed, no remaining balance
    } else {
      // Calculate remaining balance: (amount_disbursed + interest) - loan_repayment
      remaining_balance = Math.max(0, parseFloat(amount_disbursed) - parseFloat(loan_repayment));
    }

    DB.query(
      'UPDATE loans SET amount_disbursed = ?, loan_repayment = ?, status = ?, remaining_balance = ? WHERE loan_id = ?',
      [amount_disbursed, loan_repayment, status, remaining_balance, loan_id],
      (updateError, result) => {
        if (updateError) {
          console.error("❌ Error updating loan:", updateError);
          return res.status(500).json({ message: updateError.message ?? "something went wrong" });
        }

        if (result.affectedRows === 0) {
          return res.status(404).json({ message: "Loan not found" });
        }

        console.log("✅ Loan updated successfully with remaining balance:", remaining_balance);
        res.status(200).json({
          message: "Your loan has been updated",
          remaining_balance: remaining_balance,
          status: status
        });
      }
    );
  } catch (error) {
    console.error("❌ Error updating loan:", error);
    res.status(500).json({ message: error.message ?? "something went wrong" });
  }
};

module.exports.disburseLoan = async (req, res) => {
  const errorResponse = validationResult(req);
  const { user_id, amount_disbursed, date, loan_repayment, total_interest } = req.body;

  try {
    if (!errorResponse.isEmpty()) {
      return res.status(400).json({ message: errorResponse.errors[0].msg });
    }

    // First check if the user has a pending or approved loan application
    const [applications] = await DB.query(
      "SELECT * FROM loan_application WHERE user_id = ? AND loan_status = 'approved'",
      [user_id]
    );

    if (applications.length === 0) {
      return res.status(400).json({ message: "No approved loan application found for this user" });
    }

    const application = applications[0];
    const loanTerm = application.loan_term || 12; // Default to 12 months if not specified
    
    // Use the monthly_installment from the loan application if available
    const monthlyInstallment = application.monthly_installment || (parseFloat(amount_disbursed) + parseFloat(total_interest)) / loanTerm;
    
    // If approved application exists, disburse the loan
    const payment_method = "bank transfer"; // Default value, can be modified based on form input
    const status = "active";

    // Use promise-based queries for loan disbursement
    const [result] = await DB.query(
      "INSERT INTO loans (user_id, amount_disbursed, loan_repayment, interest_paid, payment_method, status, disbursement_date, loan_term, monthly_installment, remaining_balance) VALUES (?,?,?,?,?,?,?,?,?,?)",
      [
        user_id,
        amount_disbursed,
        loan_repayment || 0, // Initial repayment is 0
        total_interest,
        payment_method,
        status,
        date,
        loanTerm,
        monthlyInstallment,
        parseFloat(amount_disbursed) + parseFloat(total_interest) // Initial remaining balance is the full loan amount + interest
      ]
    );

    console.log("✅ Loan inserted with ID:", result.insertId);

    // Update the loan application status
    await DB.query(
      "UPDATE loan_application SET loan_status = 'disbursed' WHERE user_id = ? AND loan_status = 'approved'",
      [user_id]
    );

    console.log("✅ Loan application status updated to disbursed");

    // Create loan installment schedule
    try {
      const installments = [];
      let currentDate = new Date(date);

      for (let i = 0; i < loanTerm; i++) {
        currentDate.setMonth(currentDate.getMonth() + 1);
        installments.push([
          result.insertId,
          i + 1,
          monthlyInstallment,
          currentDate.toISOString().split('T')[0],
          'pending'
        ]);
      }

      // Insert all installments if table exists
      if (installments.length > 0) {
        try {
          await DB.query(
            "INSERT INTO loan_installments (loan_id, installment_number, amount, due_date, status) VALUES ?",
            [installments]
          );
          console.log("✅ Loan installments created:", installments.length);
        } catch (installmentError) {
          console.log("⚠️ Could not create installments (table might not exist):", installmentError.message);
          // Continue without failing the disbursement
        }
      }
    } catch (scheduleError) {
      console.log("⚠️ Error creating installment schedule:", scheduleError.message);
      // Continue without failing the disbursement
    }

    res.status(200).json({
      message: "Loan disbursed successfully",
      loanId: result.insertId
    });
  } catch (error) {
    console.error('Error in loan disbursement:', error);
    res.status(500).json({ message: error.message ?? "Something went wrong" });
  }
};

module.exports.recordLoanRepayment = async (req, res) => {
  const errorResponse = validationResult(req);
  const { loan_id, amount, payment_date, payment_method, installment_number } = req.body;

  console.log("💰 Recording loan repayment:", { loan_id, amount, payment_date, payment_method });

  try {
    if (!errorResponse.isEmpty()) {
      return res.status(400).json({ message: errorResponse.errors[0].msg });
    }

    // Get loan details
    const [loans] = await DB.query(
      "SELECT * FROM loans WHERE loan_id = ? AND status IN ('active', 'partial')",
      [loan_id]
    );

    if (loans.length === 0) {
      return res.status(400).json({ message: "No active loan found with this ID" });
    }

    const loan = loans[0];
    const currentBalance = parseFloat(loan.remaining_balance || 0);
    const newBalance = Math.max(0, currentBalance - parseFloat(amount));
    const newStatus = newBalance <= 0 ? 'completed' : 'partial';

    console.log("📊 Loan details:", { currentBalance, newBalance, newStatus });

    // Use callback-based transaction for better compatibility
    await new Promise((resolve, reject) => {
      DB.query('START TRANSACTION', (transError) => {
        if (transError) {
          reject(transError);
          return;
        }

        // Update the loan with new repayment amount and status
        DB.query(
          "UPDATE loans SET loan_repayment = loan_repayment + ?, remaining_balance = ?, status = ? WHERE loan_id = ?",
          [amount, newBalance, newStatus, loan_id],
          (updateError) => {
            if (updateError) {
              DB.query('ROLLBACK', () => {});
              reject(updateError);
              return;
            }

            // Update the specific installment if provided
            if (installment_number) {
              DB.query(
                "UPDATE loan_installments SET status = 'paid', payment_date = ? WHERE loan_id = ? AND installment_number = ?",
                [payment_date, loan_id, installment_number],
                (installError) => {
                  if (installError) {
                    console.log("⚠️ Installment update failed:", installError.message);
                    // Continue without failing the transaction
                  }

                  // Record the payment in payment history
                  DB.query(
                    "INSERT INTO loan_payments (loan_id, amount, payment_date, payment_method, installment_number) VALUES (?,?,?,?,?)",
                    [loan_id, amount, payment_date, payment_method, installment_number],
                    (paymentError) => {
                      if (paymentError) {
                        console.log("⚠️ Payment history recording failed:", paymentError.message);
                        // Continue without failing the transaction
                      }

                      // Commit transaction
                      DB.query('COMMIT', (commitError) => {
                        if (commitError) {
                          DB.query('ROLLBACK', () => {});
                          reject(commitError);
                        } else {
                          resolve();
                        }
                      });
                    }
                  );
                }
              );
            } else {
              // Record the payment in payment history without installment
              DB.query(
                "INSERT INTO loan_payments (loan_id, amount, payment_date, payment_method, installment_number) VALUES (?,?,?,?,?)",
                [loan_id, amount, payment_date, payment_method, null],
                (paymentError) => {
                  if (paymentError) {
                    console.log("⚠️ Payment history recording failed:", paymentError.message);
                    // Continue without failing the transaction
                  }

                  // Commit transaction
                  DB.query('COMMIT', (commitError) => {
                    if (commitError) {
                      DB.query('ROLLBACK', () => {});
                      reject(commitError);
                    } else {
                      resolve();
                    }
                  });
                }
              );
            }
          }
        );
      });
    });

    console.log("✅ Loan repayment recorded successfully");
    return res.status(200).json({
      message: "Loan repayment recorded successfully",
      remainingBalance: newBalance,
      status: newStatus
    });
  } catch (error) {
    console.error("❌ Error recording loan repayment:", error);
    res.status(500).json({ message: error.message ?? "Something went wrong" });
  }
};

// Get loan installments
module.exports.getLoanInstallments = async (req, res) => {
  const { loan_id } = req.params;

  console.log("📋 Fetching loan installments for loan:", loan_id);

  try {
    if (!loan_id) {
      return res.status(400).json({ message: "Loan ID is required" });
    }

    const [installments] = await DB.query(
      "SELECT * FROM loan_installments WHERE loan_id = ? ORDER BY installment_number",
      [loan_id]
    );

    console.log("✅ Installments found:", installments.length);
    return res.status(200).json({ message: installments });
  } catch (error) {
    console.error("❌ Error fetching loan installments:", error);
    res.status(500).json({ message: error.message ?? "Something went wrong" });
  }
};

// Get total loans count
module.exports.getTotalLoans = (req, res) => {
  console.log("📊 Fetching total loans count...");

  try {
    DB.query("SELECT COUNT(*) AS totalLoans FROM loans", (err, result) => {
      if (err) {
        console.error("❌ Error fetching total loans:", err);
        res.status(500).json({ message: "Can't fetch total loans" });
      } else {
        const totalLoans = result[0].totalLoans;
        console.log("✅ Total loans count:", totalLoans);
        res.status(200).json({ message: totalLoans });
      }
    });
  } catch (error) {
    console.error("❌ Server error in getTotalLoans:", error);
    res.status(500).json({ message: error.message ?? "something went wrong" });
  }
};

// Get total loan amount disbursed
module.exports.getTotalLoanAmount = (req, res) => {
  console.log("💰 Fetching total loan amount disbursed...");

  try {
    DB.query("SELECT SUM(amount_disbursed) AS totalAmount FROM loans", (err, result) => {
      if (err) {
        console.error("❌ Error fetching total loan amount:", err);
        res.status(500).json({ message: "Can't fetch total loan amount" });
      } else {
        const totalAmount = result[0].totalAmount || 0;
        console.log("✅ Total loan amount:", totalAmount);
        res.status(200).json({ message: totalAmount });
      }
    });
  } catch (error) {
    console.error("❌ Server error in getTotalLoanAmount:", error);
    res.status(500).json({ message: error.message ?? "something went wrong" });
  }
};

// Get total loan applications count
module.exports.getTotalLoanApplications = (req, res) => {
  console.log("📊 Fetching total loan applications count...");

  try {
    DB.query("SELECT COUNT(*) AS totalApplications FROM loan_application", (err, result) => {
      if (err) {
        console.error("❌ Error fetching total loan applications:", err);
        res.status(500).json({ message: "Can't fetch total loan applications" });
      } else {
        const totalApplications = result[0].totalApplications;
        console.log("✅ Total loan applications count:", totalApplications);
        res.status(200).json({ message: totalApplications });
      }
    });
  } catch (error) {
    console.error("❌ Server error in getTotalLoanApplications:", error);
    res.status(500).json({ message: error.message ?? "something went wrong" });
  }
};