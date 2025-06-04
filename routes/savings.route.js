const express = require("express");
const { body, param } = require("express-validator");

const {
  createnewsavings,
  getAllsavings,
  deletesavings,
  updatesavings,
  getsavingstype,
  getbuilding,
  getdevelopment,
  getshares,
  getsavings,
  getUserSavings,
  getTotalDev,
  getTotalsavings,
  getTotalbuilding,
  getTotalshares,
} = require("../controller/savings.controller");

const savingsRouter = express.Router();

savingsRouter.post(
  "/new/savings",
  [
    body("user_id").notEmpty().withMessage("user_id empty"),
    body("amount").notEmpty().withMessage("amount disburded required"),
    body("month_paid").notEmpty().withMessage("loan repayment required"),
    body("payment_type").notEmpty().withMessage("interest paid required"),
    body("savings_type").notEmpty().withMessage("saving type required"),
  ],
  createnewsavings
);

savingsRouter.get("/allsavings", getAllsavings);

savingsRouter.get("/shares", getshares);

savingsRouter.get("/building", getbuilding);

savingsRouter.get("/development", getdevelopment);

savingsRouter.get("/savings", getsavings);
savingsRouter.get("/user/savings/:id", getUserSavings);

savingsRouter.delete("/delete/savings/:savings_id", deletesavings);

savingsRouter.patch(
  "/update/savings/:savings_id",
  [
    body("amount").notEmpty().withMessage("amount is required"),
    body("savings_type").notEmpty().withMessage("savings type is required"),
    param("savings_id")
      .notEmpty()
      .withMessage("invalid parameter")
      .isString()
      .withMessage("Invalid ID"),
  ],
  updatesavings
);
savingsRouter.get("/user/dev", getTotalDev);


savingsRouter.get("/user/savings", getTotalsavings);


savingsRouter.get("/user/building", getTotalbuilding);


savingsRouter.get("/user/shares", getTotalshares);
module.exports = savingsRouter;
