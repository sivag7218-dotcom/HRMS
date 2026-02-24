/**
 * DATABASE MIGRATION SCRIPT
 * Run this to add enhanced features tables and columns
 * 
 * Usage: node setup-enhanced-features.js
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const DB_CONFIG = {
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'hrms_db_new',
    multipleStatements: false  // Changed to false for safer execution
};

async function runMigration() {
    console.log('\n🚀 Starting Enhanced Features Migration...\n');
    
    let connection;
    
    try {
        // Connect to database
        console.log('📡 Connecting to database...');
        connection = await mysql.createConnection(DB_CONFIG);
        console.log('✅ Connected to database\n');
        
        // Read migration file
        const migrationPath = path.join(__dirname, 'migrations', 'enhanced_features_schema.sql');
        
        if (!fs.existsSync(migrationPath)) {
            console.error('❌ Migration file not found:', migrationPath);
            process.exit(1);
        }
        
        console.log('📄 Reading migration file...');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        // Better SQL parsing: split by semicolons but preserve multiline statements
        const statements = [];
        let currentStatement = '';
        let inComment = false;
        
        const lines = migrationSQL.split('\n');
        for (const line of lines) {
            const trimmed = line.trim();
            
            // Skip single-line comments
            if (trimmed.startsWith('--')) continue;
            
            // Handle multi-line comments
            if (trimmed.includes('/*')) inComment = true;
            if (inComment) {
                if (trimmed.includes('*/')) inComment = false;
                continue;
            }
            
            // Accumulate statement
            currentStatement += line + '\n';
            
            // Check if statement is complete (ends with semicolon)
            if (trimmed.endsWith(';')) {
                const stmt = currentStatement.trim();
                if (stmt.length > 0) {
                    statements.push(stmt.slice(0, -1)); // Remove trailing semicolon
                }
                currentStatement = '';
            }
        }
        
        console.log(`📝 Found ${statements.length} SQL statements\n`);
        
        // Execute each statement
        let successCount = 0;
        let skipCount = 0;
        let errorCount = 0;
        
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i].trim();
            
            if (statement.length === 0) continue;
            
            try {
                await connection.query(statement);
                successCount++;
                
                // Show progress
                if (statement.includes('CREATE TABLE')) {
                    const match = statement.match(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?`?(\w+)`?/i);
                    if (match) {
                        console.log(`✅ Created table: ${match[1]}`);
                    }
                } else if (statement.includes('ALTER TABLE') && statement.includes('ADD COLUMN')) {
                    const match = statement.match(/ALTER TABLE\s+`?(\w+)`?/i);
                    if (match) {
                        console.log(`✅ Altered table: ${match[1]}`);
                    }
                } else if (statement.includes('CREATE INDEX') || statement.includes('CREATE FULLTEXT')) {
                    const match = statement.match(/CREATE\s+(?:FULLTEXT\s+)?INDEX\s+(?:IF NOT EXISTS\s+)?`?(\w+)`?/i);
                    if (match) {
                        console.log(`✅ Created index: ${match[1]}`);
                    }
                }
            } catch (err) {
                // Skip if already exists
                if (err.code === 'ER_TABLE_EXISTS_ERROR' || 
                    err.code === 'ER_DUP_FIELDNAME' ||
                    err.code === 'ER_DUP_KEYNAME' ||
                    err.message.includes('Duplicate') ||
                    err.message.includes('already exists')) {
                    skipCount++;
                    const preview = statement.substring(0, 50).replace(/\n/g, ' ');
                    console.log(`⏭️  Skipped (already exists): ${preview}...`);
                } else {
                    console.error(`⚠️ Error in statement ${i + 1}:`, err.message);
                    errorCount++;
                }
            }
        }
        
        console.log('\n' + '='.repeat(60));
        console.log('📊 Migration Summary:');
        console.log('='.repeat(60));
        console.log(`✅ Successful: ${successCount}`);
        console.log(`⏭️  Skipped (already exists): ${skipCount}`);
        console.log(`❌ Errors: ${errorCount}`);
        console.log('='.repeat(60));
        
        // Verify new tables
        console.log('\n🔍 Verifying new tables...\n');
        
        const tablesToCheck = [
            'employee_notification_preferences',
            'payroll_overtime',
            'payroll_bonuses',
            'tax_declarations',
            'analytics_cache',
            'document_expiry_tracking',
            'audit_log',
            'email_queue'
        ];
        
        let createdCount = 0;
        for (const table of tablesToCheck) {
            try {
                const [rows] = await connection.query(
                    `SELECT COUNT(*) as count FROM information_schema.tables 
                     WHERE table_schema = ? AND table_name = ?`,
                    [DB_CONFIG.database, table]
                );
                
                if (rows[0].count > 0) {
                    console.log(`✅ ${table}`);
                    createdCount++;
                } else {
                    console.log(`⚠️  ${table} - Not found`);
                }
            } catch (err) {
                console.log(`❌ ${table} - Error checking`);
            }
        }
        
        console.log('\n' + '='.repeat(60));
        console.log(`✅ Successfully created ${createdCount} out of ${tablesToCheck.length} tables`);
        console.log('='.repeat(60));
        
        if (errorCount === 0 && createdCount === tablesToCheck.length) {
            console.log('\n✨ Migration completed successfully!\n');
            console.log('📖 Next steps:');
            console.log('   1. Restart your server: npm start');
            console.log('   2. Test new endpoints: http://localhost:3000/api-docs');
            console.log('   3. Check ENHANCED_FEATURES_GUIDE.md for usage examples\n');
        } else {
            console.log('\n⚠️  Migration completed with some issues. Review the output above.\n');
        }
        
    } catch (err) {
        console.error('\n❌ Migration failed:', err.message);
        console.error('\nStack trace:', err.stack);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            console.log('👋 Database connection closed\n');
        }
    }
}

// Run migration
runMigration().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
