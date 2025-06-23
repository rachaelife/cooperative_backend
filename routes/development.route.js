const express = require("express");
const { body, param, validationResult } = require("express-validator");
const developmentRouter = express.Router();
const {
  createDevelopment,
  getAllDevelopment,
  updateDevelopment,
  deleteDevelopment,
  getTotalDevelopment,
  getUserDevelopment
} = require("../controller/development.controller");

// Create new development savings
developmentRouter.post(
  "/new/development",
  [
    body("user_id").notEmpty().withMessage("User ID is required"),
    body("amount").isNumeric().withMessage("Amount must be a number"),
    body("month_paid").notEmpty().withMessage("Month paid is required"),
    body("payment_type").notEmpty().withMessage("Payment type is required"),
  ],
  createDevelopment
);

// Get all development savings
developmentRouter.get("/development", getAllDevelopment);

// Get total development savings
developmentRouter.get("/development/total", getTotalDevelopment);

// Get user development savings
developmentRouter.get("/user/development/:user_id", getUserDevelopment);

// Update development savings
developmentRouter.patch(
  "/update/development/:development_id",
  [
    body("amount").optional().isNumeric().withMessage("Amount must be a number"),
    body("payment_type").optional().notEmpty().withMessage("Payment type is required"),
    param("development_id").notEmpty().withMessage("Development ID is required"),
  ],
  updateDevelopment
);

// Delete development savings
developmentRouter.delete(
  "/delete/development/:development_id",
  [
    param("development_id").notEmpty().withMessage("Development ID is required"),
  ],
  deleteDevelopment
);

module.exports = developmentRouter;
