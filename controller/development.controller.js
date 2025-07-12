 const { validationResult } = require("express-validator");
const { DB } = require("../sql");

// Create new development savings
// Simple test endpoint
module.exports.testDevelopment = (req, res) => {
  console.log("🧪 Development test endpoint called");
  console.log("📦 Request body:", req.body);
  console.log("🔑 Request headers:", req.headers);

  return res.status(200).json({
    message: "Development endpoint is working!",
    timestamp: new Date().toISOString(),
    body: req.body,
    method: req.method
  });
};

module.exports.createDevelopment = (req, res) => {
  const { user_id, amount, month_paid, payment_type } = req.body;
  const errorResponse = validationResult(req);

  try {
    if (!errorResponse.isEmpty()) {
      return res.status(400).json({ message: errorResponse.errors[0].msg });
    }

    DB.query(
      "INSERT INTO development (user_id, amount, month_paid, payment_type) VALUES (?, ?, ?, ?)",
      [user_id, amount, month_paid, payment_type],
      (error, result) => {
        if (error) {
          res.status(500).json({ message: "Unable to add development savings" });
        } else {
          res.status(200).json({ message: "Development savings added successfully" });
        }
      }
    );
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

// Get all development savings
module.exports.getAllDevelopment = (req, res) => {
  try {
    DB.query(
      `SELECT d.*, u.fullname 
       FROM development d 
       LEFT JOIN users u ON d.user_id = u.user_id 
       ORDER BY d.created_at DESC`,
      (error, developments) => {
        if (error) {
          res.status(500).json({ message: "Unable to fetch development savings" });
        } else {
          res.status(200).json({ message: developments });
        }
      }
    );
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

// Get total development savings
module.exports.getTotalDevelopment = (req, res) => {
  try {
    DB.query(
      "SELECT SUM(amount) as total FROM development",
      (error, result) => {
        if (error) {
          res.status(500).json({ message: "Unable to fetch total development savings" });
        } else {
          const total = result[0]?.total || 0;
          res.status(200).json({ message: { total } });
        }
      }
    );
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

// Get user development savings
module.exports.getUserDevelopment = (req, res) => {
  const { user_id } = req.params;

  try {
    DB.query(
      "SELECT * FROM development WHERE user_id = ? ORDER BY created_at DESC",
      [user_id],
      (error, developments) => {
        if (error) {
          res.status(500).json({ message: "Unable to fetch user development savings" });
        } else {
          res.status(200).json({ message: developments });
        }
      }
    );
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

// Update development savings
module.exports.updateDevelopment = (req, res) => {
  const { development_id } = req.params;
  const { amount, payment_type } = req.body;
  const errorResponse = validationResult(req);

  try {
    if (!errorResponse.isEmpty()) {
      return res.status(400).json({ message: errorResponse.errors[0].msg });
    }

    const updateFields = [];
    const updateValues = [];

    if (amount !== undefined) {
      updateFields.push('amount = ?');
      updateValues.push(amount);
    }
    if (payment_type !== undefined) {
      updateFields.push('payment_type = ?');
      updateValues.push(payment_type);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }

    updateValues.push(development_id);

    DB.query(
      `UPDATE development SET ${updateFields.join(', ')} WHERE development_id = ?`,
      updateValues,
      (error, result) => {
        if (error) {
          res.status(500).json({ message: "Unable to update development savings" });
        } else if (result.affectedRows === 0) {
          res.status(404).json({ message: "Development savings not found" });
        } else {
          res.status(200).json({ message: "Development savings updated successfully" });
        }
      }
    );
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

// Delete development savings
module.exports.deleteDevelopment = (req, res) => {
  const { development_id } = req.params;
  const errorResponse = validationResult(req);

  try {
    if (!errorResponse.isEmpty()) {
      return res.status(400).json({ message: errorResponse.errors[0].msg });
    }

    DB.query(
      "DELETE FROM development WHERE development_id = ?",
      [development_id],
      (error, result) => {
        if (error) {
          res.status(500).json({ message: "Unable to delete development savings" });
        } else if (result.affectedRows === 0) {
          res.status(404).json({ message: "Development savings not found" });
        } else {
          res.status(200).json({ message: "Development savings deleted successfully" });
        }
      }
    );
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};
