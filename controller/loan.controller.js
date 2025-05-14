const { validationResult } = require("express-validator");
const { DB } = require("../sql");
require("dotenv").config





module.exports.createnewloan = (req,res) =>{

 const errrorResponse = validationResult(req)
 

 const {user_id, amount_disbursed, loan_repayment, interest_paid, payment_method, status} = req.body
 
 console.log(errrorResponse)
 try {
 

    if(!errrorResponse.isEmpty()){
        res.status(400).json({message: errrorResponse.errors[0].msg});
    }else{
      
        DB.query ("INSERT INTO loans (user_id, amount_disbursed, loan_repayment, interest_paid,payment_method,status) VALUES (?,?,?,?,?,?)",[user_id,amount_disbursed, loan_repayment, interest_paid,payment_method, status ], (err, _) =>{
            if(err){
                console.log(err)
                    res.status(500).json({message: "unable to add new loan"})
            }else{
                res.status(200).json({message: "new loan added"})
            }
    
        })
    }


 } catch (error) {
    res.status(500).json({message: error.message ??  "something went wrong"})
 }
 
 

}


module.exports.getAllLoans =(req, res) =>{
    try {
        DB.query("SELECT * FROM loans", (err, loans) =>{
            if(err){
               res.status(500).json({message: "cant fetch loan"})
            }else{
                res.status(200).json({message: loans})
            }
        })
    } catch (error) {
        res.status(500).json({message: error.message ?? "something went wrong"})
    }
}


module.exports.deleteloan = (req, res) =>{
  const { loan_id } = req.params

  try {
    if (!loan_id){
      return res.status(400).json({ message: "loan ID is required"})
    }

    DB.query("SELECT * FROM loans WHERE loan_id = ?", [loan_id], (e, loan) =>{
      if (e){
     return   res.status(500).json({message: "error checking loan"})
      }else {
      }if (loan.length === 0 ){
        return res.status(404).json({message: "loan not found"})
      }

      DB.query("DELETE FROM loans WHERE loan_id = ?", [loan_id], (er,_) =>{
        if(er){
          res.status(500).json({message: "unable to delete loan"})
        }else{
          res.status(200).json({message: "loan deleted successfully"})
        }
      })
    })
  } catch (error) {
     res.status(500).json({message: error.message ?? "something went wrong"})
  }
}

module.exports.updateloans = (req, res)=>{
  const {loan_id} = req.params
  const { amount_disbursed, loan_repayment,  status} = req.body
  const errrorResponse = validationResult(req)

  try {
    if (!errrorResponse.isEmpty()){
      return res.status(400).json({error: errrorResponse.array()})
    }else{
      DB.query('UPDATE loans SET amount_disbursed = ?,  loan_repayment= ?, status = ? WHERE loan_id = ?', [amount_disbursed,loan_repayment,status,loan_id], (e, _)=>{
        if(e){
          res.status(500).json({message: "can't update"})
        }else{
          res.status(200).json({message: "Your loan has been updated"})
        }
      })
    }
  } catch (error) {
     res.status(500).json({message: error.message ?? "something went wrong"})
  }
}