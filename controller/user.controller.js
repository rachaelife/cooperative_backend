const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs")
const { DB } = require("../sql");
const jwt = require("jsonwebtoken")
require("dotenv").config()
module.exports.createnewuser = (req, res) => {
  const { fullname, gender, mobile, email, address, referral, registration_number } = req.body;
  const errorResponse = validationResult(req);
  try {
    if (!errorResponse.isEmpty()) {
      res.status(400).json({ message: errorResponse.errors[0].msg });
    } else {
      // Check for existing mobile, email, or registration number
      const checkQuery = registration_number
        ? "SELECT * FROM users WHERE mobile = ? OR email = ? OR registration_number = ?"
        : "SELECT * FROM users WHERE mobile = ? OR email = ?";
      const checkParams = registration_number
        ? [mobile, email, registration_number]
        : [mobile, email];

      DB.query(checkQuery, checkParams, (e, user) => {
        if (e) {
          res.status(500).json({ message: "Error fetching data" });
        } else {
          if (user.length > 0) {
            // Check which field is duplicate
            const existingUser = user[0];
            if (existingUser.mobile === mobile) {
              res.status(400).json({ message: "Mobile number already exists" });
            } else if (existingUser.email === email) {
              res.status(400).json({ message: "Email already exists" });
            } else if (existingUser.registration_number === registration_number) {
              res.status(400).json({ message: "Registration number already exists" });
            } else {
              res.status(400).json({ message: "User already exists" });
            }
          } else {
            // Generate registration number if not provided
            if (!registration_number) {
              // Get the next sequential registration number
              DB.query(
                "SELECT registration_number FROM users WHERE registration_number LIKE 'COOP%' ORDER BY CAST(SUBSTRING(registration_number, 5) AS UNSIGNED) DESC LIMIT 1",
                (seqErr, seqResult) => {
                  let finalRegistrationNumber;

                  if (seqErr) {
                    console.error("Error getting last registration number:", seqErr);
                    // Fallback to timestamp-based generation
                    const timestamp = Date.now().toString().slice(-4);
                    finalRegistrationNumber = `COOP${timestamp}`;
                  } else {
                    if (seqResult.length > 0) {
                      // Extract the number part and increment
                      const lastRegNumber = seqResult[0].registration_number;
                      const numberPart = lastRegNumber.replace('COOP', '');
                      const nextNumber = parseInt(numberPart) + 1;
                      finalRegistrationNumber = `COOP${String(nextNumber).padStart(3, '0')}`;
                    } else {
                      // First registration number
                      finalRegistrationNumber = 'COOP001';
                    }
                  }

                  // Insert the user with the generated registration number
                  insertUser(finalRegistrationNumber);
                }
              );
            } else {
              // If registration number was provided, insert directly
              insertUser(registration_number);
            }

            function insertUser(regNumber) {
              DB.query(
                "INSERT INTO users(registration_number, fullname, gender, mobile, email, address, referral) VALUES(?,?,?,?,?,?,?)",
                [regNumber, fullname, gender, mobile, email, address, referral],
                (er, result) => {
                  if (er) {
                    if (er.code === 'ER_DUP_ENTRY') {
                      res.status(400).json({ message: "Registration number already exists" });
                    } else {
                      res.status(500).json({ message: "Unable to add new user" });
                    }
                  } else {
                    res.status(200).json({
                      message: "New member created",
                      user_id: result.insertId,
                      registration_number: regNumber,
                      success: true
                    });
                  }
                }
              );
            }
          }
        }
      });
    }
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};
module.exports.allusers = (req, res) => {
  try {
    DB.query("SELECT * FROM users ORDER BY CAST(SUBSTRING(registration_number, 5) AS UNSIGNED) ASC, user_id ASC", (err, users) => {
      if (err) {
        res.status(500).json({ message: "can't fetch users" });
      } else {
        // Generate registration numbers for users who don't have them
        const usersWithoutRegNumbers = users.filter(user => !user.registration_number);

        if (usersWithoutRegNumbers.length > 0) {
          // Get the highest existing registration number to continue sequence
          DB.query(
            "SELECT registration_number FROM users WHERE registration_number LIKE 'COOP%' ORDER BY CAST(SUBSTRING(registration_number, 5) AS UNSIGNED) DESC LIMIT 1",
            (seqErr, seqResult) => {
              let startNumber = 1;
              if (!seqErr && seqResult.length > 0) {
                const lastRegNumber = seqResult[0].registration_number;
                const numberPart = lastRegNumber.replace('COOP', '');
                startNumber = parseInt(numberPart) + 1;
              }

              // Sort users by user_id for consistent assignment
              usersWithoutRegNumbers.sort((a, b) => a.user_id - b.user_id);

              usersWithoutRegNumbers.forEach((user, index) => {
                const sequentialNumber = String(startNumber + index).padStart(3, '0');
                user.registration_number = `COOP${sequentialNumber}`;

                // Update the database with the generated registration number
                DB.query(
                  "UPDATE users SET registration_number = ? WHERE user_id = ?",
                  [user.registration_number, user.user_id],
                  (updateErr) => {
                    if (updateErr) {
                      console.error(`Error updating registration number for user ${user.user_id}:`, updateErr);
                    }
                  }
                );
              });
            }
          );
        }

        res.status(200).json({ message: users });
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
module.exports.getuser = (req, res) => {
  const errorResponse = validationResult(req);
  const { user_id } = req.params;
  try {
    if (!errorResponse.isEmpty()) {
      return res.status(400).json({ message: errorResponse.errors[0].msg });
    }
    if (!user_id) {
      return res.status(400).json({ message: "User ID is required" });
    }
    DB.query("SELECT * FROM users WHERE user_id = ?", [user_id], (er, user) => {
      if (er) {
        res.status(500).json({ message: "unable to SELECT user" });
      } else {
        if (user.length === 0) {
          res.status(404).json({ message: "User not found" });
        } else {
          const userData = user[0];

          // Generate registration number if it doesn't exist
          if (!userData.registration_number) {
            // Get the highest existing registration number to continue sequence
            DB.query(
              "SELECT registration_number FROM users WHERE registration_number LIKE 'COOP%' ORDER BY CAST(SUBSTRING(registration_number, 5) AS UNSIGNED) DESC LIMIT 1",
              (seqErr, seqResult) => {
                let nextNumber = 1;
                if (!seqErr && seqResult.length > 0) {
                  const lastRegNumber = seqResult[0].registration_number;
                  const numberPart = lastRegNumber.replace('COOP', '');
                  nextNumber = parseInt(numberPart) + 1;
                }

                const sequentialNumber = String(nextNumber).padStart(3, '0');
                userData.registration_number = `COOP${sequentialNumber}`;

                // Update the database with the generated registration number
                DB.query(
                  "UPDATE users SET registration_number = ? WHERE user_id = ?",
                  [userData.registration_number, userData.user_id],
                  (updateErr) => {
                    if (updateErr) {
                      console.error(`Error updating registration number for user ${userData.user_id}:`, updateErr);
                    }
                  }
                );
              }
            );
          }

          res.status(200).json({ message: [userData] });
        }
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message ?? "Something went wrong" });
  }
};
module.exports.updateusers = (req, res) => {
  const { user_id } = req.params;
  const {
    fullname,
    gender,
    mobile,
    email,
    address,
    referral,
    date_of_birth,
    occupation,
    next_of_kin,
    next_of_kin_phone
  } = req.body;
  const errorResponse = validationResult(req);
  try {
    if (!errorResponse.isEmpty()) {
      return res.status(400).json({ message: errorResponse.errors[0].msg });
    }
    if (!user_id) {
      return res.status(400).json({ message: "User ID is required" });
    }
    // Build dynamic query based on provided fields (only for existing columns)
    const updateFields = [];
    const updateValues = [];
    // Only update fields that exist in the database
    if (fullname !== undefined) {
      updateFields.push('fullname = ?');
      updateValues.push(fullname);
    }
    if (gender !== undefined) {
      updateFields.push('gender = ?');
      updateValues.push(gender);
    }
    if (mobile !== undefined) {
      updateFields.push('mobile = ?');
      updateValues.push(mobile);
    }
    if (email !== undefined) {
      updateFields.push('email = ?');
      updateValues.push(email);
    }
    if (address !== undefined) {
      updateFields.push('address = ?');
      updateValues.push(address);
    }
    if (referral !== undefined) {
      updateFields.push('referral = ?');
      updateValues.push(referral);
    }
    // Note: date_of_birth, occupation, next_of_kin, next_of_kin_phone columns don't exist in the current database schema
    // These fields are ignored for now to prevent SQL errors
    if (date_of_birth !== undefined) {
      }
    if (occupation !== undefined) {
      }
    if (next_of_kin !== undefined) {
      }
    if (next_of_kin_phone !== undefined) {
      }
    if (updateFields.length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }
    // Add user_id to the end of values array
    updateValues.push(user_id);
    const updateQuery = `UPDATE users SET ${updateFields.join(', ')} WHERE user_id = ?`;
    DB.query(updateQuery, updateValues, (e, result) => {
      if (e) {
        res.status(500).json({ message: "can't update user" });
      } else {
        if (result.affectedRows === 0) {
          res.status(404).json({ message: "User not found" });
        } else {
          res.status(200).json({ message: "Your profile has been updated" });
        }
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message ?? "something went wrong" });
  }
};
module.exports.deleteuser = (req, res) => {
  const { user_id } = req.params;
  try {
    if (!user_id) {
      return res.status(400).json({ message: "user ID is required" });
    }
    DB.query("SELECT * FROM users WHERE user_id = ?", [user_id], (e, user) => {
      if (e) {
        return res.status(500).json({ message: "error checking user" });
      }
      if (user.length === 0) {
        return res.status(404).json({ message: "user not found" });
      }
      DB.query("DELETE FROM users WHERE user_id = ?", [user_id], (er, result) => {
        if (er) {
          return res.status(500).json({ message: "unable to delete user" });
        } else {
          return res.status(200).json({ message: "user deleted successfully" });
        }
      });
    });
  } catch (error) {
    res.status(500).json({ message: error.message ?? "something went wrong" });
  }
};
// Check if user needs to set password (first-time login)
module.exports.checkUserStatus = (req, res) => {
  const { email_mobile } = req.body;
  try {
    DB.query("SELECT user_id, fullname, email, mobile, password, first_login FROM users WHERE email = ? OR mobile = ?",
      [email_mobile, email_mobile], (e, user) => {
      if (e) {
        res.status(500).json({ message: "Unable to fetch user", error: e });
      } else {
        if (user.length > 0) {
          const userData = user[0];
          if (!userData.password) {
            res.status(200).json({
              needsPassword: true,
              user: {
                user_id: userData.user_id,
                fullname: userData.fullname,
                email: userData.email,
                mobile: userData.mobile
              }
            });
          } else {
            res.status(200).json({ needsPassword: false });
          }
        } else {
          res.status(404).json({ message: "User not found" });
        }
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message ?? "Something went wrong" });
  }
};
// Set password for first-time users
module.exports.setUserPassword = (req, res) => {
  const errorResponse = validationResult(req);
  const { user_id, password, confirm_password } = req.body;
  try {
    if (!errorResponse.isEmpty()) {
      return res.status(400).json({ message: errorResponse.errors[0].msg });
    }
    if (password !== confirm_password) {
      return res.status(400).json({ message: "Passwords do not match" });
    }
    // Hash the password
    const hashedPassword = bcrypt.hashSync(password, 10);
    DB.query(
      "UPDATE users SET password = ?, password_set_at = NOW(), first_login = FALSE WHERE user_id = ?",
      [hashedPassword, user_id],
      (updateError, result) => {
        if (updateError) {
          res.status(500).json({ message: "Failed to set password" });
        } else {
          if (result.affectedRows > 0) {
            res.status(200).json({ message: "Password set successfully" });
          } else {
            res.status(404).json({ message: "User not found" });
          }
        }
      }
    );
  } catch (error) {
    res.status(500).json({ message: error.message ?? "Something went wrong" });
  }
};
module.exports.loginUser = (req, res) => {
  const errorResponse = validationResult(req);
  const { email_mobile, password } = req.body;
  try {
    if (!errorResponse.isEmpty()) {
      return res.status(400).json({ message: errorResponse.errors[0].msg });
    }
    DB.query("SELECT * FROM users WHERE email = ? OR mobile = ?", [email_mobile, email_mobile], (e, user) => {
      if (e) {
        res.status(500).json({ message: "Unable to fetch user", error: e });
      } else {
        if (user.length > 0) {
          const userData = user[0];
          const dbPassword = userData.password;
          if (!dbPassword) {
            return res.status(400).json({
              message: "Please set your password first",
              needsPassword: true,
              user: {
                user_id: userData.user_id,
                fullname: userData.fullname,
                email: userData.email,
                mobile: userData.mobile
              }
            });
          }
          const matchPassword = bcrypt.compareSync(password, dbPassword);
          if (matchPassword) {
            // Generate JWT token
            const token = jwt.sign(
              {
                id: userData.user_id,
                email: userData.email,
                mobile: userData.mobile
              },
              process.env.JWT_SECRET || 'QWERTYUIOPLKJHGFDSAZXCVBNM',
              { expiresIn: "1d" }
            );
            res.status(200).json({
              message: "Login successful",
              token: token,
              user: {
                user_id: userData.user_id,
                fullname: userData.fullname,
                email: userData.email,
                mobile: userData.mobile,
                gender: userData.gender,
                address: userData.address,
                createdAt: userData.created_at
              }
            });
          } else {
            res.status(400).json({ message: "Invalid Email or Password" });
          }
        } else {
          res.status(404).json({ message: "User not found" });
        }
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message ?? "Something went wrong" });
  }
};
module.exports.getTotalusers = (req, res) => {
  try {
    DB.query("SELECT COUNT(*) AS totalusers FROM users", (err, result) => {
      if (err) {
        res.status(500).json({ message: "Can't fetch total members" });
      } else {
        const totalUsers = result[0].totalusers;
        res.status(200).json({ message: totalUsers });
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message ?? "something went wrong" });
  }
};

// Generate registration numbers for all users who don't have them
module.exports.generateRegistrationNumbers = (req, res) => {
  try {
    DB.query("SELECT user_id, created_at FROM users WHERE registration_number IS NULL OR registration_number = ''", (err, users) => {
      if (err) {
        return res.status(500).json({ message: "Error fetching users without registration numbers" });
      }

      if (users.length === 0) {
        return res.status(200).json({ message: "All users already have registration numbers", count: 0 });
      }

      let updatedCount = 0;
      let errors = [];

      // Get the highest existing registration number to continue sequence
      DB.query(
        "SELECT registration_number FROM users WHERE registration_number LIKE 'COOP%' ORDER BY CAST(SUBSTRING(registration_number, 5) AS UNSIGNED) DESC LIMIT 1",
        (seqErr, seqResult) => {
          let startNumber = 1;
          if (!seqErr && seqResult.length > 0) {
            const lastRegNumber = seqResult[0].registration_number;
            const numberPart = lastRegNumber.replace('COOP', '');
            startNumber = parseInt(numberPart) + 1;
          }

          // Sort users by user_id to ensure consistent assignment
          users.sort((a, b) => a.user_id - b.user_id);

          users.forEach((user, index) => {
            // Generate sequential registration numbers continuing from existing sequence
            const sequentialNumber = String(startNumber + index).padStart(3, '0');
            const registrationNumber = `COOP${sequentialNumber}`;

            DB.query(
              "UPDATE users SET registration_number = ? WHERE user_id = ?",
              [registrationNumber, user.user_id],
              (updateErr) => {
                if (updateErr) {
                  errors.push(`Error updating user ${user.user_id}: ${updateErr.message}`);
                } else {
                  updatedCount++;
                }

                // Check if this is the last user
                if (index === users.length - 1) {
                  if (errors.length > 0) {
                    res.status(207).json({
                      message: `Updated ${updatedCount} users with registration numbers`,
                      errors: errors,
                      count: updatedCount
                    });
                  } else {
                    res.status(200).json({
                      message: `Successfully generated registration numbers for ${updatedCount} users`,
                      count: updatedCount
                    });
                  }
                }
              }
            );
          });
        }
      );
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Reset and regenerate all registration numbers sequentially from COOP001
module.exports.resetRegistrationNumbers = (req, res) => {
  try {
    // Get all users ordered by user_id
    DB.query("SELECT user_id FROM users ORDER BY user_id ASC", (err, users) => {
      if (err) {
        return res.status(500).json({ message: "Error fetching users" });
      }

      if (users.length === 0) {
        return res.status(200).json({ message: "No users found", count: 0 });
      }

      let updatedCount = 0;
      let errors = [];

      users.forEach((user, index) => {
        // Generate sequential registration numbers starting from 001
        const sequentialNumber = String(index + 1).padStart(3, '0');
        const registrationNumber = `COOP${sequentialNumber}`;

        DB.query(
          "UPDATE users SET registration_number = ? WHERE user_id = ?",
          [registrationNumber, user.user_id],
          (updateErr) => {
            if (updateErr) {
              errors.push(`Error updating user ${user.user_id}: ${updateErr.message}`);
            } else {
              updatedCount++;
            }

            // Check if this is the last user
            if (index === users.length - 1) {
              if (errors.length > 0) {
                res.status(207).json({
                  message: `Reset ${updatedCount} registration numbers`,
                  errors: errors,
                  count: updatedCount
                });
              } else {
                res.status(200).json({
                  message: `Successfully reset all registration numbers. Generated ${updatedCount} sequential numbers starting from COOP001`,
                  count: updatedCount
                });
              }
            }
          }
        );
      });
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
