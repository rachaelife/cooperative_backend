const express = require("express");
const { body, param, validationResult } = require("express-validator");
const buildingRouter = express.Router();
const {
  createBuilding,
  getAllBuilding,
  updateBuilding,
  deleteBuilding,
  getTotalBuilding
} = require("../controller/building.controller");

// Create new building savings
buildingRouter.post(
  "/new/building",
  [
    body("user_id").notEmpty().withMessage("User ID is required"),
    body("amount").isNumeric().withMessage("Amount must be a number"),
    body("month_paid").notEmpty().withMessage("Month paid is required"),
    body("payment_type").notEmpty().withMessage("Payment type is required"),
  ],
  createBuilding
);

// Get all building savings
buildingRouter.get("/building", getAllBuilding);

// Get total building savings
buildingRouter.get("/building/total", getTotalBuilding);

// Update building savings
buildingRouter.patch(
  "/update/building/:building_id",
  [
    body("amount").optional().isNumeric().withMessage("Amount must be a number"),
    body("payment_type").optional().notEmpty().withMessage("Payment type is required"),
    param("building_id").notEmpty().withMessage("Building ID is required"),
  ],
  updateBuilding
);

// Delete building savings
buildingRouter.delete(
  "/delete/building/:building_id",
  [
    param("building_id").notEmpty().withMessage("Building ID is required"),
  ],
  deleteBuilding
);

module.exports = buildingRouter;