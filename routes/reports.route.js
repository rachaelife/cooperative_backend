const express = require("express");
const { 
  getFinancialSummary, 
  getMemberActivityReport, 
  getLoanPerformanceReport 
} = require("../controller/reports.controller");
const reportsRouter = express.Router();
// Financial summary report
reportsRouter.get("/reports/financial-summary", getFinancialSummary);
// Member activity report
reportsRouter.get("/reports/member-activity/:user_id", getMemberActivityReport);
// Loan performance report
reportsRouter.get("/reports/loan-performance", getLoanPerformanceReport);
module.exports = reportsRouter;
