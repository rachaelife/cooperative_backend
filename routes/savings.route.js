const express = require("express")
const { body , param} = require("express-validator")

const { createnewsavings, getAllsavings, deletesavings, updatesavings } = require("../controller/savings.controller");


const savingsRouter = express.Router()







savingsRouter.post("/new/savings",
    [
      body("user_id").notEmpty().withMessage("user_id empty"), 
      body("amount").notEmpty().withMessage("amount disburded required"), 
      body("month_paid").notEmpty().withMessage("loan repayment required"),
      body("payment_type").notEmpty().withMessage("interest paid required"),
     
    ],
    createnewsavings)


    savingsRouter.get("/savings",getAllsavings)

    savingsRouter.delete("/delete/savings/:savings_id",deletesavings)

     savingsRouter.patch("/update/savings/:savings_id",
            [
                body("amount").notEmpty().withMessage("amount is required"),
                param("savings_id").notEmpty().withMessage("invalid parameter").isString().withMessage("Invalid ID")
            ],
            updatesavings)






    module.exports = savingsRouter 