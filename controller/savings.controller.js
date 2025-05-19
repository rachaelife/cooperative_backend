const { validationResult } = require("express-validator");
const { DB } = require("../sql");
require("dotenv").config;

module.exports.createnewsavings = (req, res) => {
  const errrorResponse = validationResult(req);

  const { user_id, amount, month_paid, payment_type, savings_type } = req.body;

  console.log(errrorResponse);
  try {
    if (!errrorResponse.isEmpty()) {
      res.status(400).json({ message: errrorResponse.errors[0].msg });
    } else {
      DB.query(
        "INSERT INTO savings (user_id, amount, month_paid, payment_type,savings_type) VALUES (?,?,?,?,?)",
        [user_id, amount, month_paid, payment_type,savings_type],
        (err, _) => {
          if (err) {
            console.log(err);
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


module.exports.getAllsavings =(req, res) =>{
    try {
        DB.query("SELECT * FROM savings", (err, savings) =>{
            if(err){
               res.status(500).json({message: "cant fetch savings"})
            }else{
                res.status(200).json({message: savings})
            }
        })
    } catch (error) {
        res.status(500).json({message: error.message ?? "something went wrong"})
    }
}

module.exports.getshares = (req,res)=>{
   
  try {
    DB.query("SELECT * FROM savings WHERE savings_type = ?",["shares"], (e,savings_type) =>{
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
    DB.query("SELECT * FROM savings WHERE savings_type = ?",["building"], (e,savings_type) =>{
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

module.exports.getdevelopment = (req,res)=>{
   
  try {
    DB.query("SELECT * FROM savings WHERE savings_type = ?",["development"], (e,savings_type) =>{
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

module.exports.getsavings = (req,res)=>{
   
  try {
    DB.query("SELECT * FROM savings WHERE savings_type = ?",["savings"], (e,savings_type) =>{
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
    }else{
      DB.query('UPDATE savings SET amount = ?, savings_type = ? WHERE savings_id = ?', [ amount,savings_type, savings_id ], (er, _)=>{
        if(er){
            
          res.status(500).json({message: "can't update savings"})
        }else{
          res.status(200).json({message: "Your savings has been updated"})
        }
      })
    }
  } catch (error) {
     res.status(500).json({message: error.message ?? "something went wrong"})
  }
}



