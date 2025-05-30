const { validationResult } = require("express-validator");
const { DB } = require("../sql");

require("dotenv").config;

module.exports.createnewloan_application = (req, res) => {
  const errrorResponse = validationResult(req);

  const { user_id, loan_amount, loan_term, loan_purpose, loan_status } =
    req.body;

  try {
    if (!errrorResponse.isEmpty()) {
      res.status(400).json({ message: errrorResponse.errors[0].msg });
    } else {
      DB.query(
        "SELECT * FROM loan_application WHERE user_id = ? AND loan_status IN (?,?)",
        [user_id, "approved", "pending"],
        (e, user) => {
          if (e) {
            res.status(500).json({ message: "fail to apply loan" });
          } else {
            if (user.length > 0) {
              res.status(400).json({ message: "you are currently on loan" });
            } else {
              DB.query(
                "INSERT INTO loan_application(user_id, loan_amount, loan_term, loan_purpose, loan_status) VALUES (?,?,?,?,?)",
                [user_id, loan_amount, loan_term, loan_purpose, loan_status],
                (err, _) => {
                  if (err) {
                    res
                      .status(500)
                      .json({ message: "unable to apply for new loan" });
                  } else {
                    res.status(200).json({ message: "new loan requested" });
                  }
                }
              );
            }
          }
        }
      );
    }
  } catch (error) {
    res.status(500).json({ message: error.message ?? "something went wrong" });
  }
};

module.exports.updateloan_applicationstatus = (req, res) => {
  const { loan_application_id } = req.params;
  const { loan_status } = req.body;
  const errrorResponse = validationResult(req);

  try {
    if (!errrorResponse.isEmpty()) {
      return res.status(400).json({ error: errrorResponse.array() });
    } else {
      DB.query(
        "UPDATE loan_application SET  loan_status = ? WHERE loan_application_id = ?",
        [loan_status, loan_application_id],
        (e, _) => {
          if (e) {
            res.status(500).json({ message: "can't update loan status" });
          } else {
            res
              .status(200)
              .json({ message: "Your loan status has been updated" });
          }
        }
      );
    }
  } catch (error) {
    res.status(500).json({ message: error.message ?? "something went wrong" });
  }
};

module.exports.getAllapplication = (req, res) => {
  try {
    DB.query(
      "SELECT loan_application.*, users.fullname AS fullname, users.mobile AS mobile, users.email AS email FROM loan_application JOIN users ON users.user_id = loan_application.user_id ORDER BY loan_application.createdAt DESC",
      (err, loan_application) => {
        if (err) {
          res.status(500).json({ message: "cant fetch loan applications" });
        } else {
          res.status(200).json({ message: loan_application });
        }
      }
    );
  } catch (error) {
    res.status(500).json({ message: error.message ?? "something went wrong" });
  }
};

module.exports.deleteapplication = (req, res) => {
  const { loan_application_id } = req.params;

  try {
    if (!loan_application_id) {
      return res
        .status(400)
        .json({ message: "loan_application ID is required" });
    } else {
      DB.query(
        "DELETE FROM loan_application WHERE loan_application_id = ?",
        [loan_application_id],
        (er, _) => {
          if (er) {
            res
              .status(500)
              .json({ message: "unable to delete loan_application" });
          } else {
            res
              .status(200)
              .json({ message: "loan_application deleted successfully" });
          }
        }
      );
    }
  } catch (error) {
    res.status(500).json({ message: error.message ?? "something went wrong" });
  }
};
