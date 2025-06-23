const { validationResult } = require("express-validator");
const { DB } = require("../sql");

// Create new shares
module.exports.createnewshares = (req, res) => {
  const errorResponse = validationResult(req);
  const { user_id, amount, payment_method } = req.body;

  try {
    if (!errorResponse.isEmpty()) {
      return res.status(400).json({ message: errorResponse.errors[0].msg });
    }

    DB.query(
      "INSERT INTO shares (user_id, amount, payment_method) VALUES (?, ?, ?)",
      [user_id, amount, payment_method],
      (err, result) => {
        if (err) {
          res.status(500).json({ message: "Unable to add shares" });
        } else {
          res.status(200).json({ message: "Shares added successfully" });
        }
      }
    );
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

// Get all shares
module.exports.getAllShares = (req, res) => {
  try {
    DB.query(
      `SELECT s.*, u.fullname
       FROM shares s
       LEFT JOIN users u ON s.user_id = u.user_id
       ORDER BY s.created_at DESC`,
      (error, shares) => {
        if (error) {
          res.status(500).json({ message: "Unable to fetch shares" });
        } else {
          res.status(200).json({ message: shares });
        }
      }
    );
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

// Get total shares
module.exports.getTotalShares = (req, res) => {
  try {
    DB.query(
      "SELECT SUM(amount) as total FROM shares",
      (error, result) => {
        if (error) {
          res.status(500).json({ message: "Unable to fetch total shares" });
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

// Get user shares
module.exports.getUserShares = (req, res) => {
  const { user_id } = req.params;

  try {
    DB.query(
      "SELECT * FROM shares WHERE user_id = ? ORDER BY created_at DESC",
      [user_id],
      (error, shares) => {
        if (error) {
          res.status(500).json({ message: "Unable to fetch user shares" });
        } else {
          res.status(200).json({ message: shares });
        }
      }
    );
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

// Update shares
module.exports.updateShares = (req, res) => {
  const { shares_id } = req.params;
  const { amount, payment_method } = req.body;
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
    if (payment_method !== undefined) {
      updateFields.push('payment_method = ?');
      updateValues.push(payment_method);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }

    updateValues.push(shares_id);

    DB.query(
      `UPDATE shares SET ${updateFields.join(', ')} WHERE shares_id = ?`,
      updateValues,
      (error, result) => {
        if (error) {
          res.status(500).json({ message: "Unable to update shares" });
        } else if (result.affectedRows === 0) {
          res.status(404).json({ message: "Shares not found" });
        } else {
          res.status(200).json({ message: "Shares updated successfully" });
        }
      }
    );
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

// Delete shares
module.exports.deleteShares = (req, res) => {
  const { shares_id } = req.params;
  const errorResponse = validationResult(req);

  try {
    if (!errorResponse.isEmpty()) {
      return res.status(400).json({ message: errorResponse.errors[0].msg });
    }

    DB.query(
      "DELETE FROM shares WHERE shares_id = ?",
      [shares_id],
      (error, result) => {
        if (error) {
          res.status(500).json({ message: "Unable to delete shares" });
        } else if (result.affectedRows === 0) {
          res.status(404).json({ message: "Shares not found" });
        } else {
          res.status(200).json({ message: "Shares deleted successfully" });
        }
      }
    );
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};