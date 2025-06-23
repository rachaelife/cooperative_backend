const { DB } = require("../sql");
// Get dashboard statistics
module.exports.getDashboardStats = async (req, res) => {
  try {
    // Get all statistics in parallel using promises
    const [
      totalMembersResult,
      totalSavingsResult,
      totalLoansResult,
      totalLoanAmountResult,
      pendingApplicationsResult,
      totalSharesResult,
      totalBuildingResult,
      totalDevelopmentResult,
      recentMembersResult,
      recentLoansResult
    ] = await Promise.all([
      // Total members
      new Promise((resolve, reject) => {
        DB.query("SELECT COUNT(*) as count FROM users", (err, result) => {
          if (err) reject(err);
          else resolve(result[0].count);
        });
      }),
      // Total savings
      new Promise((resolve, reject) => {
        DB.query("SELECT SUM(amount) as total FROM savings", (err, result) => {
          if (err) reject(err);
          else resolve(result[0].total || 0);
        });
      }),
      // Total loans count
      new Promise((resolve, reject) => {
        DB.query("SELECT COUNT(*) as count FROM loans", (err, result) => {
          if (err) reject(err);
          else resolve(result[0].count);
        });
      }),
      // Total loan amount
      new Promise((resolve, reject) => {
        DB.query("SELECT SUM(amount_disbursed) as total FROM loans", (err, result) => {
          if (err) reject(err);
          else resolve(result[0].total || 0);
        });
      }),
      // Pending loan applications
      new Promise((resolve, reject) => {
        DB.query("SELECT COUNT(*) as count FROM loan_application WHERE loan_status = 'pending'", (err, result) => {
          if (err) reject(err);
          else resolve(result[0].count);
        });
      }),
      // Total shares
      new Promise((resolve, reject) => {
        DB.query("SELECT SUM(amount) as total FROM savings WHERE savings_type = 'shares'", (err, result) => {
          if (err) reject(err);
          else resolve(result[0].total || 0);
        });
      }),
      // Total building fund
      new Promise((resolve, reject) => {
        DB.query("SELECT SUM(amount) as total FROM savings WHERE savings_type = 'building'", (err, result) => {
          if (err) reject(err);
          else resolve(result[0].total || 0);
        });
      }),
      // Total development fund
      new Promise((resolve, reject) => {
        DB.query("SELECT SUM(amount) as total FROM savings WHERE savings_type = 'development'", (err, result) => {
          if (err) reject(err);
          else resolve(result[0].total || 0);
        });
      }),
      // Recent members (last 30 days) - with fallback for missing created_at column
      new Promise((resolve, reject) => {
        // First check if created_at column exists
        DB.query("SHOW COLUMNS FROM users LIKE 'created_at'", (err, columns) => {
          if (err) {
            reject(err);
            return;
          }
          if (columns.length > 0) {
            // created_at column exists
            DB.query("SELECT COUNT(*) as count FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)", (err, result) => {
              if (err) reject(err);
              else resolve(result[0].count);
            });
          } else {
            // created_at column doesn't exist, return 0 or use alternative logic
            resolve(0);
          }
        });
      }),
      // Recent loans (last 30 days) - with fallback for missing created_at column
      new Promise((resolve, reject) => {
        // First check if created_at column exists
        DB.query("SHOW COLUMNS FROM loans LIKE 'created_at'", (err, columns) => {
          if (err) {
            reject(err);
            return;
          }
          if (columns.length > 0) {
            // created_at column exists
            DB.query("SELECT COUNT(*) as count FROM loans WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)", (err, result) => {
              if (err) reject(err);
              else resolve(result[0].count);
            });
          } else {
            // created_at column doesn't exist, return 0 or use alternative logic
            resolve(0);
          }
        });
      })
    ]);
    const dashboardStats = {
      totalMembers: totalMembersResult,
      totalSavings: totalSavingsResult,
      totalLoans: totalLoansResult,
      totalLoanAmount: totalLoanAmountResult,
      pendingApplications: pendingApplicationsResult,
      totalShares: totalSharesResult,
      totalBuilding: totalBuildingResult,
      totalDevelopment: totalDevelopmentResult,
      recentMembers: recentMembersResult,
      recentLoans: recentLoansResult,
      timestamp: new Date().toISOString()
    };
    res.status(200).json({ 
      message: "Dashboard statistics fetched successfully",
      data: dashboardStats 
    });
  } catch (error) {
    res.status(500).json({ 
      message: "Failed to fetch dashboard statistics",
      error: error.message 
    });
  }
};
// Get monthly savings trend
module.exports.getMonthlySavingsTrend = async (req, res) => {
  try {
    // First check if created_at column exists in savings table
    DB.query("SHOW COLUMNS FROM savings LIKE 'created_at'", (err, columns) => {
      if (err) {
        return res.status(500).json({ message: "Failed to check table structure" });
      }
      let sql;
      if (columns.length > 0) {
        // created_at column exists
        sql = `
          SELECT
            MONTH(created_at) as month,
            YEAR(created_at) as year,
            SUM(amount) as total,
            COUNT(*) as count
          FROM savings
          WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
          GROUP BY YEAR(created_at), MONTH(created_at)
          ORDER BY year, month
        `;
      } else {
        // created_at column doesn't exist, use alternative approach
        sql = `
          SELECT
            CASE
              WHEN month_paid = 'January' THEN 1
              WHEN month_paid = 'February' THEN 2
              WHEN month_paid = 'March' THEN 3
              WHEN month_paid = 'April' THEN 4
              WHEN month_paid = 'May' THEN 5
              WHEN month_paid = 'June' THEN 6
              WHEN month_paid = 'July' THEN 7
              WHEN month_paid = 'August' THEN 8
              WHEN month_paid = 'September' THEN 9
              WHEN month_paid = 'October' THEN 10
              WHEN month_paid = 'November' THEN 11
              WHEN month_paid = 'December' THEN 12
              ELSE 1
            END as month,
            YEAR(NOW()) as year,
            SUM(amount) as total,
            COUNT(*) as count
          FROM savings
          WHERE month_paid IS NOT NULL
          GROUP BY month_paid
          ORDER BY month
        `;
      }
      DB.query(sql, (err, results) => {
        if (err) {
          return res.status(500).json({ message: "Failed to fetch savings trend" });
        }
        res.status(200).json({ message: results });
      });
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// Get savings by type
module.exports.getSavingsByType = async (req, res) => {
  try {
    const sql = `
      SELECT 
        savings_type,
        SUM(amount) as total,
        COUNT(*) as count
      FROM savings 
      GROUP BY savings_type
    `;
    DB.query(sql, (err, results) => {
      if (err) {
        return res.status(500).json({ message: "Failed to fetch savings by type" });
      }
      res.status(200).json({ message: results });
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// Get recent activities
module.exports.getRecentActivities = async (req, res) => {
  try {
    const limit = req.query.limit || 10;
    // Check which tables have created_at column
    const checkColumns = async () => {
      const checks = await Promise.all([
        new Promise(resolve => {
          DB.query("SHOW COLUMNS FROM users LIKE 'created_at'", (err, result) => {
            resolve(err ? false : result.length > 0);
          });
        }),
        new Promise(resolve => {
          DB.query("SHOW COLUMNS FROM savings LIKE 'created_at'", (err, result) => {
            resolve(err ? false : result.length > 0);
          });
        }),
        new Promise(resolve => {
          DB.query("SHOW COLUMNS FROM loans LIKE 'created_at'", (err, result) => {
            resolve(err ? false : result.length > 0);
          });
        })
      ]);
      return {
        users: checks[0],
        savings: checks[1],
        loans: checks[2]
      };
    };
    const hasCreatedAt = await checkColumns();
    // Build dynamic SQL based on available columns
    let sqlParts = [];
    let params = [];
    if (hasCreatedAt.users) {
      sqlParts.push(`
        (SELECT
          'member' as type,
          fullname as title,
          'New member registered' as description,
          created_at
        FROM users
        ORDER BY created_at DESC
        LIMIT ?)
      `);
      params.push(limit);
    }
    if (hasCreatedAt.savings) {
      sqlParts.push(`
        (SELECT
          'savings' as type,
          CONCAT('₦', FORMAT(amount, 2)) as title,
          CONCAT('Savings deposit - ', savings_type) as description,
          created_at
        FROM savings
        ORDER BY created_at DESC
        LIMIT ?)
      `);
      params.push(limit);
    }
    if (hasCreatedAt.loans) {
      sqlParts.push(`
        (SELECT
          'loan' as type,
          CONCAT('₦', FORMAT(amount_disbursed, 2)) as title,
          'Loan disbursed' as description,
          created_at
        FROM loans
        ORDER BY created_at DESC
        LIMIT ?)
      `);
      params.push(limit);
    }
    if (sqlParts.length === 0) {
      // No created_at columns found, return empty activities
      return res.status(200).json({ message: [] });
    }
    const sql = sqlParts.join(' UNION ALL ') + ` ORDER BY created_at DESC LIMIT ?`;
    params.push(limit);
    DB.query(sql, params, (err, results) => {
      if (err) {
        return res.status(500).json({ message: "Failed to fetch recent activities" });
      }
      res.status(200).json({ message: results });
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
