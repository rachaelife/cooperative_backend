const { validationResult } = require("express-validator")
const { DB } = require("../sql")

require("dotenv").config





module.exports.createnewshares = (req,res) =>{

 const errrorResponse = validationResult(req)
 

 const {user_id, amount, payment_method } = req.body
 
 console.log(errrorResponse)
 try {
 

    if(!errrorResponse.isEmpty()){
        res.status(400).json({message: errrorResponse.errors[0].msg});
    }else{
      
        DB.query ("INSERT INTO shares (user_id, amount, payment_method ) VALUES (?,?,?)",[user_id, amount, payment_method ], (err, _) =>{
            if(err){
                console.log(err)
                    res.status(500).json({message: "unable to add new shares"})
            }else{
                res.status(200).json({message: "new shares added"})
            }
    
        })
    }


 } catch (error) {
    res.status(500).json({message: error.message ??  "something went wrong"})
 }
 
 

}


module.exports.getAllshares =(req, res) =>{
    try {
        DB.query("SELECT * FROM shares", (err, shares) =>{
            if(err){
               res.status(500).json({message: "cant fetch shares"})
            }else{
                res.status(200).json({message: shares})
            }
        })
    } catch (error) {
        res.status(500).json({message: error.message ?? "something went wrong"})
    }
}


module.exports.deleteshares = (req, res) =>{
  const { shares_id } = req.params

  try {
    if (!shares_id){
      return res.status(400).json({ message: "shares ID is required"})
    }

    DB.query("SELECT * FROM shares WHERE shares_id = ?", [shares_id], (e, shares) =>{
      if (e){
     return   res.status(500).json({message: "error checking shares"})
      }else {
      }if (shares.length === 0 ){
        return res.status(404).json({message: "shares not found"})
      }

      DB.query("DELETE FROM shares WHERE shares_id = ?", [shares_id], (er,_) =>{
        if(er){
          res.status(500).json({message: "unable to delete shares"})
        }else{
          res.status(200).json({message: "shares deleted successfully"})
        }
      })
    })
  } catch (error) {
     res.status(500).json({message: error.message ?? "something went wrong"})
  }
}


module.exports.updateshares = (req, res)=>{
  const {shares_id} = req.params
  const { amount } = req.body
  const errrorResponse = validationResult(req)

  try {
    if (!errrorResponse.isEmpty()){
      return res.status(400).json({error: errrorResponse.array()})
    }else{
      DB.query('UPDATE shares SET amount = ? WHERE shares_id = ?', [amount, shares_id], (e, _)=>{
        if(e){
          res.status(500).json({message: "can't update shares"})
        }else{
          res.status(200).json({message: "Your shares has been updated"})
        }
      })
    }
  } catch (error) {
     res.status(500).json({message: error.message ?? "something went wrong"})
  }
}