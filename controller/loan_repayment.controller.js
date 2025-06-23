const { validationResult } = require("express-validator");
const { DB } = require("../sql");
require("dotenv").config();

/**
 * Record a new loan repayment
 */
module.exports.recordRepayment = (req, res) => {

  const errorResponse = validationResult(req);
  
  const { loan_id, user_id, amount, payment_date, payment_method, installment_number, notes } = req.body;

  console.log("💰 Recording repayment:", { loan_id, user_id, amount, payment_date, payment_method });

  try {
    if (!errorResponse.isEmpty()) {
      return res.status(400).json({ message: errorResponse.errors[0].msg });
    }

    // Get the current loan details to calculate remaining balance
    DB.query(
      "SELECT * FROM loans WHERE loan_id = ? AND user_id = ?",
      [loan_id, user_id],
      (loanError, loans) => {
        if (loanError) {
          console.error("❌ Error fetching loan:", loanError);
          return res.status(500).json({ message: loanError.message ?? "Something went wrong" });
        }

        if (loans.length === 0) {
          return res.status(404).json({ message: "Loan not found" });
        }

        const loan = loans[0];

        // Calculate the new remaining balance
        const totalLoanAmount = parseFloat(loan.amount_disbursed) + parseFloat(loan.interest_paid);
        const currentRepayment = parseFloat(loan.loan_repayment) || 0;
        const newRepaymentTotal = currentRepayment + parseFloat(amount);
        const remainingBalance = Math.max(0, totalLoanAmount - newRepaymentTotal);

        // Determine the new loan status based on remaining balance
        const newStatus = remainingBalance <= 0 ? 'completed' : (newRepaymentTotal > 0 ? 'partial' : 'active');

        console.log("📊 Repayment calculation:", { totalLoanAmount, currentRepayment, newRepaymentTotal, remainingBalance, newStatus });

        // Update loan status and repayment amount
        DB.query(
          "UPDATE loans SET status = ?, loan_repayment = ?, remaining_balance = ? WHERE loan_id = ?",
          [newStatus, newRepaymentTotal, remainingBalance, loan_id],
          (updateError) => {
            if (updateError) {
              console.error("❌ Error updating loan:", updateError);
              return res.status(500).json({ message: updateError.message ?? "Something went wrong" });
            }

            console.log("✅ Loan updated successfully");

            // Record the repayment
            DB.query(
              "INSERT INTO loan_repayments (loan_id, user_id, amount, payment_date, payment_method, installment_number, remaining_balance, notes) VALUES (?,?,?,?,?,?,?,?)",
              [loan_id, user_id, amount, payment_date, payment_method, installment_number, remainingBalance, notes],
              (repaymentError, result) => {
                let repaymentId = null;

                if (repaymentError) {
                  console.log("⚠️ Could not record in loan_repayments table:", repaymentError.message);
                  // Continue without failing - the loan update was successful
                } else {
                  repaymentId = result.insertId;
                  console.log("✅ Repayment recorded with ID:", repaymentId);
                }

                // If an installment number was provided, update its status
                if (installment_number) {
                  DB.query(
                    "UPDATE loan_installments SET status = ?, payment_date = ? WHERE loan_id = ? AND installment_number = ?",
                    ['paid', payment_date, loan_id, installment_number],
                    (installmentError) => {
                      if (installmentError) {
                        console.log("⚠️ Could not update installment status:", installmentError.message);
                      } else {
                        console.log("✅ Installment status updated");
                      }
                    }
                  );
                }

                return res.status(200).json({
                  message: "Loan repayment recorded successfully",
                  repayment_id: repaymentId,
                  remaining_balance: remainingBalance,
                  status: newStatus
                });
              }
            );
          }
        );
      }
    );
  } catch (error) {
    console.error('❌ Error in loan repayment:', error);
    res.status(500).json({ message: error.message ?? "Something went wrong" });
  }
};

/**
 * Get repayment history for a specific loan
 */
