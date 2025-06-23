const { validationResult } = require("express-validator");
const { DB } = require("../sql");

// Create new building savings
module.exports.createBuilding = (req, res) => {
  const { user_id, amount, month_paid, payment_type } = req.body;
  const errorResponse = validationResult(req);

  try {
    if (!errorResponse.isEmpty()) {
      return res.status(400).json({ message: errorResponse.errors[0].msg });
    }

    DB.query(
      "INSERT INTO building (user_id, amount, month_paid, payment_type) VALUES (?, ?, ?, ?)",
      [user_id, amount, month_paid, payment_type],
      (error, result) => {
        if (error) {
          res.status(500).json({ message: "Unable to add building savings" });
        } else {
          res.status(200).json({ message: "Building savings added successfully" });
        }
      }
    );
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

// Get all building savings
module.exports.getAllBuilding = (req, res) => {
  try {
    DB.query(
      `SELECT b.*, u.fullname
       FROM building b
       LEFT JOIN users u ON b.user_id = u.user_id
       ORDER BY b.created_at DESC`,
      (error, buildings) => {
        if (error) {
          res.status(500).json({ message: "Unable to fetch building savings" });
        } else {
          res.status(200).json({ message: buildings });
        }
      }
    );
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

// Get total building savings
module.exports.getTotalBuilding = (req, res) => {
  try {
    DB.query(
      "SELECT SUM(amount) as total FROM building",
      (error, result) => {
        if (error) {
          res.status(500).json({ message: "Unable to fetch total building savings" });
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

// Update building savings
module.exports.updateBuilding = (req, res) => {
  const { building_id } = req.params;
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

    updateValues.push(building_id);

    DB.query(
      `UPDATE building SET ${updateFields.join(', ')} WHERE building_id = ?`,
      updateValues,
      (error, result) => {
        if (error) {
          res.status(500).json({ message: "Unable to update building savings" });
        } else if (result.affectedRows === 0) {
          res.status(404).json({ message: "Building savings not found" });
        } else {
          res.status(200).json({ message: "Building savings updated successfully" });
        }
      }
    );
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

// Delete building savings
module.exports.deleteBuilding = (req, res) => {
  const { building_id } = req.params;
  const errorResponse = validationResult(req);

  try {
    if (!errorResponse.isEmpty()) {
      return res.status(400).json({ message: errorResponse.errors[0].msg });
    }

    DB.query(
      "DELETE FROM building WHERE building_id = ?",
      [building_id],
      (error, result) => {
        if (error) {
          res.status(500).json({ message: "Unable to delete building savings" });
        } else if (result.affectedRows === 0) {
          res.status(404).json({ message: "Building savings not found" });
        } else {
          res.status(200).json({ message: "Building savings deleted successfully" });
        }
      }
    );
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};