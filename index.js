const express = require("express")
const cors = require("cors")
const app = express()
require('dotenv').config()
const { DB } = require("./sql") 
const userRouter = require("./routes/user.route")
const loanRouter = require("./routes/loan.route")
const savingsRouter = require("./routes/savings.route")
const sharesRouter = require("./routes/shares.route")
const loan_applicationRouter = require("./routes/loanapplication.route")
const adminRouter = require("./routes/admin.route")



app.use(cors())
app.use(express.json())
app.use(express.urlencoded({extended:true}))



const PORT = process.env.PORT || 9000


app.use("/", userRouter)
app.use("/", loanRouter)
app.use("/", savingsRouter)
app.use("/", sharesRouter)
app.use("/", loan_applicationRouter)
app.use("/", adminRouter)



app.listen(PORT, ()=> console.log(`server running on port: ${PORT}`))