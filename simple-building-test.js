const { DB } = require("./sql");

console.log("🔍 Simple building table test...");

// Test 1: Check if building table exists
DB.query("SHOW TABLES LIKE 'building'", (error, result) => {
  if (error) {
    console.error("❌ Error checking building table:", error);
    process.exit(1);
  }
  
  console.log("📋 Building table check result:", result);
  
  if (result.length === 0) {
    console.log("❌ Building table does NOT exist");
    console.log("🔧 Creating building table...");
    
    const createTable = `
      CREATE TABLE building (
        building_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        month_paid VARCHAR(20) NOT NULL,
        payment_type VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    DB.query(createTable, (createError) => {
      if (createError) {
        console.error("❌ Error creating building table:", createError);
      } else {
        console.log("✅ Building table created successfully");
      }
      process.exit(0);
    });
  } else {
    console.log("✅ Building table exists");
    
    // Test insert
    console.log("🧪 Testing insert...");
    DB.query(
      "INSERT INTO building (user_id, amount, month_paid, payment_type) VALUES (?, ?, ?, ?)",
      [1, 1000, "January", "cash"],
      (insertError, insertResult) => {
        if (insertError) {
          console.error("❌ Insert test failed:", insertError);
        } else {
          console.log("✅ Insert test successful, ID:", insertResult.insertId);
          
          // Clean up
          DB.query("DELETE FROM building WHERE building_id = ?", [insertResult.insertId], () => {
            console.log("✅ Test data cleaned up");
            process.exit(0);
          });
        }
      }
    );
  }
});
