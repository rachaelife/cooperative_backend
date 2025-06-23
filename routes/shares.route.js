const express = require("express");
const { body, param } = require("express-validator");
const {
  createnewshares,
  getAllShares,
  deleteShares,
  updateShares,
  getTotalShares,
  getUserShares
} = require("../controller/shares.controller");

const sharesRouter = express.Router();

// Create new shares
sharesRouter.post(
  "/new/shares",
  [
    body("user_id").notEmpty().withMessage("User ID is required"),
    body("amount").isNumeric().withMessage("Amount must be a number"),
    body("payment_method").notEmpty().withMessage("Payment method is required"),
  ],
  createnewshares
);

// Get all shares
sharesRouter.get("/shares", getAllShares);

// Get total shares
sharesRouter.get("/shares/total", getTotalShares);

// Get user shares
sharesRouter.get("/user/shares/:user_id", getUserShares);

// Update shares
sharesRouter.patch(
  "/update/shares/:shares_id",
  [
    body("amount").optional().isNumeric().withMessage("Amount must be a number"),
    body("payment_method").optional().notEmpty().withMessage("Payment method is required"),
    param("shares_id").notEmpty().withMessage("Shares ID is required"),
  ],
  updateShares
);

// Delete shares
sharesRouter.delete(
  "/delete/shares/:shares_id",
  [
    param("shares_id").notEmpty().withMessage("Shares ID is required"),
  ],
  deleteShares
);

module.exports = sharesRouter;