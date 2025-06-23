const express = require("express")
const cors = require("cors")
const app = express()
require('dotenv').config()
const { DB } = require("./sql") 
const userRouter = require("./routes/user.route")
const loanRouter = require("./routes/loan.route")
const savingsRouter = require("./routes/savings.route")
const sharesRouter = require("./routes/shares.route")
const buildingRouter = require("./routes/building.route")
const developmentRouter = require("./routes/development.route")
const loan_applicationRouter = require("./routes/loanapplication.route")
const adminRouter = require("./routes/admin.route")
const loanRepaymentRouter = require("./routes/loan_repayment.route")
const dashboardRouter = require("./routes/dashboard.route")
const uploadRouter = require("./routes/upload.route")
const reportsRouter = require("./routes/reports.route")
const { runDatabaseInit } = require('./database/init')
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({extended:true}))
const PORT = process.env.PORT || 9000
// Add basic health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});
// Add simple test endpoint
app.get('/test', (req, res) => {
  res.status(200).json({
    message: 'Backend server is working!',
    port: PORT,
    timestamp: new Date().toISOString()
  });
});
// Initialize database on server start (async, don't wait)
// initializeDatabase().catch(error => {
//   // });
app.use("/", userRouter);
app.use("/", loanRouter);
app.use("/", savingsRouter);
app.use("/", sharesRouter);
app.use("/", buildingRouter);
app.use("/", developmentRouter);
app.use("/", loan_applicationRouter);
app.use("/", adminRouter);
app.use("/", loanRepaymentRouter);
app.use("/", dashboardRouter);
app.use("/", uploadRouter);
app.use("/", reportsRouter);
// Global error handler
app.use((error, req, res, next) => {
  res.status(500).json({
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});
// Start server with database initialization
const startServer = async () => {
  try {
    // Initialize database first
    await runDatabaseInit();
    // Start server
    const server = app.listen(PORT, () => {
      });
    // Handle server errors
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        }
    });
    // Graceful shutdown
    process.on('SIGINT', () => {
      server.close(() => {
        process.exit(0);
      });
    });
  } catch (error) {
    process.exit(1);
  }
};
// Start the application
startServer();
