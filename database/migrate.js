const { DB } = require("../sql");

// Database migration script to add missing columns
const runMigrations = async () => {
  console.log('🔧 Running database migrations...');

  try {
    // Migration 1: Add created_at to users table
    await addCreatedAtToUsers();
    
    // Migration 2: Add created_at to savings table
    await addCreatedAtToSavings();
    
    // Migration 3: Add created_at to loans table
    await addCreatedAtToLoans();
    
    // Migration 4: Add updated_at columns
    await addUpdatedAtColumns();
    
    // Migration 5: Add missing columns to existing tables
    await addMissingColumns();
    
    console.log('✅ All migrations completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
};

// Add created_at column to users table
const addCreatedAtToUsers = async () => {
  return new Promise((resolve, reject) => {
    console.log('📝 Checking users table for created_at column...');
    
    DB.query("SHOW COLUMNS FROM users LIKE 'created_at'", (err, result) => {
      if (err) {
        reject(err);
        return;
      }
      
      if (result.length === 0) {
        console.log('➕ Adding created_at column to users table...');
        DB.query(
          "ALTER TABLE users ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
          (alterErr) => {
            if (alterErr) {
              console.error('❌ Failed to add created_at to users:', alterErr.message);
              reject(alterErr);
            } else {
              console.log('✅ Added created_at column to users table');
              resolve();
            }
          }
        );
      } else {
        console.log('✅ created_at column already exists in users table');
        resolve();
      }
    });
  });
};

// Add created_at column to savings table
const addCreatedAtToSavings = async () => {
  return new Promise((resolve, reject) => {
    console.log('📝 Checking savings table for created_at column...');
    
    DB.query("SHOW COLUMNS FROM savings LIKE 'created_at'", (err, result) => {
      if (err) {
        reject(err);
        return;
      }
      
      if (result.length === 0) {
        console.log('➕ Adding created_at column to savings table...');
        DB.query(
          "ALTER TABLE savings ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
          (alterErr) => {
            if (alterErr) {
              console.error('❌ Failed to add created_at to savings:', alterErr.message);
              reject(alterErr);
            } else {
              console.log('✅ Added created_at column to savings table');
              resolve();
            }
          }
        );
      } else {
        console.log('✅ created_at column already exists in savings table');
        resolve();
      }
    });
  });
};

// Add created_at column to loans table
const addCreatedAtToLoans = async () => {
  return new Promise((resolve, reject) => {
    console.log('📝 Checking loans table for created_at column...');
    
    DB.query("SHOW COLUMNS FROM loans LIKE 'created_at'", (err, result) => {
      if (err) {
        reject(err);
        return;
      }
      
      if (result.length === 0) {
        console.log('➕ Adding created_at column to loans table...');
        DB.query(
          "ALTER TABLE loans ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
          (alterErr) => {
            if (alterErr) {
              console.error('❌ Failed to add created_at to loans:', alterErr.message);
              reject(alterErr);
            } else {
              console.log('✅ Added created_at column to loans table');
              resolve();
            }
          }
        );
      } else {
        console.log('✅ created_at column already exists in loans table');
        resolve();
      }
    });
  });
};

// Add updated_at columns to tables
const addUpdatedAtColumns = async () => {
  const tables = ['users', 'savings', 'loans'];
  
  for (const table of tables) {
    await new Promise((resolve, reject) => {
      console.log(`📝 Checking ${table} table for updated_at column...`);
      
      DB.query(`SHOW COLUMNS FROM ${table} LIKE 'updated_at'`, (err, result) => {
        if (err) {
          reject(err);
          return;
        }
        
        if (result.length === 0) {
          console.log(`➕ Adding updated_at column to ${table} table...`);
          DB.query(
            `ALTER TABLE ${table} ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`,
            (alterErr) => {
              if (alterErr) {
                console.error(`❌ Failed to add updated_at to ${table}:`, alterErr.message);
                reject(alterErr);
              } else {
                console.log(`✅ Added updated_at column to ${table} table`);
                resolve();
              }
            }
          );
        } else {
          console.log(`✅ updated_at column already exists in ${table} table`);
          resolve();
        }
      });
    });
  }
};

// Add other missing columns
const addMissingColumns = async () => {
  const columnMigrations = [
    {
      table: 'users',
      column: 'profile_image',
      definition: 'VARCHAR(500) NULL',
      description: 'Profile image path'
    },
    {
      table: 'users',
      column: 'status',
      definition: "ENUM('active', 'inactive', 'suspended') DEFAULT 'active'",
      description: 'User status'
    },
    {
      table: 'savings',
      column: 'year_paid',
      definition: 'YEAR DEFAULT (YEAR(CURDATE()))',
      description: 'Year of payment'
    },
    {
      table: 'savings',
      column: 'status',
      definition: "ENUM('pending', 'confirmed', 'cancelled') DEFAULT 'confirmed'",
      description: 'Savings status'
    },
    {
      table: 'loans',
      column: 'next_payment_date',
      definition: 'DATE NULL',
      description: 'Next payment due date'
    },
    {
      table: 'loans',
      column: 'monthly_payment',
      definition: 'DECIMAL(15,2) DEFAULT 0',
      description: 'Monthly payment amount'
    }
  ];

  for (const migration of columnMigrations) {
    await new Promise((resolve, reject) => {
      console.log(`📝 Checking ${migration.table} table for ${migration.column} column...`);
      
      DB.query(`SHOW COLUMNS FROM ${migration.table} LIKE '${migration.column}'`, (err, result) => {
        if (err) {
          console.error(`Error checking ${migration.table}.${migration.column}:`, err.message);
          resolve(); // Continue with other migrations
          return;
        }
        
        if (result.length === 0) {
          console.log(`➕ Adding ${migration.column} column to ${migration.table} table...`);
          DB.query(
            `ALTER TABLE ${migration.table} ADD COLUMN ${migration.column} ${migration.definition}`,
            (alterErr) => {
              if (alterErr) {
                console.error(`❌ Failed to add ${migration.column} to ${migration.table}:`, alterErr.message);
                resolve(); // Continue with other migrations
              } else {
                console.log(`✅ Added ${migration.column} column to ${migration.table} table`);
                resolve();
              }
            }
          );
        } else {
          console.log(`✅ ${migration.column} column already exists in ${migration.table} table`);
          resolve();
        }
      });
    });
  }
};

// Check database structure
const checkDatabaseStructure = async () => {
  console.log('🔍 Checking database structure...');
  
  const tables = ['users', 'savings', 'loans', 'loan_application', 'admin'];
  
  for (const table of tables) {
    try {
      await new Promise((resolve, reject) => {
        DB.query(`DESCRIBE ${table}`, (err, result) => {
          if (err) {
            console.log(`❌ Table ${table} does not exist or has issues`);
            reject(err);
          } else {
            console.log(`✅ Table ${table} exists with ${result.length} columns`);
            resolve(result);
          }
        });
      });
    } catch (error) {
      console.log(`⚠️ Issue with table ${table}:`, error.message);
    }
  }
};

// Main migration function
const migrate = async () => {
  try {
    console.log('🚀 Starting database migration...');
    
    // Check current structure
    await checkDatabaseStructure();
    
    // Run migrations
    await runMigrations();
    
    // Check structure again
    console.log('\n📊 Final database structure:');
    await checkDatabaseStructure();
    
    console.log('\n🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  }
};

// Export functions
module.exports = {
  runMigrations,
  addCreatedAtToUsers,
  addCreatedAtToSavings,
  addCreatedAtToLoans,
  addUpdatedAtColumns,
  addMissingColumns,
  checkDatabaseStructure,
  migrate
};

// Run migration if this file is executed directly
if (require.main === module) {
  migrate().then(() => {
    console.log('Migration script completed');
    process.exit(0);
  }).catch((error) => {
    console.error('Migration script failed:', error);
    process.exit(1);
  });
}
