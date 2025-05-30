const { DB } = require("../sql");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { validationResult } = require("express-validator");
require("dotenv").config();

module.exports.createNewadmin = (req, res) => {
  const { username, email, admin_role, mobile, pass_word } = req.body;

  const errrorResponse = validationResult(req);

  try {
    if (!errrorResponse.isEmpty()) {
      res.status(400).json({ message: errrorResponse.errors[0].msg });
    } else {
      DB.query(
        "SELECT * FROM admin WHERE email = ? OR username = ?",
        [email, username],
        (er, admin) => {
          if (er) {
            res.status(500).json({ message: "Error fetching data" });
          } else {
            const emailExists = admin.some((a) => a.email === email);
            const usernameExists = admin.some((a) => a.username === username);

            if (emailExists) {
              res.status(400).json({ message: "Email already exists" });
            } else if (usernameExists) {
              res.status(400).json({ message: "Username is already taken" });
            } else {
              const encryptedpassword = bcrypt.hashSync(pass_word,10)
              DB.query(
                "INSERT INTO admin( username, email, admin_role, mobile, pass_word) VALUES(?,?,?,?,?)",
                [username, email, admin_role, mobile, encryptedpassword],
                (e, _) => {
                  if (e) {
                    console.log(e)
                    res.status(500).json({ messages: "Unable to add new admin" });
                  } else {
                    res.status(200).json({ message: "new admin added" });
                  }
                }
              );
            }
          }
        }
      );
    }
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

module.exports.loginadmin = (req, res) => {
  const errorResponse = validationResult(req);

  const { email_username, pass_word } = req.body;
  console.log({ email_username, pass_word })

  try {
    if (!errorResponse.isEmpty()) {
      res.status(400).json({ message: errorResponse.errors[0].msg });
    } else {
      DB.query(
        "SELECT * FROM admin WHERE email =? OR username = ?",
        [email_username, email_username],
        (e, admin) => {
          if (e) {
            res
              .status(500)
              .json({ message: "unable to fetch admin", error: e });
          } else {
            if (admin.length > 0) {
              const dbPass_word = admin[0].pass_word;
              const matchPass_word = bcrypt.compareSync(pass_word, dbPass_word);
              if (matchPass_word) {
                const token = jwt.sign(
                  { id: admin[0].admin_id },
                  process.env.JWT_SECRET,
                  { expiresIn: "1d" }
                );
                res.status(201).json({ message: "Login successful", token });
              } else {
                res.status(400).json({ message: "Invalid Email or Password" });
              }
            } else {
              res.status(400).json({ message: "Invalid Email" });
            }
          }
        }
      );
    }
  } catch (error) {
    res.status(500).json({ message: error.message ?? "something went wrong" });
  }
};

module.exports.alladmin = (req, res) => {
  try {
    

      DB.query("SELECT * FROM admin",(e, admin)=>{
            if(e){
                res.status(500).json({message: "Error fetching admins"})

                 console.error("DB query error:", e);
            }else{
                res.status(200).json({message: admin})
            }
        })
  } catch (error) {
     res.status(500).json({message: error.message ?? "something went wrong"})
  }
}

module.exports.updateadmin = (req, res)=>{
  const {admin_id} = req.params
  const { username, email,admin_role, mobile} = req.body
  const errrorResponse = validationResult(req)

  try {
    if (!errrorResponse.isEmpty()){
      return res.status(400).json({error: errrorResponse.array()})
    }else{
      DB.query('UPDATE admin SET username = ?,  email = ?,admin_role = ?, mobile= ? WHERE admin_id = ?', [username,email,admin_role,mobile,admin_id], (e, _)=>{
        if(e){
          res.status(500).json({message: "can't update"})
        }else{
          res.status(200).json({message: "Your profile has been updated"})
        }
      })
    }
  } catch (error) {
     res.status(500).json({message: error.message ?? "something went wrong"})
  }
}


// module.exports.deleteAdmin = (req, res) => {
//   const id = req.params.id;
//   DB.query("DELETE FROM admin WHERE id = ?", [id], (err, _) => {
//     if (err) {
//       return res.status(500).json({ message: "Failed to delete admin" });
//     }
//     res.status(200).json({ message: "Admin deleted successfully" });
//   });
// };


module.exports.deleteAdmin= (req, res) =>{
  const { admin_id } = req.params

  try {
    if (!admin_id){
      return res.status(400).json({ message: "admin ID is required"})
    }

    DB.query("SELECT * FROM admin WHERE admin_id = ?", [admin_id], (e, admin) =>{
      if (e){
     return   res.status(500).json({message: "error checking admin"})
      }else {
      }if (admin.length === 0 ){
        return res.status(404).json({message: "admin not found"})
      }

      DB.query("DELETE FROM admin WHERE admin_id = ?", [admin_id], (er,_) =>{
        if(er){
          res.status(500).json({message: "unable to delete admin"})
        }else{
          res.status(200).json({message: "admin deleted successfully"})
        }
      })
    })
  } catch (error) {
     res.status(500).json({message: error.message ?? "something went wrong"})
  }
}