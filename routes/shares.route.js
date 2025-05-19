const express = require("express")
const { body, param } = require("express-validator")
const { createnewshares, getAllshares, deleteshares, updateshares } = require("../controller/shares.controller")




const sharesRouter = express.Router()

sharesRouter.post("/new/shares",
    [
      body("user_id").notEmpty().withMessage("user_id empty"), 
      body("amount").notEmpty().withMessage("amount is required"), 
      body("payment_method").notEmpty().withMessage("shares method required")
    ],
    createnewshares)

    sharesRouter.get("/shares",getAllshares)
    

    sharesRouter.delete("/delete/shares/:shares_id",deleteshares)

    
     sharesRouter.patch("/update/shares/:shares_id",
            [
                body("amount").notEmpty().withMessage("amount is required"),
                param("shares_id").notEmpty().withMessage("invalid parameter").isString().withMessage("Invalid ID")
            ],
            updateshares)





    module.exports = sharesRouter