const mysql = require("mysql2");
require("dotenv").config();

console.log("🔧 Initializing database connection...");
console.log("📋 Database config:", {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    database: process.env.DB_NAME || 'coorperative',
    password: process.env.DB_PASSWORD ? '***' : 'NOT SET'
});

// Create connection pool with enhanced configuration
const DB = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'coorperative',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    acquireTimeout: 60000,
    timeout: 60000,
    reconnect: true,
    multipleStatements: true
});

// Test connection with detailed error handling
DB.getConnection((err, connection) => {
    if (err) {
        console.error("❌ Database connection failed!");
        console.error("❌ Error code:", err.code);
        console.error("❌ Error message:", err.message);

        switch(err.code) {
            case 'ER_ACCESS_DENIED_ERROR':
                console.log("💡 Fix: Check username and password in .env file");
                break;
            case 'ER_BAD_DB_ERROR':
                console.log("💡 Fix: Database doesn't exist. Create it with:");
                console.log("   CREATE DATABASE coorperative;");
                break;
            case 'ECONNREFUSED':
                console.log("💡 Fix: MySQL server is not running. Start MySQL service.");
                break;
            case 'ENOTFOUND':
                console.log("💡 Fix: Check DB_HOST in .env file");
                break;
            default:
                console.log("💡 Fix: Check database configuration");
        }
    } else {
        console.log("✅ Database connected successfully!");
        console.log("✅ Connection pool created with 10 connections");
        connection.release();

        // Test basic query
        DB.query("SELECT 1 as test", (testErr, result) => {
            if (testErr) {
                console.error("❌ Database query test failed:", testErr.message);
            } else {
                console.log("✅ Database query test passed");
            }
        });
    }
});

// Export only callback-based DB
module.exports = { DB };