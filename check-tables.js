const { DB } = require("./sql");

console.log("🔍 Checking database tables...");

// Check if building table exists
DB.query("SHOW TABLES LIKE 'building'", (error, result) => {
  if (error) {
    console.error("❌ Error checking building table:", error);
  } else {
    if (result.length > 0) {
      console.log("✅ Building table exists");
      
      // Check building table structure
      DB.query("DESCRIBE building", (descError, descResult) => {
        if (descError) {
          console.error("❌ Error describing building table:", descError);
        } else {
          console.log("📋 Building table structure:", descResult);
        }
      });
    } else {
      console.log("❌ Building table does NOT exist");
      console.log("🔧 Creating building table...");
      
      const createBuildingTable = `
        CREATE TABLE building (
          building_id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          amount DECIMAL(15,2) NOT NULL,
          month_paid VARCHAR(20) NOT NULL,
          payment_type VARCHAR(50) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;
      
      DB.query(createBuildingTable, (createError) => {
        if (createError) {
          console.error("❌ Error creating building table:", createError);
        } else {
          console.log("✅ Building table created successfully");
        }
      });
    }
  }
});

// Check if development table exists
DB.query("SHOW TABLES LIKE 'development'", (error, result) => {
  if (error) {
    console.error("❌ Error checking development table:", error);
  } else {
    if (result.length > 0) {
      console.log("✅ Development table exists");
      
      // Check development table structure
      DB.query("DESCRIBE development", (descError, descResult) => {
        if (descError) {
          console.error("❌ Error describing development table:", descError);
        } else {
          console.log("📋 Development table structure:", descResult);
        }
      });
    } else {
      console.log("❌ Development table does NOT exist");
      console.log("🔧 Creating development table...");
      
      const createDevelopmentTable = `
        CREATE TABLE development (
          development_id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          amount DECIMAL(15,2) NOT NULL,
          month_paid VARCHAR(20) NOT NULL,
          payment_type VARCHAR(50) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;
      
      DB.query(createDevelopmentTable, (createError) => {
        if (createError) {
          console.error("❌ Error creating development table:", createError);
        } else {
          console.log("✅ Development table created successfully");
        }
      });
    }
  }
});

// Test a simple insert to building table
setTimeout(() => {
  console.log("🧪 Testing building table insert...");
  DB.query(
    "INSERT INTO building (user_id, amount, month_paid, payment_type) VALUES (?, ?, ?, ?)",
    [1, 1000, "January", "cash"],
    (insertError, insertResult) => {
      if (insertError) {
        console.error("❌ Building insert test failed:", insertError);
      } else {
        console.log("✅ Building insert test successful:", insertResult.insertId);
        
        // Clean up test data
        DB.query("DELETE FROM building WHERE building_id = ?", [insertResult.insertId], (deleteError) => {
          if (deleteError) {
            console.error("❌ Failed to clean up test data:", deleteError);
          } else {
            console.log("✅ Test data cleaned up");
          }
        });
      }
    }
  );
}, 2000);

// Test a simple insert to development table
setTimeout(() => {
  console.log("🧪 Testing development table insert...");
  DB.query(
    "INSERT INTO development (user_id, amount, month_paid, payment_type) VALUES (?, ?, ?, ?)",
    [1, 1000, "January", "cash"],
    (insertError, insertResult) => {
      if (insertError) {
        console.error("❌ Development insert test failed:", insertError);
      } else {
        console.log("✅ Development insert test successful:", insertResult.insertId);
        
        // Clean up test data
        DB.query("DELETE FROM development WHERE development_id = ?", [insertResult.insertId], (deleteError) => {
          if (deleteError) {
            console.error("❌ Failed to clean up test data:", deleteError);
          } else {
            console.log("✅ Test data cleaned up");
          }
        });
      }
      
      // Exit after all tests
      setTimeout(() => {
        console.log("🎉 Database check completed");
        process.exit(0);
      }, 1000);
    }
  );
}, 3000);
