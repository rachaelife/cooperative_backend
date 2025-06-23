const express = require("express");
const { 
  getDashboardStats, 
  getMonthlySavingsTrend, 
  getSavingsByType, 
  getRecentActivities 
} = require("../controller/dashboard.controller");
const dashboardRouter = express.Router();
// Dashboard statistics endpoint
dashboardRouter.get("/dashboard/stats", getDashboardStats);
// Monthly savings trend
dashboardRouter.get("/dashboard/savings-trend", getMonthlySavingsTrend);
// Savings by type
dashboardRouter.get("/dashboard/savings-by-type", getSavingsByType);
// Recent activities
dashboardRouter.get("/dashboard/recent-activities", getRecentActivities);
module.exports = dashboardRouter;
