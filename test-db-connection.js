const mysql = require("mysql2");
require("dotenv").config();

console.log("🔍 Testing database connection...");
console.log("📋 Configuration:");
console.log("   Host:", process.env.DB_HOST);
console.log("   User:", process.env.DB_USER);
console.log("   Database:", process.env.DB_NAME);
console.log("   Password:", process.env.DB_PASSWORD ? "***" : "NOT SET");

// Create connection
const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

// Test connection
connection.connect((err) => {
    if (err) {
        console.error("❌ Connection failed:");
        console.error("   Error code:", err.code);
        console.error("   Error message:", err.message);
        
        if (err.code === 'ER_ACCESS_DENIED_ERROR') {
            console.log("💡 Solution: Check username and password");
        } else if (err.code === 'ER_BAD_DB_ERROR') {
            console.log("💡 Solution: Database 'coorperative' doesn't exist. Create it first:");
            console.log("   mysql -u root -p");
            console.log("   CREATE DATABASE coorperative;");
        } else if (err.code === 'ECONNREFUSED') {
            console.log("💡 Solution: MySQL server is not running. Start MySQL service.");
        }
        
        process.exit(1);
    }
    
    console.log("✅ Connected to database successfully!");
    
    // Test basic query
    connection.query("SELECT 1 as test", (err, results) => {
        if (err) {
            console.error("❌ Query test failed:", err.message);
        } else {
            console.log("✅ Query test passed:", results);
        }
        
        // Test if loan_application table exists
        connection.query("SHOW TABLES LIKE 'loan_application'", (err, results) => {
            if (err) {
                console.error("❌ Table check failed:", err.message);
            } else if (results.length === 0) {
                console.log("⚠️ loan_application table doesn't exist");
                console.log("💡 Run database initialization script");
            } else {
                console.log("✅ loan_application table exists");
                
                // Check for approved loans
                connection.query("SELECT COUNT(*) as count FROM loan_application WHERE loan_status = 'approved'", (err, results) => {
                    if (err) {
                        console.error("❌ Approved loans check failed:", err.message);
                    } else {
                        console.log("📊 Approved loans found:", results[0].count);
                    }
                    
                    connection.end();
                    console.log("🔚 Test completed");
                });
            }
        });
    });
});
