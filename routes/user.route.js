const express = require("express");
const {
  createnewuser,
  allusers,
  updateusers,
  deleteuser,
  loginUser,
  getuser,
  getTotalusers,
  checkUserStatus,
  setUserPassword,
  generateRegistrationNumbers,
  resetRegistrationNumbers,
} = require("../controller/user.controller");
const { DB } = require("../sql");
const { body, param } = require("express-validator");

const userRouter = express.Router();

userRouter.post(
  "/new/user",
  [
    body("fullname").notEmpty().withMessage("Fullname required"),
    body("gender").notEmpty().withMessage("gender required"),
    body("mobile").notEmpty().withMessage("mobile required"),
    body("email").notEmpty().withMessage("email required"),
    body("address").notEmpty().withMessage("address required"),
    body("referral").notEmpty().withMessage("referral required"),
    body("registration_number").optional().isLength({ min: 3, max: 50 }).withMessage("Registration number must be between 3 and 50 characters"),
  ],
  createnewuser
);

userRouter.get("/single/user/:user_id", getuser);

userRouter.patch(
  "/update/user/:user_id",
  [
    body("fullname").notEmpty().withMessage("fullname is required"),
    body("gender").notEmpty().withMessage("gender is required"),
    body("mobile")
      .isNumeric()
      .isLength({ min: 11, max: 14 })
      .withMessage("phone number must not be less than 11"),
    body("email").notEmpty().withMessage("invalid email"),
    body("address").optional(), // Made address optional
    body("referral").optional(), // Made referral optional for profile updates
    body("date_of_birth").optional(), // Optional date of birth
    body("occupation").optional(), // Optional occupation
    body("next_of_kin").optional(), // Optional next of kin
    body("next_of_kin_phone").optional(), // Optional next of kin phone
    param("user_id")
      .notEmpty()
      .withMessage("invalid parameter")
      .isString()
      .withMessage("Invalid ID"),
  ],
  updateusers
);

userRouter.get("/get/users", allusers);

userRouter.delete("/delete/:user_id", deleteuser);

// Check if user needs to set password
userRouter.post(
  "/check-user-status",
  [
    body("email_mobile")
      .notEmpty()
      .withMessage("Email or mobile number is required"),
  ],
  checkUserStatus
);

// Set password for first-time users
userRouter.post(
  "/set-password",
  [
    body("user_id").notEmpty().withMessage("User ID is required"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters long"),
    body("confirm_password")
      .notEmpty()
      .withMessage("Password confirmation is required"),
  ],
  setUserPassword
);

// User login
userRouter.post(
  "/login",
  [
    body("email_mobile")
      .notEmpty()
      .withMessage("Email or mobile number is required"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  loginUser
);

userRouter.get("/all/users", getTotalusers);

// New endpoints for enhanced functionality
userRouter.get("/users/search", (req, res) => {
  const { query } = req.query;
  if (!query) {
    return res.status(400).json({ message: "Search query required" });
  }

  const searchQuery = `%${query}%`;
  const sql = `
    SELECT * FROM users
    WHERE fullname LIKE ? OR email LIKE ? OR mobile LIKE ? OR address LIKE ? OR registration_number LIKE ?
    ORDER BY CAST(SUBSTRING(registration_number, 5) AS UNSIGNED) ASC, user_id ASC
  `;

  DB.query(sql, [searchQuery, searchQuery, searchQuery, searchQuery, searchQuery], (err, results) => {
    if (err) {
      console.error("Search error:", err);
      return res.status(500).json({ message: "Search failed" });
    }
    res.status(200).json({ message: results });
  });
});

userRouter.get("/users/filter", (req, res) => {
  const { gender, referral } = req.query;
  let sql = "SELECT * FROM users WHERE 1=1";
  const params = [];

  if (gender) {
    sql += " AND gender = ?";
    params.push(gender);
  }

  if (referral) {
    sql += " AND referral LIKE ?";
    params.push(`%${referral}%`);
  }

  sql += " ORDER BY fullname ASC";

  DB.query(sql, params, (err, results) => {
    if (err) {
      console.error("Filter error:", err);
      return res.status(500).json({ message: "Filter failed" });
    }
    res.status(200).json({ message: results });
  });
});

// Generate registration numbers for existing users
userRouter.post("/generate-registration-numbers", generateRegistrationNumbers);

// Reset and regenerate all registration numbers sequentially from COOP001
userRouter.post("/reset-registration-numbers", resetRegistrationNumbers);

module.exports = userRouter;
