const express = require("express")
const cors = require("cors")
const path = require("path")
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

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))
const PORT = 8000
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

// Add database health check endpoint
app.get('/health/database', (req, res) => {
  console.log("🔍 Database health check requested");

  DB.query("SELECT 1 as test", (err, result) => {
    if (err) {
      console.error("❌ Database health check failed:", err.message);
      res.status(500).json({
        status: 'ERROR',
        message: 'Database connection failed',
        error: err.message,
        code: err.code
      });
    } else {
      console.log("✅ Database health check passed");

      // Check for approved loans
      DB.query("SELECT COUNT(*) as count FROM loan_application WHERE loan_status = 'approved'", (err2, result2) => {
        if (err2) {
          res.status(200).json({
            status: 'PARTIAL',
            message: 'Database connected but table check failed',
            database_connection: 'OK',
            table_check: 'FAILED',
            error: err2.message
          });
        } else {
          res.status(200).json({
            status: 'OK',
            message: 'Database fully operational',
            database_connection: 'OK',
            table_check: 'OK',
            approved_loans: result2[0].count,
            timestamp: new Date().toISOString()
          });
        }
      });
    }
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
