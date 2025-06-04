const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs")
const { DB } = require("../sql");
const jwt = require("jsonwebtoken")
require("dotenv").config()

module.exports.createnewuser = (req, res) => {
  const { fullname, gender, mobile, email, address, referral } = req.body;

  const errrorResponse = validationResult(req);

  try {
    if (!errrorResponse.isEmpty()) {
      res.status(400).json({ message: errrorResponse.errors[0].msg });
    } else {
      DB.query("SELECT * FROM users WHERE mobile =? OR email = ?", [mobile, email], (e, user) => {
        if (e) {
          res.status(500).json({ message: "Error fetching data" });
        } else {
          if (user.length > 0) {
            res.status(400).json({ message: "Mobile NO. already exist" });
          } else {
            DB.query(
              "INSERT INTO users(fullname, gender, mobile, email, address, referral) VALUES(?,?,?,?,?,?)",
              [fullname, gender, mobile, email, address, referral],
              (er, _) => {
                if (er) {
                  res.status(500).json({ message: "Unable to add new user" });
                } else {
                  res.status(200).json({ message: "New member created" });
                }
              }
            );
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
    

      DB.query("SELECT * FROM users ORDER BY createdAt DESC",(e, users)=>{
            if(e){
                res.status(500).json({message: "Error fetching users"})
            }else{
                res.status(200).json({message: users})
            }
        })
  } catch (error) {
     res.status(500).json({message: error.message ?? "something went wrong"})
  }
}

module.exports.getuser = (req, res) => {
     const errrorResponse = validationResult(req);
     const { user_id } = req.params

     try {

          
      DB.query("SELECT * FROM users WHERE USER_id = ?", [user_id], (er, user) =>{
        if(er){
          res.status(500).json({message: "unable to SELECT user"})
        }else{
          res.status(200).json({message: user})
        }
      })

     } catch (error) {
      
     }
}

module.exports.updateusers = (req, res)=>{
  const {user_id} = req.params
  const {fullname,gender, mobile, email,address,referral} = req.body
  const errrorResponse = validationResult(req)

  try {
    if (!errrorResponse.isEmpty()){
      return res.status(400).json({error: errrorResponse.array()})
    }else{
      DB.query('UPDATE users SET fullname = ?,gender = ?, mobile = ?, email = ?, address =?,referral=? WHERE user_id = ?', [fullname,gender,mobile,email,address,referral,user_id], (e, _)=>{
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

module.exports.deleteuser = (req, res) =>{
  const { user_id } = req.params

  
    if (!user_id){
      return res.status(400).json({ message: "user ID is required"})
    }

    DB.query("SELECT * FROM users WHERE user_id = ?", [user_id], (e, user) =>{
      if (e){
     return   res.status(500).json({message: "error checking user"})
      }
      if (user.length === 0 ){
        return res.status(404).json({message: "user not found"})
      }

      DB.query("DELETE FROM users WHERE USER_id = ?", [user_id], (er,_) =>{
        if(er){
        return  res.status(500).json({message: "unable to delete user"})
        }else{
        return  res.status(200).json({message: "user deleted successfully"})
        }
      })
    })
  }


module.exports.loginUser = (req,res) =>{

  const errorResponse = validationResult(req)

  const {email_mobile, password} = req.body

  try {
     if (!errorResponse.isEmpty()) {
      res.status(400).json({ message: errorResponse.errors[0].msg });
     }else{
      DB.query("SELECT * FROM users WHERE email =? OR mobile = ?", [email_mobile, email_mobile], (e, user)=>{
        if(e){
          res.status(500).json({message: "unable to fetch user", error:e})
        }else{
            if(user.length > 0){
                        const dbPassword = user[0].pass_word
                        const matchPassword = bcrypt.compareSync(password, dbPassword)
                        if(matchPassword){
                            const token = jwt.sign({id: user[0].user_id}, process.env.JWT_SECRET, {expiresIn: "1d"})
                            res.status(201).json({message:token})
                        }else{
                            res.status(400).json({message: "Invalid Email or Password"})
                        }
                    }else{
                        res.status(400).json({message: "Invalid Email"})
                    }
        }
      })
     }
  } catch (error) {
    
  }
}

module.exports.getTotalusers = (req, res) => {
  try {
    DB.query("SELECT COUNT(*) AS totalusers FROM users", (err, result) => {
      if (err) {
        console.log(err)
        res.status(500).json({ message: "Can't fetch total members" });
      } else {
        res.status(200).json({ message: result[0].totalusers });
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

