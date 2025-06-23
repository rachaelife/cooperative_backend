const express = require("express");
const { body, param } = require("express-validator");
const {
  recordRepayment,
  getLoanRepaymentHistory,
  getUserRepaymentHistory,
  getAllRepaymentHistory,
  getNextPayment,
  getUserPendingPayments,
  updateRepaymentStatus,
  getAdminRepayments
} = require("../controller/loan_repayment.controller");

const loanRepaymentRouter = express.Router();

// Record a new loan repayment
loanRepaymentRouter.post(
  "/repayment/record",
  [
    body("loan_id").notEmpty().withMessage("Loan ID is required"),
    body("user_id").notEmpty().withMessage("User ID is required"),
    body("amount").notEmpty().isNumeric().withMessage("Valid payment amount is required"),
    body("payment_date").notEmpty().withMessage("Payment date is required"),
    body("payment_method").notEmpty().withMessage("Payment method is required")
  ],
  recordRepayment
);

// Get repayment history for a specific loan
loanRepaymentRouter.get(
  "/repayment/loan/:loan_id",
  [
    param("loan_id").notEmpty().withMessage("Loan ID is required")
  ],
  getLoanRepaymentHistory
);

// Get repayment history for a specific user
loanRepaymentRouter.get(
  "/repayment/user/:user_id",
  [
    param("user_id").notEmpty().withMessage("User ID is required")
  ],
  getUserRepaymentHistory
);

// Get all repayment history
loanRepaymentRouter.get(
  "/repayment/all",
  getAllRepaymentHistory
);

// Get next payment due for a user
loanRepaymentRouter.get(
  "/repayment/next/:user_id",
  [
    param("user_id").notEmpty().withMessage("User ID is required")
  ],
  getNextPayment
);

// Get all pending payments for a user
loanRepaymentRouter.get(
  "/repayment/pending/:user_id",
  [
    param("user_id").notEmpty().withMessage("User ID is required")
  ],
  getUserPendingPayments
);

// Admin routes for repayment management
// Get all repayments for admin management
loanRepaymentRouter.get(
  "/admin/repayments",
  getAdminRepayments
);

// Update repayment status (Admin only)
loanRepaymentRouter.patch(
  "/admin/repayment/:repayment_id",
  [
    param("repayment_id").notEmpty().withMessage("Repayment ID is required"),
    body("status").notEmpty().withMessage("Status is required")
  ],
  updateRepaymentStatus
);

module.exports = loanRepaymentRouter;