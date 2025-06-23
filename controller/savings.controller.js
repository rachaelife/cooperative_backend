const { validationResult } = require("express-validator");
const { DB } = require("../sql");
require("dotenv").config;
module.exports.createnewsavings = (req, res) => {
  const errrorResponse = validationResult(req);
  const { user_id, amount, month_paid, payment_type, savings_type } = req.body;
  try {
    if (!errrorResponse.isEmpty()) {
      res.status(400).json({ message: errrorResponse.errors[0].msg });
    } else {
      const allowedTypes = ["shares", "savings", "building", "development"];
      if (!allowedTypes.includes(savings_type)) {
      return res.status(400).json({ message: "Invalid savings_type" });
        }
      DB.query(
        "INSERT INTO savings(user_id, amount, month_paid, payment_type,savings_type) VALUES (?,?,?,?,?)",
        [user_id, amount, month_paid, payment_type,savings_type],
        (err, _) => {
          if (err) {
            res.status(500).json({ message: "unable to add new savings" });
          } else {
            res.status(200).json({ message: "new savings added" });
          }
        }
      );
    }
  } catch (error) {
    res.status(500).json({ message: error.message ?? "something went wrong" });
  }
};
module.exports.getAllsavings = (req, res) => {
  try {
    DB.query(
      `SELECT savings.*, users.fullname, users.gender, users.mobile 
       FROM savings 
       JOIN users ON savings.user_id = users.user_id 
       ORDER BY savings.createdAt DESC`,
      (err, results) => {
        if (err) {
          return res.status(500).json({ message: "Can't fetch savings" });
        }
        res.status(200).json({ data: results });
      }
    );
  } catch (error) {
    res.status(500).json({ message: error.message ?? "Something went wrong" });
  }
};
module.exports.getshares = (req,res)=>{
  try {
    DB.query ("SELECT savings.*, users.fullname, users.gender, users.mobile FROM savings JOIN users ON savings.user_id = users.user_id WHERE savings_type = ? ORDER BY createdAt DESC",["shares"], (e,savings_type) =>{
      if(e){
        res.status(500).json({message: "can't fetch savings_type"})
      }else{
        res.status(200).json({message: savings_type})
      }
    })
  } catch (error) {
     res.status(500).json({message: error.message ?? "something went wrong"})
  }
}
module.exports.getbuilding = (req,res)=>{
  try {
     DB.query("SELECT savings.*, users.fullname, users.gender, users.mobile FROM savings JOIN users ON savings.user_id = users.user_id WHERE savings_type = ? ORDER BY createdAt DESC",["building"], (er,savings_type) =>{
      if(er){
        res.status(500).json({message: "can't fetch savings_type"})
      }else{
        res.status(200).json({message: savings_type})
      }
    })
  } catch (error) {
     res.status(500).json({message: error.message ?? "something went wrong"})
  }
}
module.exports.getdevelopment = (req,res)=>{
  try {
       DB.query("SELECT savings.*, users.fullname, users.gender, users.mobile FROM savings JOIN users ON savings.user_id = users.user_id WHERE savings_type = ? ORDER BY createdAt DESC",["development"], (e,savings_type) =>{
      if(e){
        res.status(500).json({message: "can't fetch savings_type"})
      }else{
        res.status(200).json({message: savings_type})
      }
    })
  } catch (error) {
     res.status(500).json({message: error.message ?? "something went wrong"})
  }
};
module.exports.getsavings = (req,res)=>{
  try {
    DB.query("SELECT savings.*, users.fullname, users.gender, users.mobile FROM savings JOIN users ON savings.user_id = users.user_id WHERE savings_type = ? ORDER BY createdAt DESC",["savings"], (e,savings_type) =>{
      if(e){
        res.status(500).json({message: "can't fetch savings_type"})
      }else{
        res.status(200).json({message: savings_type})
      }
    })
  } catch (error) {
     res.status(500).json({message: error.message ?? "something went wrong"})
  }
};
module.exports.getUserSavings = (req, res)=>{
  const {id} = req.params
  try {
    // Convert id to integer to ensure proper data type matching
    const userId = parseInt(id);

    DB.query(`SELECT savings.*, users.fullname, users.gender, users.mobile
               FROM savings
               LEFT JOIN users ON savings.user_id = users.user_id
               WHERE savings.user_id = ?
               ORDER BY savings.createdAt DESC`,[userId], (e,savings) =>{
      if(e){
        res.status(500).json({message: "can't fetch user savings", error: e.message})
      }else{
        DB.query("SELECT SUM(savings.amount) as total_savings FROM savings WHERE user_id = ?",[userId],(er, total)=>{
          if(er){
            res.status(500).json({message: "can not get user total saving", error: er.message})
          }else{
            res.status(200).json({message: savings, total:total[0]})
          }
        })
      }
    })
  } catch (error) {
    res.status(500).json({message: error.message})
  }
}
module.exports.deletesavings = (req, res) =>{
  const { savings_id } = req.params
  try {
    if (!savings_id){
      return res.status(400).json({ message: "savings ID is required"})
    }
    DB.query("SELECT * FROM savings WHERE savings_id = ?", [savings_id], (e, savings) =>{
      if (e){
     return   res.status(500).json({message: "error checking savings"})
      }else {
      }if (savings.length === 0 ){
        return res.status(404).json({message: "savings not found"})
      }
      DB.query("DELETE FROM savings WHERE savings_id = ?", [savings_id], (er,_) =>{
        if(er){
          res.status(500).json({message: "unable to delete savings"})
        }else{
          res.status(200).json({message: "savings deleted successfully"})
        }
      })
    })
  } catch (error) {
     res.status(500).json({message: error.message ?? "something went wrong"})
  }
}
module.exports.updatesavings = (req, res)=>{
  const {savings_id} = req.params
  const { amount, savings_type } = req.body
  const errrorResponse = validationResult(req)
  try {
    if (!errrorResponse.isEmpty()){
      return res.status(400).json({error: errrorResponse.array()})
    }
    // Validate savings_type
    const allowedTypes = ["shares", "savings", "building", "development"];
    if (!allowedTypes.includes(savings_type)) {
      return res.status(400).json({ message: "Invalid savings_type" });
    }
    DB.query('UPDATE savings SET amount = ?, savings_type = ? WHERE savings_id = ?', [ amount, savings_type, savings_id ], (er, result)=>{
      if(er){
        res.status(500).json({message: "can't update savings"})
      }else{
        if (result.affectedRows === 0) {
          return res.status(404).json({ message: "Savings record not found" });
        }
        res.status(200).json({message: "Your savings has been updated"})
      }
    })
  } catch (error) {
     res.status(500).json({message: error.message ?? "something went wrong"})
  }
}
module.exports.getTotalDev = (req, res)=>{
  const {id} = req.params
  try {
     DB.query("SELECT SUM(amount) AS total FROM savings WHERE savings_type = ?",["development"], (e,development) =>{
      if(e){
        res.status(500).json({message: "can't fetch savings_type"})
      }else{
            res.status(200).json({message: development})
      }
    })
  } catch (error) {
    res.status(500).json({message: error.message})
  }
};
module.exports.getTotalsavings = (req, res)=>{
  const {id} = req.params
  try {
     DB.query("SELECT SUM(amount) AS total FROM savings WHERE savings_type = ?",["savings"], (e,savings) =>{
      if(e){
        res.status(500).json({message: "can't fetch savings_type"})
      }else{
            res.status(200).json({message: savings})
      }
    })
  } catch (error) {
    res.status(500).json({message: error.message})
  }
};
module.exports.getTotalbuilding = (req, res)=>{
  const {id} = req.params
  try {
     DB.query("SELECT SUM(amount) AS total FROM savings WHERE savings_type = ?",["building"], (e,building) =>{
      if(e){
        res.status(500).json({message: "can't fetch savings_type"})
      }else{
            res.status(200).json({message: building})
      }
    })
  } catch (error) {
    res.status(500).json({message: error.message})
  }
};
module.exports.getTotalshares = (req, res)=>{
  const {id} = req.params
  try {
     DB.query("SELECT SUM(amount) AS total FROM savings WHERE savings_type = ?",["shares"], (e,shares) =>{
      if(e){
        res.status(500).json({message: "can't fetch savings_type"})
      }else{
            res.status(200).json({message: shares})
      }
    })
  } catch (error) {
    res.status(500).json({message: error.message})
  }
}
