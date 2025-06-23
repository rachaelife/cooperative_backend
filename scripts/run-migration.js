#!/usr/bin/env node
/**
 * Database Migration Script
 * 
 * This script adds missing columns to existing database tables
 * Run this script to fix the "Unknown column 'created_at'" error
 * 
 * Usage:
 *   node scripts/run-migration.js
 */
require('dotenv').config();
const { migrate } = require('../database/migrate');
// Run the migration
migrate()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    process.exit(1);
  });
