
const express = require("express")
const {body, param} = require("express-validator")
const { createNewadmin, loginadmin, alladmin, updateadmin, deleteAdmin } = require("../controller/admin.controller")



const adminRouter = express.Router()


adminRouter.post("/new/admin", 
    [
        body("username").notEmpty().withMessage("username required"),
         body("email").notEmpty().withMessage("email required"),
        body("admin_role").notEmpty().withMessage("admin role required"),
         body("mobile").notEmpty().withMessage("mobile required"),
        body("pass_word").notEmpty().withMessage("password required"),
    ],
    createNewadmin)

    adminRouter.post("/admin/login", loginadmin)

     adminRouter.get("/get/admin",alladmin)

     adminRouter.patch("/update/admin/:admin_id",
             [
                 body("username").notEmpty().withMessage("username is required"),
                 body("email").notEmpty().withMessage("invalid email"),
                  body("admin_role").notEmpty().withMessage("invalid admin role"),
                   body("mobile").notEmpty().withMessage("invalid mobile"),
                 param("admin_id").notEmpty().withMessage("invalid parameter").isString().withMessage("Invalid ID")
             ],
             updateadmin)

             
adminRouter.delete("/delete/admin/:admin_id", deleteAdmin);











module.exports = adminRouter