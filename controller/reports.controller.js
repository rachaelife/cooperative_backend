const { DB } = require("../sql");
// Generate financial summary report
module.exports.getFinancialSummary = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    let dateFilter = "";
    let params = [];
    if (start_date && end_date) {
      dateFilter = " WHERE DATE(created_at) BETWEEN ? AND ?";
      params = [start_date, end_date];
    }
    // Get financial summary data
    const [
      totalSavingsResult,
      totalLoansResult,
      totalRepaymentsResult,
      savingsByTypeResult,
      loansByStatusResult,
      monthlyTrendsResult
    ] = await Promise.all([
      // Total savings
      new Promise((resolve, reject) => {
        DB.query(`SELECT SUM(amount) as total FROM savings${dateFilter}`, params, (err, result) => {
          if (err) reject(err);
          else resolve(result[0].total || 0);
        });
      }),
      // Total loans disbursed
      new Promise((resolve, reject) => {
        DB.query(`SELECT SUM(amount_disbursed) as total FROM loans${dateFilter}`, params, (err, result) => {
          if (err) reject(err);
          else resolve(result[0].total || 0);
        });
      }),
      // Total repayments
      new Promise((resolve, reject) => {
        DB.query(`SELECT SUM(loan_repayment) as total FROM loans${dateFilter}`, params, (err, result) => {
          if (err) reject(err);
          else resolve(result[0].total || 0);
        });
      }),
      // Savings by type
      new Promise((resolve, reject) => {
        DB.query(`
          SELECT savings_type, SUM(amount) as total, COUNT(*) as count 
          FROM savings${dateFilter} 
          GROUP BY savings_type
        `, params, (err, result) => {
          if (err) reject(err);
          else resolve(result);
        });
      }),
      // Loans by status
      new Promise((resolve, reject) => {
        DB.query(`
          SELECT status, COUNT(*) as count, SUM(amount_disbursed) as total 
          FROM loans${dateFilter} 
          GROUP BY status
        `, params, (err, result) => {
          if (err) reject(err);
          else resolve(result);
        });
      }),
      // Monthly trends
      new Promise((resolve, reject) => {
        DB.query(`
          SELECT 
            YEAR(created_at) as year,
            MONTH(created_at) as month,
            'savings' as type,
            SUM(amount) as total
          FROM savings${dateFilter}
          GROUP BY YEAR(created_at), MONTH(created_at)
          UNION ALL
          SELECT 
            YEAR(created_at) as year,
            MONTH(created_at) as month,
            'loans' as type,
            SUM(amount_disbursed) as total
          FROM loans${dateFilter}
          GROUP BY YEAR(created_at), MONTH(created_at)
          ORDER BY year, month
        `, params, (err, result) => {
          if (err) reject(err);
          else resolve(result);
        });
      })
    ]);
    const report = {
      summary: {
        totalSavings: totalSavingsResult,
        totalLoans: totalLoansResult,
        totalRepayments: totalRepaymentsResult,
        netPosition: totalSavingsResult - totalLoansResult + totalRepaymentsResult
      },
      savingsByType: savingsByTypeResult,
      loansByStatus: loansByStatusResult,
      monthlyTrends: monthlyTrendsResult,
      generatedAt: new Date().toISOString(),
      period: start_date && end_date ? { start_date, end_date } : 'All time'
    };
    res.status(200).json({
      message: "Financial summary generated successfully",
      data: report
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to generate financial summary",
      error: error.message
    });
  }
};
// Generate member activity report
module.exports.getMemberActivityReport = async (req, res) => {
  try {
    const { user_id } = req.params;
    const { start_date, end_date } = req.query;
    let dateFilter = "";
    let params = [user_id];
    if (start_date && end_date) {
      dateFilter = " AND DATE(s.created_at) BETWEEN ? AND ?";
      params.push(start_date, end_date);
    }
    // Get member activity data
    const [memberInfo, savingsHistory, loansHistory] = await Promise.all([
      // Member information
      new Promise((resolve, reject) => {
        DB.query("SELECT * FROM users WHERE user_id = ?", [user_id], (err, result) => {
          if (err) reject(err);
          else resolve(result[0] || null);
        });
      }),
      // Savings history
      new Promise((resolve, reject) => {
        DB.query(`
          SELECT s.*, s.created_at as transaction_date
          FROM savings s
          WHERE s.user_id = ?${dateFilter}
          ORDER BY s.created_at DESC
        `, params, (err, result) => {
          if (err) reject(err);
          else resolve(result);
        });
      }),
      // Loans history
      new Promise((resolve, reject) => {
        DB.query(`
          SELECT l.*, l.created_at as transaction_date
          FROM loans l
          WHERE l.user_id = ?${dateFilter}
          ORDER BY l.created_at DESC
        `, params, (err, result) => {
          if (err) reject(err);
          else resolve(result);
        });
      })
    ]);
    if (!memberInfo) {
      return res.status(404).json({ message: "Member not found" });
    }
    // Calculate totals
    const totalSavings = savingsHistory.reduce((sum, saving) => sum + parseFloat(saving.amount), 0);
    const totalLoans = loansHistory.reduce((sum, loan) => sum + parseFloat(loan.amount_disbursed), 0);
    const totalRepayments = loansHistory.reduce((sum, loan) => sum + parseFloat(loan.loan_repayment || 0), 0);
    const report = {
      member: memberInfo,
      summary: {
        totalSavings,
        totalLoans,
        totalRepayments,
        netPosition: totalSavings - totalLoans + totalRepayments,
        savingsCount: savingsHistory.length,
        loansCount: loansHistory.length
      },
      savingsHistory,
      loansHistory,
      generatedAt: new Date().toISOString(),
      period: start_date && end_date ? { start_date, end_date } : 'All time'
    };
    res.status(200).json({
      message: "Member activity report generated successfully",
      data: report
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to generate member activity report",
      error: error.message
    });
  }
};
// Generate loan performance report
module.exports.getLoanPerformanceReport = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    let dateFilter = "";
    let params = [];
    if (start_date && end_date) {
      dateFilter = " WHERE DATE(l.created_at) BETWEEN ? AND ?";
      params = [start_date, end_date];
    }
    // Get loan performance data
    const [
      loanSummary,
      repaymentRate,
      defaultedLoans,
      topBorrowers
    ] = await Promise.all([
      // Loan summary
      new Promise((resolve, reject) => {
        DB.query(`
          SELECT 
            COUNT(*) as total_loans,
            SUM(amount_disbursed) as total_disbursed,
            SUM(loan_repayment) as total_repaid,
            AVG(amount_disbursed) as avg_loan_amount,
            SUM(remaining_balance) as total_outstanding
          FROM loans l${dateFilter}
        `, params, (err, result) => {
          if (err) reject(err);
          else resolve(result[0]);
        });
      }),
      // Repayment rate by status
      new Promise((resolve, reject) => {
        DB.query(`
          SELECT 
            status,
            COUNT(*) as count,
            SUM(amount_disbursed) as total_amount,
            SUM(loan_repayment) as total_repaid,
            ROUND((SUM(loan_repayment) / SUM(amount_disbursed)) * 100, 2) as repayment_percentage
          FROM loans l${dateFilter}
          GROUP BY status
        `, params, (err, result) => {
          if (err) reject(err);
          else resolve(result);
        });
      }),
      // Defaulted loans
      new Promise((resolve, reject) => {
        DB.query(`
          SELECT l.*, u.fullname, u.mobile
          FROM loans l
          JOIN users u ON l.user_id = u.user_id
          WHERE l.status = 'defaulted'${dateFilter ? ' AND' + dateFilter.substring(6) : ''}
          ORDER BY l.amount_disbursed DESC
        `, params, (err, result) => {
          if (err) reject(err);
          else resolve(result);
        });
      }),
      // Top borrowers
      new Promise((resolve, reject) => {
        DB.query(`
          SELECT 
            u.fullname,
            u.mobile,
            COUNT(l.loan_id) as loan_count,
            SUM(l.amount_disbursed) as total_borrowed,
            SUM(l.loan_repayment) as total_repaid
          FROM loans l
          JOIN users u ON l.user_id = u.user_id${dateFilter}
          GROUP BY l.user_id, u.fullname, u.mobile
          ORDER BY total_borrowed DESC
          LIMIT 10
        `, params, (err, result) => {
          if (err) reject(err);
          else resolve(result);
        });
      })
    ]);
    const report = {
      summary: loanSummary,
      repaymentRate,
      defaultedLoans,
      topBorrowers,
      generatedAt: new Date().toISOString(),
      period: start_date && end_date ? { start_date, end_date } : 'All time'
    };
    res.status(200).json({
      message: "Loan performance report generated successfully",
      data: report
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to generate loan performance report",
      error: error.message
    });
  }
};
