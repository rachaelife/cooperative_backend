require('dotenv').config();
const { DB } = require('../sql');

async function addPasswordToUsers() {
  console.log('🔧 Adding Password Field to Users Table');
  console.log('=====================================');
  
  return new Promise((resolve, reject) => {
    // First, check if password column already exists
    DB.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'users' 
      AND COLUMN_NAME = 'password'
    `, [process.env.DB_NAME], (checkError, results) => {
      if (checkError) {
        console.error('❌ Error checking for password column:', checkError);
        reject(checkError);
        return;
      }

      if (results.length > 0) {
        console.log('✅ Password column already exists in users table');
        resolve({ message: 'Password column already exists' });
        return;
      }

      // Add password column if it doesn't exist
      DB.query(`
        ALTER TABLE users 
        ADD COLUMN password VARCHAR(255) NULL AFTER email,
        ADD COLUMN password_set_at TIMESTAMP NULL AFTER password,
        ADD COLUMN first_login BOOLEAN DEFAULT TRUE AFTER password_set_at
      `, (alterError) => {
        if (alterError) {
          console.error('❌ Error adding password column:', alterError);
          reject(alterError);
        } else {
          console.log('✅ Password fields added successfully to users table');
          console.log('   - password: VARCHAR(255) NULL');
          console.log('   - password_set_at: TIMESTAMP NULL');
          console.log('   - first_login: BOOLEAN DEFAULT TRUE');
          resolve({ message: 'Password fields added successfully' });
        }
      });
    });
  });
}

// Run if called directly
if (require.main === module) {
  addPasswordToUsers()
    .then((result) => {
      console.log('🎉 Database update completed:', result.message);
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Database update failed:', error.message);
      process.exit(1);
    });
}

module.exports = { addPasswordToUsers };
