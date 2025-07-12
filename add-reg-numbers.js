const { DB } = require('./sql');

console.log('🔧 Adding registration_number column...');

// Add the registration_number column
DB.query('ALTER TABLE users ADD COLUMN registration_number VARCHAR(50) AFTER user_id', (err, result) => {
  if (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('✅ registration_number column already exists');
    } else {
      console.error('❌ Error adding column:', err);
      process.exit(1);
    }
  } else {
    console.log('✅ registration_number column added successfully');
  }
  
  // Add index for the column
  DB.query('CREATE INDEX idx_registration_number ON users(registration_number)', (indexErr) => {
    if (indexErr && !indexErr.message.includes('Duplicate key name')) {
      console.error('⚠️ Warning: Could not create index:', indexErr);
    } else {
      console.log('✅ Index created for registration_number');
    }
    
    // Now generate registration numbers for all users
    console.log('🔄 Generating registration numbers...');
    DB.query('SELECT user_id FROM users ORDER BY user_id ASC', (userErr, users) => {
      if (userErr) {
        console.error('❌ Error fetching users:', userErr);
        process.exit(1);
      }
      
      console.log(`📝 Found ${users.length} users to update`);
      let completed = 0;
      
      if (users.length === 0) {
        console.log('ℹ️ No users found to update');
        process.exit(0);
      }
      
      users.forEach((user, index) => {
        const sequentialNumber = String(index + 1).padStart(3, '0');
        const registrationNumber = `COOP${sequentialNumber}`;
        
        DB.query(
          'UPDATE users SET registration_number = ? WHERE user_id = ?',
          [registrationNumber, user.user_id],
          (updateErr) => {
            completed++;
            if (updateErr) {
              console.error(`❌ Error updating user ${user.user_id}:`, updateErr);
            } else {
              console.log(`✅ User ${user.user_id} → ${registrationNumber}`);
            }
            
            if (completed === users.length) {
              console.log(`🎉 Successfully generated ${completed} registration numbers!`);
              
              // Verify the results
              DB.query('SELECT user_id, fullname, registration_number FROM users ORDER BY user_id LIMIT 5', (verifyErr, verifyUsers) => {
                if (!verifyErr) {
                  console.log('📊 Sample results:');
                  verifyUsers.forEach(user => {
                    console.log(`  ${user.user_id}: ${user.fullname} - ${user.registration_number}`);
                  });
                }
                process.exit(0);
              });
            }
          }
        );
      });
    });
  });
});
