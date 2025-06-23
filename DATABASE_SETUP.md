# Database Setup Guide

## 🚨 **FIXING THE "Unknown column 'created_at'" ERROR**

If you're seeing this error:
```
Error: Unknown column 'created_at' in 'where clause'
```

This means your database tables are missing the `created_at` columns. Follow the steps below to fix this issue.

---

## 🔧 **Quick Fix (Recommended)**

### Option 1: Run Migration Script
```bash
cd fin_tech
npm run migrate
```

### Option 2: Manual Migration
```bash
cd fin_tech
node scripts/run-migration.js
```

### Option 3: Full Database Initialization
```bash
cd fin_tech
npm run db:init
```

---

## 📋 **What the Migration Does**

The migration script will add these missing columns to your existing tables:

### Users Table
- `created_at` - TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- `updated_at` - TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
- `profile_image` - VARCHAR(500) NULL
- `status` - ENUM('active', 'inactive', 'suspended') DEFAULT 'active'

### Savings Table
- `created_at` - TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- `updated_at` - TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
- `year_paid` - YEAR DEFAULT (YEAR(CURDATE()))
- `status` - ENUM('pending', 'confirmed', 'cancelled') DEFAULT 'confirmed'

### Loans Table
- `created_at` - TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- `updated_at` - TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
- `next_payment_date` - DATE NULL
- `monthly_payment` - DECIMAL(15,2) DEFAULT 0

---

## 🗄️ **Complete Database Schema**

If you want to start fresh with the complete schema:

1. **Backup your existing data** (if any):
   ```sql
   mysqldump -u your_username -p coorperative > backup.sql
   ```

2. **Drop and recreate the database**:
   ```sql
   DROP DATABASE IF EXISTS coorperative;
   CREATE DATABASE coorperative;
   USE coorperative;
   ```

3. **Run the complete schema**:
   ```bash
   mysql -u your_username -p coorperative < database/schema.sql
   ```

4. **Or use the initialization script**:
   ```bash
   npm run db:init
   ```

---

## 🔍 **Troubleshooting**

### Error: "Access denied for user"
- Check your `.env` file database credentials
- Make sure MySQL user has proper permissions

### Error: "Can't connect to MySQL server"
- Make sure MySQL server is running
- Check the host and port in your `.env` file

### Error: "Unknown database 'coorperative'"
- Create the database manually:
  ```sql
  CREATE DATABASE coorperative;
  ```

### Error: "Table doesn't exist"
- Run the full database initialization:
  ```bash
  npm run db:init
  ```

---

## 📊 **Verifying the Fix**

After running the migration, you can verify it worked by:

1. **Check the server logs** - should show successful migration messages
2. **Access the dashboard** - should load without errors
3. **Check database structure**:
   ```sql
   USE coorperative;
   DESCRIBE users;
   DESCRIBE savings;
   DESCRIBE loans;
   ```

---

## 🚀 **Environment Setup**

Make sure your `.env` file has the correct database configuration:

```env
DB_HOST=localhost
DB_USER=your_mysql_username
DB_PASSWORD=your_mysql_password
DB_NAME=coorperative
DB_PORT=3306
```

---

## 📞 **Need Help?**

If you're still having issues:

1. **Check the server logs** for detailed error messages
2. **Verify MySQL is running**: `mysql -u root -p`
3. **Check database exists**: `SHOW DATABASES;`
4. **Verify table structure**: `DESCRIBE table_name;`

The migration script includes detailed logging to help identify any issues.

---

## 🎯 **Summary**

The quickest way to fix the "created_at" error is:

```bash
cd fin_tech
npm run migrate
```

This will safely add all missing columns to your existing tables without losing any data.