module.exports.getLoanRepaymentHistory = (req, res) => {
  const { loan_id } = req.params;

  try {
    if (!loan_id) {
      return res.status(400).json({ message: "Loan ID is required" });
    }

    DB.query(
      "SELECT r.*, u.fullname FROM loan_repayments r JOIN users u ON r.user_id = u.user_id WHERE r.loan_id = ? ORDER BY r.payment_date DESC",
      [loan_id],
      (error, history) => {
        if (error) {
          console.error("❌ Error fetching loan repayment history:", error);
          return res.status(500).json({ message: error.message ?? "Something went wrong" });
        }

        return res.status(200).json({ message: history });
      }
    );
  } catch (error) {
    res.status(500).json({ message: error.message ?? "Something went wrong" });
  }
};

/**
 * Get repayment history for a specific user
 */
module.exports.getUserRepaymentHistory = (req, res) => {
  const { user_id } = req.params;

  try {
    if (!user_id) {
      return res.status(400).json({ message: "User ID is required" });
    }

    DB.query(
      `SELECT r.*, l.amount_disbursed, l.interest_paid, u.fullname
       FROM loan_repayments r
       JOIN loans l ON r.loan_id = l.loan_id
       JOIN users u ON r.user_id = u.user_id
       WHERE r.user_id = ?
       ORDER BY r.payment_date DESC`,
      [user_id],
      (error, history) => {
        if (error) {
          console.error("❌ Error fetching user repayment history:", error);
          return res.status(500).json({ message: error.message ?? "Something went wrong" });
        }

        return res.status(200).json({ message: history });
      }
    );
  } catch (error) {
    res.status(500).json({ message: error.message ?? "Something went wrong" });
  }
};

/**
 * Get all repayment history with user details
 */
module.exports.getAllRepaymentHistory = (req, res) => {
  console.log("📋 Fetching all repayment history...");

  try {
    // Try with full JOIN first, fallback to simpler query if tables don't exist
    console.log("🔍 Trying query with full JOIN...");
    DB.query(
      `SELECT r.*, l.amount_disbursed, l.interest_paid, u.fullname
       FROM loan_repayments r
       JOIN loans l ON r.loan_id = l.loan_id
       JOIN users u ON r.user_id = u.user_id
       ORDER BY r.payment_date DESC`,
      (joinError, history) => {
        if (joinError) {
          console.log("⚠️ Full JOIN failed, trying simpler query...");
          console.log("JOIN error:", joinError.message);

          // Fallback to just loan_repayments table
          DB.query(
            "SELECT * FROM loan_repayments ORDER BY payment_date DESC",
            (simpleError, simpleHistory) => {
              if (simpleError) {
                console.log("❌ loan_repayments table might not exist:", simpleError.message);
                return res.status(200).json({ message: [] });
              } else {
                console.log("✅ Simple query successful");
                console.log("📊 Repayment history found:", simpleHistory.length);
                return res.status(200).json({ message: simpleHistory });
              }
            }
          );
        } else {
          console.log("✅ Full JOIN query successful");
          console.log("📊 Repayment history found:", history.length);
          return res.status(200).json({ message: history });
        }
      }
    );
  } catch (error) {
    console.error("❌ Error fetching repayment history:", error);
    res.status(500).json({ message: error.message ?? "Something went wrong" });
  }
};

/**
 * Get next payment due for a user
 */
