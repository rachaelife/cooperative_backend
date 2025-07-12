// Simple, clean update function to replace the complex one
const { validationResult } = require("express-validator");
const { DB } = require("../sql");

module.exports.updateloan_applicationstatus = (req, res) => {
  const { loan_application_id } = req.params;
  const { loan_status } = req.body;
  const errorResponse = validationResult(req);

  console.log("🚀 === LOAN UPDATE STARTED ===");
  console.log("✏️ Updating loan application:", loan_application_id, "to status:", loan_status);

  try {
    if (!errorResponse.isEmpty()) {
      console.log("❌ Validation errors:", errorResponse.array());
      return res.status(400).json({ error: errorResponse.array() });
    }

    // Update the loan application status
    DB.query(
      "UPDATE loan_application SET loan_status = ? WHERE loan_application_id = ?",
      [loan_status, loan_application_id],
      (error, result) => {
        if (error) {
          console.error("❌ Error updating loan application:", error);
          return res.status(500).json({ message: error.message ?? "Something went wrong" });
        }

        if (result.affectedRows === 0) {
          console.log("❌ No rows affected - application not found");
          return res.status(404).json({ message: "Loan application not found" });
        }

        console.log("✅ Loan application status updated successfully");
        console.log("✅ Affected rows:", result.affectedRows);

        // If loan is approved, create loan entry
        if (loan_status === 'approved') {
          console.log("🔄 Loan approved! Starting disbursement...");
          
          // Get application details
          DB.query(
            "SELECT * FROM loan_application WHERE loan_application_id = ?",
            [loan_application_id],
            (appError, applications) => {
              if (appError || applications.length === 0) {
                console.error("❌ Error fetching application:", appError);
                return res.status(200).json({ message: "Loan status updated" });
              }

              const application = applications[0];
              console.log("📋 Found application for user:", application.user_id);

              // Create simple loan entry
              DB.query(
                "INSERT INTO loans (user_id, amount_disbursed, loan_repayment, remaining_balance, status, disbursement_date) VALUES (?,?,?,?,?,?)",
                [
                  application.user_id,
                  application.loan_amount,
                  0,
                  application.loan_amount,
                  'active',
                  new Date().toISOString().split('T')[0]
                ],
                (loanError, loanResult) => {
                  if (loanError) {
                    console.error("❌ Error creating loan:", loanError);
                    return res.status(200).json({ 
                      message: "Loan status updated but failed to create loan entry",
                      error: loanError.message 
                    });
                  }

                  console.log("✅ Loan created with ID:", loanResult.insertId);

                  // Update application status to disbursed
                  DB.query(
                    "UPDATE loan_application SET loan_status = 'disbursed' WHERE loan_application_id = ?",
                    [loan_application_id],
                    (updateError) => {
                      if (updateError) {
                        console.error("❌ Error updating to disbursed:", updateError);
                      } else {
                        console.log("✅ Application status updated to disbursed");
                      }

                      return res.status(200).json({
                        message: "Loan approved and disbursed successfully",
                        loan_id: loanResult.insertId,
                        status: "disbursed"
                      });
                    }
                  );
                }
              );
            }
          );
        } else {
          // If not approved, just send success response
          return res.status(200).json({ 
            message: "Loan status updated successfully",
            status: loan_status 
          });
        }
      }
    );
  } catch (error) {
    console.error("❌ Unexpected error:", error);
    return res.status(500).json({ message: error.message ?? "Something went wrong" });
  }
};
