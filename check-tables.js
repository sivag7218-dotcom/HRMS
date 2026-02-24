const mysql = require('mysql2/promise');

const DB_CONFIG = {
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'hrms_db_new'
};

async function checkTables() {
    let connection;
    
    try {
        connection = await mysql.createConnection(DB_CONFIG);
        
        console.log('\n📊 Checking notifications table structure:\n');
        const [columns] = await connection.query('DESCRIBE notifications');
        console.table(columns);
        
        console.log('\n📋 Checking existing tables:\n');
        const [tables] = await connection.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'hrms_db_new' 
            AND table_name IN (
                'employee_notification_preferences',
                'payroll_overtime',
                'payroll_bonuses',
                'tax_declarations',
                'analytics_cache',
                'document_expiry_tracking',
                'audit_log',
                'email_queue'
            )
        `);
        
        if (tables.length > 0) {
            console.log('Found tables:');
            tables.forEach(t => console.log(`  - ${t.table_name}`));
        } else {
            console.log('None of the enhanced feature tables exist yet.');
        }
        
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        if (connection) await connection.end();
    }
}

checkTables();
