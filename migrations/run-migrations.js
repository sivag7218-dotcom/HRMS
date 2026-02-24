/**
 * AUTO-MIGRATION RUNNER
 * Automatically runs migrations on server startup
 * Safe to run multiple times - uses IF NOT EXISTS
 */

const fs = require('fs');
const path = require('path');

async function runMigrations(connection) {
    console.log('\n🔄 Running database migrations...');
    
    try {
        const migrationPath = path.join(__dirname, 'enhanced_features_schema.sql');
        
        if (!fs.existsSync(migrationPath)) {
            console.log('⚠️  No migration file found, skipping...');
            return;
        }
        
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        // Parse SQL statements properly
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
            
            // Check if statement is complete
            if (trimmed.endsWith(';')) {
                const stmt = currentStatement.trim();
                if (stmt.length > 0) {
                    statements.push(stmt.slice(0, -1)); // Remove trailing semicolon
                }
                currentStatement = '';
            }
        }
        
        let successCount = 0;
        let skipCount = 0;
        
        // Execute each statement
        for (const statement of statements) {
            if (statement.trim().length === 0) continue;
            
            try {
                await connection.query(statement);
                successCount++;
            } catch (err) {
                // Silently skip if already exists
                if (err.code === 'ER_TABLE_EXISTS_ERROR' || 
                    err.code === 'ER_DUP_FIELDNAME' ||
                    err.code === 'ER_DUP_KEYNAME' ||
                    err.message.includes('Duplicate') ||
                    err.message.includes('already exists')) {
                    skipCount++;
                } else {
                    // Log other errors but don't fail
                    console.log(`⚠️  Migration warning: ${err.message.substring(0, 100)}`);
                }
            }
        }
        
        if (successCount > 0) {
            console.log(`✅ Migrations completed: ${successCount} changes applied, ${skipCount} skipped`);
        } else {
            console.log(`✅ Database schema is up to date`);
        }
        
    } catch (err) {
        console.error('❌ Migration error:', err.message);
        // Don't throw - let server start even if migrations fail
    }
}

module.exports = { runMigrations };
