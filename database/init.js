const { DB } = require("../sql");
const { runMigrations } = require("./migrate");
const fs = require('fs');
const path = require('path');

// Initialize database with proper schema
const initializeDatabase = async () => {
  try {
    console.log('🔧 Initializing database schema...');

    // Read and execute schema file
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Split schema into individual statements
    const statements = schema.split(';').filter(stmt => stmt.trim().length > 0);
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await new Promise((resolve, reject) => {
            DB.query(statement.trim(), (err, result) => {
              if (err) {
                // Ignore "already exists" errors for views and tables
                if (err.code === 'ER_TABLE_EXISTS_ERROR' || 
                    err.code === 'ER_DUP_KEYNAME' ||
                    err.message.includes('already exists')) {
                  console.log('⚠️ Skipping existing object:', err.message.split('\n')[0]);
                  resolve(result);
                } else {
                  reject(err);
                }
              } else {
                resolve(result);
              }
            });
          });
        } catch (error) {
          console.error('❌ Error executing statement:', error.message);
          console.error('Statement:', statement.substring(0, 100) + '...');
        }
      }
    }

    console.log('✅ Database schema initialized successfully');
    
    // Verify critical tables exist
    await verifyTables();
    
    // Add missing columns if needed
    await addMissingColumns();
    
    console.log('✅ Database initialization completed');
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
};

// Verify that all critical tables exist
const verifyTables = async () => {
  const requiredTables = [
    'users', 'admin', 'savings', 'loan_application', 
    'loans', 'loan_installments', 'loan_payments', 
    'loan_repayments', 'transactions', 'system_settings'
  ];

  console.log('🔍 Verifying required tables...');

  for (const table of requiredTables) {
    try {
      await new Promise((resolve, reject) => {
        DB.query(`SHOW TABLES LIKE '${table}'`, (err, result) => {
          if (err) {
            reject(err);
          } else if (result.length === 0) {
            console.error(`❌ Required table '${table}' does not exist`);
            reject(new Error(`Table ${table} missing`));
          } else {
            console.log(`✅ Table '${table}' exists`);
            resolve(result);
          }
        });
      });
    } catch (error) {
      console.error(`❌ Error verifying table ${table}:`, error.message);
      throw error;
    }
  }
};

// Add missing columns to existing tables
const addMissingColumns = async () => {
  console.log('🔧 Checking for missing columns...');

  const columnUpdates = [
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
      table: 'users',
      column: 'updated_at',
      definition: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
      description: 'Last update timestamp'
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
      definition: 'DECIMAL(15,2) NOT NULL DEFAULT 0',
      description: 'Monthly payment amount'
    }
  ];

  for (const update of columnUpdates) {
    try {
      // Check if column exists
      const columnExists = await new Promise((resolve) => {
        DB.query(
          `SHOW COLUMNS FROM ${update.table} LIKE '${update.column}'`,
          (err, result) => {
            if (err) {
              console.error(`Error checking column ${update.table}.${update.column}:`, err.message);
              resolve(false);
            } else {
              resolve(result.length > 0);
            }
          }
        );
      });

      if (!columnExists) {
        console.log(`➕ Adding missing column: ${update.table}.${update.column}`);
        
        await new Promise((resolve, reject) => {
          DB.query(
            `ALTER TABLE ${update.table} ADD COLUMN ${update.column} ${update.definition}`,
            (err, result) => {
              if (err) {
                console.error(`❌ Failed to add column ${update.table}.${update.column}:`, err.message);
                reject(err);
              } else {
                console.log(`✅ Added column: ${update.table}.${update.column}`);
                resolve(result);
              }
            }
          );
        });
      } else {
        console.log(`✅ Column exists: ${update.table}.${update.column}`);
      }
    } catch (error) {
      console.error(`❌ Error updating column ${update.table}.${update.column}:`, error.message);
      // Continue with other columns even if one fails
    }
  }
};

// Create default admin user if none exists
const createDefaultAdmin = async () => {
  try {
    console.log('👤 Checking for admin users...');
    
    const adminExists = await new Promise((resolve, reject) => {
      DB.query('SELECT COUNT(*) as count FROM admin', (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result[0].count > 0);
        }
      });
    });

    if (!adminExists) {
      console.log('➕ Creating default admin user...');
      
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      await new Promise((resolve, reject) => {
        DB.query(
          'INSERT INTO admin (fullname, email, password, role) VALUES (?, ?, ?, ?)',
          ['System Administrator', 'admin@cooperative.com', hashedPassword, 'super_admin'],
          (err, result) => {
            if (err) {
              reject(err);
            } else {
              console.log('✅ Default admin user created');
              console.log('📧 Email: admin@cooperative.com');
              console.log('🔑 Password: admin123');
              console.log('⚠️ Please change the default password after first login');
              resolve(result);
            }
          }
        );
      });
    } else {
      console.log('✅ Admin users already exist');
    }
  } catch (error) {
    console.error('❌ Error creating default admin:', error.message);
  }
};

// Get database statistics
const getDatabaseStats = async () => {
  try {
    console.log('📊 Database Statistics:');
    
    const tables = ['users', 'savings', 'loans', 'loan_application', 'admin'];
    
    for (const table of tables) {
      try {
        const count = await new Promise((resolve, reject) => {
          DB.query(`SELECT COUNT(*) as count FROM ${table}`, (err, result) => {
            if (err) {
              reject(err);
            } else {
              resolve(result[0].count);
            }
          });
        });
        
        console.log(`   ${table}: ${count} records`);
      } catch (error) {
        console.log(`   ${table}: Error getting count`);
      }
    }
  } catch (error) {
    console.error('❌ Error getting database stats:', error.message);
  }
};

// Main initialization function
const runDatabaseInit = async () => {
  try {
    await initializeDatabase();

    // Run migrations to add missing columns
    console.log('🔄 Running database migrations...');
    await runMigrations();

    await createDefaultAdmin();
    await getDatabaseStats();
    console.log('🎉 Database initialization completed successfully!');
  } catch (error) {
    console.error('💥 Database initialization failed:', error);
    console.log('⚠️ Continuing without full database setup...');
    // Don't exit process, let server continue
  }
};

module.exports = {
  initializeDatabase,
  verifyTables,
  addMissingColumns,
  createDefaultAdmin,
  getDatabaseStats,
  runDatabaseInit
};