module.exports.getNextPayment = (req, res) => {
  const { user_id } = req.params;

  console.log("📅 Getting next payment for user:", user_id);

  try {
    if (!user_id) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // Get the next pending payment for this user
    DB.query(
      `SELECT r.*, la.loan_amount, la.loan_term, u.fullname
       FROM loan_repayments r
       JOIN loan_application la ON r.loan_application_id = la.loan_application_id
       JOIN users u ON r.user_id = u.user_id
       WHERE r.user_id = ? AND r.status IN ('pending', 'overdue')
       ORDER BY r.due_date ASC
       LIMIT 1`,
      [user_id],
      (error, payments) => {
        if (error) {
          console.error("❌ Error fetching next payment:", error);

          // If table doesn't exist, return empty result
          if (error.code === 'ER_NO_SUCH_TABLE') {
            return res.status(200).json({
              message: null,
              note: "No repayment schedule found - loan_repayments table doesn't exist"
            });
          }

          // If column doesn't exist, try simpler query
          if (error.code === 'ER_BAD_FIELD_ERROR') {
            console.log("⚠️ Column issue, trying simpler query...");
            DB.query(
              `SELECT r.*, u.fullname
               FROM loan_repayments r
               JOIN users u ON r.user_id = u.user_id
               WHERE r.user_id = ? AND r.status IN ('pending', 'overdue')
               ORDER BY r.due_date ASC
               LIMIT 1`,
              [user_id],
              (simpleError, simplePayments) => {
                if (simpleError) {
                  console.error("❌ Simple query also failed:", simpleError);
                  return res.status(500).json({ message: simpleError.message ?? "Something went wrong" });
                }

                if (simplePayments.length === 0) {
                  return res.status(200).json({ message: null });
                }

                const nextPayment = simplePayments[0];
                return res.status(200).json({ message: nextPayment });
              }
            );
            return;
          }

          return res.status(500).json({ message: error.message ?? "Something went wrong" });
        }

        if (payments.length === 0) {
          console.log("📅 No pending payments found for user:", user_id);
          return res.status(200).json({
            message: null,
            note: "No pending payments found"
          });
        }

        const nextPayment = payments[0];
        console.log("📅 Next payment found:", {
          repayment_id: nextPayment.repayment_id,
          installment_number: nextPayment.installment_number,
          amount_due: nextPayment.amount_due,
          due_date: nextPayment.due_date
        });

        // Check if payment is overdue
        const today = new Date();
        const dueDate = new Date(nextPayment.due_date);
        const isOverdue = today > dueDate;

        if (isOverdue && nextPayment.status === 'pending') {
          // Update status to overdue
          DB.query(
            "UPDATE loan_repayments SET status = 'overdue' WHERE repayment_id = ?",
            [nextPayment.repayment_id],
            (updateError) => {
              if (updateError) {
                console.log("⚠️ Could not update overdue status:", updateError.message);
              } else {
                console.log("✅ Updated payment status to overdue");
                nextPayment.status = 'overdue';
              }
            }
          );
        }

        return res.status(200).json({
          message: {
            ...nextPayment,
            is_overdue: isOverdue,
            days_overdue: isOverdue ? Math.floor((today - dueDate) / (1000 * 60 * 60 * 24)) : 0
          }
        });
      }
    );
  } catch (error) {
    console.error("❌ Error getting next payment:", error);
    res.status(500).json({ message: error.message ?? "Something went wrong" });
  }
};

/**
 * Get all pending payments for a user
 */
module.exports.getUserPendingPayments = (req, res) => {
  const { user_id } = req.params;

  console.log("📋 Getting all pending payments for user:", user_id);

  try {
    if (!user_id) {
      return res.status(400).json({ message: "User ID is required" });
    }

    DB.query(
      `SELECT r.*, la.loan_amount, la.loan_term, u.fullname
       FROM loan_repayments r
       JOIN loan_application la ON r.loan_application_id = la.loan_application_id
       JOIN users u ON r.user_id = u.user_id
       WHERE r.user_id = ? AND r.status IN ('pending', 'overdue')
       ORDER BY r.due_date ASC`,
      [user_id],
      (error, payments) => {
        if (error) {
          console.error("❌ Error fetching pending payments:", error);

          if (error.code === 'ER_NO_SUCH_TABLE') {
            return res.status(200).json({
              message: [],
              note: "No repayment schedule found - loan_repayments table doesn't exist"
            });
          }

          return res.status(500).json({ message: error.message ?? "Something went wrong" });
        }

        console.log("📋 Pending payments found:", payments.length);

        // Update overdue status for payments past due date
        const today = new Date();
        payments.forEach(payment => {
          const dueDate = new Date(payment.due_date);
          if (today > dueDate && payment.status === 'pending') {
            DB.query(
              "UPDATE loan_repayments SET status = 'overdue' WHERE repayment_id = ?",
              [payment.repayment_id],
              (updateError) => {
                if (!updateError) {
                  payment.status = 'overdue';
                }
              }
            );
          }
          payment.is_overdue = today > dueDate;
          payment.days_overdue = payment.is_overdue ? Math.floor((today - dueDate) / (1000 * 60 * 60 * 24)) : 0;
        });

        return res.status(200).json({ message: payments });
      }
    );
  } catch (error) {
    console.error("❌ Error getting pending payments:", error);
    res.status(500).json({ message: error.message ?? "Something went wrong" });
  }
};

