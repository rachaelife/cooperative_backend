const express = require("express")
const { createnewuser, allusers, updateusers, deleteuser, loginUser } = require("../controller/user.controller")
const {body, param} = require("express-validator")





const userRouter = express.Router()

userRouter.post("/new/user", 
    [
        body("fullname").notEmpty().withMessage("Fullname required"),
        body("gender").notEmpty().withMessage("gender required"),
        body("mobile").notEmpty().withMessage("mobile required"),
        body("email").notEmpty().withMessage("email required"),
        body("address").notEmpty().withMessage("address required"),
        body("referral").notEmpty().withMessage("referral required"),
        
    ],
    createnewuser)





    userRouter.patch("/update/user/:user_id",
        [
            body("fullname").notEmpty().withMessage("fullname is required"),
            body("mobile").isNumeric().isLength({min:11, max:14}).withMessage("phone number must not be less than 11"),
            body("email").notEmpty().withMessage("invalid email"),
            param("user_id").notEmpty().withMessage("invalid parameter").isString().withMessage("Invalid ID")
        ],
        updateusers)

    userRouter.get("/get/users",allusers)

    userRouter.delete("/delete/:user_id", deleteuser)

    userRouter.post("/user",
         [
       body('email_username').notEmpty().withMessage('Email or Username is required'),
       body('password').notEmpty().withMessage('Password is required')
   ], 
        loginUser)




module.exports = userRouter