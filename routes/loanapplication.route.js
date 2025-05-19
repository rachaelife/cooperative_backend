const express = require("express")
const { body, param } = require("express-validator")
const { createnewloan_application, updateloan_applicationstatus, getAllapplication, deleteapplication } = require("../controller/loanapplication.controller")

const loan_applicationRouter = express.Router()



loan_applicationRouter.post("/new/loan_application",
    [
      body("user_id").notEmpty().withMessage("user_id empty"), 
      body("loan_amount").notEmpty().withMessage(" loan amount is required"), 
       body("loan_term").notEmpty().withMessage(" loan term is required"),
        body("loan_purpose").notEmpty().withMessage(" loan purpose is required"),
      body("loan_status").notEmpty().withMessage("loan status required")
    ],
    createnewloan_application)


    loan_applicationRouter.patch("/update/loan_application/:loan_application_id",
        [
            body("loan_status").notEmpty().withMessage("loan pending"),
            param("loan_application_id").notEmpty().withMessage("invalid parameter").isString().withMessage("Invalid ID")
        ],
        updateloan_applicationstatus)

        loan_applicationRouter.get("/application",getAllapplication)

        loan_applicationRouter.delete("/delete/application/:loan_application_id",deleteapplication)













module.exports = loan_applicationRouter