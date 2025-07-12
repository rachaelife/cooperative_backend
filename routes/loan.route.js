const express = require("express")
const { body, param} = require("express-validator")
const { createnewloan, getAllLoans, getUserLoans, deleteloan, updateloans, disburseLoan, recordLoanRepayment, getLoanInstallments, getTotalLoans, getTotalLoanAmount, getTotalLoanApplications, getCompletedLoans } = require("../controller/loan.controller")




const loanRouter = express.Router()

loanRouter.post("/new/loan",
    [
      body("user_id").notEmpty().withMessage("user_id empty"), 
      body("amount_disbursed").notEmpty().withMessage("amount disburded required"), 
      body("loan_repayment").notEmpty().withMessage("loan repayment required"),
      body("interest_paid").notEmpty().withMessage("interest paid required"),
      body("payment_method").notEmpty().withMessage("payment method required"),
      body("status").notEmpty().withMessage("status required")
    ],
    createnewloan)

loanRouter.post("/disburse/loan",
    [
      body("user_id").notEmpty().withMessage("User ID is required"), 
      body("amount_disbursed").notEmpty().withMessage("Loan amount is required"),
      body("date").notEmpty().withMessage("Disbursement date is required"),
      body("loan_repayment").notEmpty().withMessage("Loan repayment amount is required"),
      body("total_interest").notEmpty().withMessage("Total interest is required")
    ],
    disburseLoan)

loanRouter.post("/repay/loan",
    [
      body("loan_id").notEmpty().withMessage("Loan ID is required"),
      body("amount").notEmpty().withMessage("Payment amount is required"),
      body("payment_date").notEmpty().withMessage("Payment date is required"),
      body("payment_method").notEmpty().withMessage("Payment method is required")
    ],
    recordLoanRepayment)

loanRouter.get("/loans",getAllLoans)

loanRouter.get("/loans/completed", getCompletedLoans)

loanRouter.get("/loans/user/:user_id", getUserLoans)

loanRouter.get("/loan/installments/:loan_id", getLoanInstallments)

// Statistics endpoints
loanRouter.get("/loans/total", getTotalLoans)
loanRouter.get("/loans/total-amount", getTotalLoanAmount)
loanRouter.get("/loan-applications/total", getTotalLoanApplications)

loanRouter.delete("/delete/loan/:loan_id",deleteloan)


 loanRouter.patch("/update/loans/:loan_id",
        [
            body("amount_disbursed").notEmpty().withMessage("amount_disbursed is required"),
            body("loan_repayment").isNumeric().isLength({min:2, max:14}).withMessage("loan_repayment is required"),
            body("status").notEmpty().withMessage("status is required"),
            param("loan_id").notEmpty().withMessage("invalid parameter").isString().withMessage("Invalid ID")
        ],
        updateloans)


 

    module.exports = loanRouter