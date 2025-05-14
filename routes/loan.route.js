const express = require("express")
const { body, param} = require("express-validator")
const { createnewloan, getAllLoans, deleteloan, updateloans } = require("../controller/loan.controller")






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

loanRouter.get("/loans",getAllLoans)

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