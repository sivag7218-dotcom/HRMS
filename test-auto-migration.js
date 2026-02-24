/**
 * Test Auto-Migration System
 * This simulates what happens when server starts
 */

const mysql = require('mysql2/promise');
const { runMigrations } = require('./migrations/run-migrations');

const DB_CONFIG = {
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'hrms_db_new'
};

async function testAutoMigration() {
    console.log('\n╔══════════════════════════════════════════════╗');
    console.log('║     Testing Auto-Migration System            ║');
    console.log('╚══════════════════════════════════════════════╝\n');
    
    const pool = mysql.createPool(DB_CONFIG);
    const connection = await pool.getConnection();
    
    try {
        console.log('✅ Connected to database\n');
        
        // Run migrations like server.js does
        await runMigrations(connection);
        
        console.log('\n🔍 Verifying tables exist...\n');
        
        const tables = [
            'employee_notification_preferences',
            'payroll_overtime',
            'payroll_bonuses',
            'tax_declarations',
            'analytics_cache',
            'document_expiry_tracking',
            'audit_log',
            'email_queue'
        ];
        
        for (const table of tables) {
            const [rows] = await connection.query(
                'SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = ? AND table_name = ?',
                [DB_CONFIG.database, table]
            );
            
            console.log(`${rows[0].count > 0 ? '✅' : '❌'} ${table}`);
        }
        
        // Check notifications table columns
        console.log('\n🔍 Verifying notifications table enhancements...\n');
        const [columns] = await connection.query('DESCRIBE notifications');
        const newColumns = ['type', 'priority', 'category', 'scheduled_for', 'sent_at', 'metadata'];
        
        for (const col of newColumns) {
            const exists = columns.find(c => c.Field === col);
            console.log(`${exists ? '✅' : '❌'} ${col} column`);
        }
        
        console.log('\n╔══════════════════════════════════════════════╗');
        console.log('║     Auto-Migration Test Complete             ║');
        console.log('╚══════════════════════════════════════════════╝\n');
        
    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        connection.release();
        await pool.end();
    }
}

testAutoMigration();