// Admin function to update repayment status
const updateRepaymentStatus = (req, res) => {
  const { repayment_id } = req.params;
  const { status, amount_paid, payment_date, payment_method, notes } = req.body;

  console.log("✏️ Admin updating repayment status:", repayment_id, "to:", status);

  try {
    if (!repayment_id) {
      return res.status(400).json({ message: "Repayment ID is required" });
    }

    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }

    // Build update query dynamically based on provided fields
    let updateFields = ['status = ?'];
    let updateValues = [status];

    if (amount_paid !== undefined) {
      updateFields.push('amount_paid = ?');
      updateValues.push(amount_paid);
    }

    if (payment_date) {
      updateFields.push('payment_date = ?');
      updateValues.push(payment_date);
    }

    if (payment_method) {
      updateFields.push('payment_method = ?');
      updateValues.push(payment_method);
    }

    if (notes) {
      updateFields.push('notes = ?');
      updateValues.push(notes);
    }

    updateValues.push(repayment_id);

    const updateSQL = `UPDATE loan_repayments SET ${updateFields.join(', ')} WHERE repayment_id = ?`;

    DB.query(updateSQL, updateValues, (error, result) => {
      if (error) {
        console.error("❌ Error updating repayment status:", error);
        return res.status(500).json({ message: error.message ?? "Something went wrong" });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Repayment record not found" });
      }

      console.log("✅ Repayment status updated successfully");
      res.status(200).json({
        message: "Repayment status updated successfully",
        repayment_id: repayment_id,
        status: status
      });
    });
  } catch (error) {
    console.error("❌ Error updating repayment status:", error);
    res.status(500).json({ message: error.message ?? "Something went wrong" });
  }
};

// Admin function to get all repayments with detailed information
const getAdminRepayments = (req, res) => {
  console.log("📋 Admin fetching all repayments...");

  try {
    const query = `
      SELECT
        r.*,
        u.fullname,
        u.email,
        u.mobile,
        la.loan_amount,
        la.loan_term,
        la.loan_purpose
      FROM loan_repayments r
      JOIN users u ON r.user_id = u.user_id
      LEFT JOIN loan_application la ON r.loan_application_id = la.loan_application_id
      ORDER BY r.due_date ASC, r.installment_number ASC
    `;

    DB.query(query, (error, repayments) => {
      if (error) {
        console.error("❌ Error fetching admin repayments:", error);

        // If table doesn't exist, return empty result
        if (error.code === 'ER_NO_SUCH_TABLE') {
          return res.status(200).json({
            message: [],
            note: "No repayment schedule found - loan_repayments table doesn't exist"
          });
        }

        return res.status(500).json({ message: error.message ?? "Something went wrong" });
      }

      console.log("✅ Admin repayments fetched successfully:", repayments.length);
      res.status(200).json({ message: repayments });
    });
  } catch (error) {
    console.error("❌ Error fetching admin repayments:", error);
    res.status(500).json({ message: error.message ?? "Something went wrong" });
  }
};

// Export the new admin functions
module.exports.updateRepaymentStatus = updateRepaymentStatus;
module.exports.getAdminRepayments = getAdminRepayments;