const express = require("express")
const { body, param } = require("express-validator")
const { createnewloan_application, updateloan_applicationstatus, getAllapplication, deleteapplication } = require("../controller/loanapplication.controller")

const loan_applicationRouter = express.Router()



loan_applicationRouter.post("/new/loan_application",
    [
      body("user_id").notEmpty().withMessage("user_id empty"),
      body("loan_amount")
        .notEmpty().withMessage("loan amount is required")
        .isNumeric().withMessage("loan amount must be a number")
        .custom((value) => {
          const amount = parseFloat(value);
          if (amount < 1000) {
            throw new Error('Minimum loan amount is ₦1,000');
          }
          if (amount > 10000000) {
            throw new Error('Maximum loan amount is ₦10,000,000');
          }
          return true;
        }),
       body("loan_term")
        .notEmpty().withMessage("loan term is required")
        .isNumeric().withMessage("loan term must be a number")
        .custom((value) => {
          const term = parseInt(value);
          if (term < 1 || term > 60) {
            throw new Error('Loan term must be between 1 and 60 months');
          }
          return true;
        }),
        body("loan_purpose").notEmpty().withMessage("loan purpose is required")
    ],
    createnewloan_application)


    loan_applicationRouter.patch("/update/loan_application/:loan_application_id",
        [
            body("loan_status").notEmpty().withMessage("loan pending"),
            param("loan_application_id").notEmpty().withMessage("invalid parameter").isString().withMessage("Invalid ID")
        ],
        updateloan_applicationstatus)

    // Also support PUT method for loan application status updates
    loan_applicationRouter.put("/update/loan_application/:loan_application_id",
        [
            body("loan_status").notEmpty().withMessage("loan pending"),
            param("loan_application_id").notEmpty().withMessage("invalid parameter").isString().withMessage("Invalid ID")
        ],
        updateloan_applicationstatus)

        loan_applicationRouter.get("/application",getAllapplication)

        // Get loan applications for a specific user
        loan_applicationRouter.get("/application/user/:user_id", (req, res) => {
          const { user_id } = req.params;
          console.log("🔍 Fetching loan applications for user:", user_id);

          try {
            if (!user_id) {
              return res.status(400).json({ message: "User ID is required" });
            }

            const { DB } = require("../sql");
            DB.query(
              `SELECT la.*, u.fullname, u.email, u.mobile
               FROM loan_application la
               LEFT JOIN users u ON la.user_id = u.user_id
               WHERE la.user_id = ?
               ORDER BY la.loan_application_id DESC`,
              [user_id],
              (error, applications) => {
                if (error) {
                  console.error("❌ Error fetching user loan applications:", error);
                  res.status(500).json({ message: error.message ?? "something went wrong" });
                } else {
                  console.log("✅ User loan applications found:", applications.length);
                  res.status(200).json({ message: applications });
                }
              }
            );
          } catch (error) {
            console.error("❌ Error in getUserLoanApplications:", error);
            res.status(500).json({ message: error.message ?? "Something went wrong" });
          }
        });

        loan_applicationRouter.delete("/delete/application/:loan_application_id",deleteapplication)













module.exports = loan_applicationRouter