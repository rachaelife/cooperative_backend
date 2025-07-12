const express = require("express");
const { body, param } = require("express-validator");
const { DB } = require("../sql");
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
  getAllTotalSavings,
  getCurrentMonthSavings,
  getAverageRegularSavings,
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

// New endpoints for savings statistics
savingsRouter.get("/savings/total", getAllTotalSavings);
savingsRouter.get("/savings/current-month", getCurrentMonthSavings);
savingsRouter.get("/savings/average-regular", getAverageRegularSavings);
// Search and filter endpoints
savingsRouter.get("/savings/search", (req, res) => {
  const { query } = req.query;
  if (!query) {
    return res.status(400).json({ message: "Search query required" });
  }

  const searchQuery = `%${query}%`;
  const isNumeric = /^\d+$/.test(query); // Check if query is purely numeric

  let sql;
  let params;

  if (isNumeric) {
    // For numeric queries, search exact amount match and partial text matches for other fields
    sql = `
      SELECT s.*, u.fullname, u.gender, u.mobile as phonenumber, u.email
      FROM savings s
      JOIN users u ON s.user_id = u.user_id
      WHERE (u.fullname LIKE ?
             OR s.savings_type LIKE ?
             OR s.payment_type LIKE ?
             OR s.month_paid LIKE ?
             OR s.amount = ?
             OR DATE_FORMAT(s.created_at, '%Y-%m-%d') LIKE ?
             OR DATE_FORMAT(s.created_at, '%M %Y') LIKE ?
             OR u.email LIKE ?
             OR u.mobile LIKE ?)
      AND s.savings_type = 'savings'
      ORDER BY s.created_at DESC
    `;
    params = [searchQuery, searchQuery, searchQuery, searchQuery, query, searchQuery, searchQuery, searchQuery, searchQuery];
  } else {
    // For non-numeric queries, use LIKE for all fields including amount
    sql = `
      SELECT s.*, u.fullname, u.gender, u.mobile as phonenumber, u.email
      FROM savings s
      JOIN users u ON s.user_id = u.user_id
      WHERE (u.fullname LIKE ?
             OR s.savings_type LIKE ?
             OR s.payment_type LIKE ?
             OR s.month_paid LIKE ?
             OR s.amount LIKE ?
             OR DATE_FORMAT(s.created_at, '%Y-%m-%d') LIKE ?
             OR DATE_FORMAT(s.created_at, '%M %Y') LIKE ?
             OR u.email LIKE ?
             OR u.mobile LIKE ?)
      AND s.savings_type = 'savings'
      ORDER BY s.created_at DESC
    `;
    params = [searchQuery, searchQuery, searchQuery, searchQuery, searchQuery, searchQuery, searchQuery, searchQuery, searchQuery];
  }

  DB.query(sql, params, (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Search failed" });
    }
    res.status(200).json({ message: results });
  });
});
savingsRouter.get("/savings/filter", (req, res) => {
  const { savings_type, payment_type, month_paid } = req.query;
  let sql = `
    SELECT s.*, u.fullname, u.gender, u.mobile as phonenumber, u.email
    FROM savings s
    JOIN users u ON s.user_id = u.user_id
    WHERE 1=1
  `;
  const params = [];
  if (savings_type) {
    sql += " AND s.savings_type = ?";
    params.push(savings_type);
  }
  if (payment_type) {
    sql += " AND s.payment_type = ?";
    params.push(payment_type);
  }
  if (month_paid) {
    sql += " AND s.month_paid = ?";
    params.push(month_paid);
  }
  sql += " ORDER BY s.created_at DESC";
  DB.query(sql, params, (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Filter failed" });
    }
    res.status(200).json({ message: results });
  });
});
module.exports = savingsRouter;
