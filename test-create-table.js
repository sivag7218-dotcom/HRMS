const mysql = require('mysql2/promise');

const DB_CONFIG = {
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'hrms_db_new'
};

async function testCreateTable() {
    let connection;
    
    try {
        connection = await mysql.createConnection(DB_CONFIG);
        
        console.log('\n🔄 Attempting to create employee_notification_preferences table...\n');
        
        const sql = `CREATE TABLE IF NOT EXISTS employee_notification_preferences (
          id INT AUTO_INCREMENT PRIMARY KEY,
          employee_id INT NOT NULL,
          preferences JSON NOT NULL COMMENT 'User notification preferences as JSON',
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY ux_employee_prefs (employee_id),
          KEY idx_employee (employee_id),
          CONSTRAINT fk_notif_pref_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`;
        
        await connection.execute(sql);
        console.log('✅ employee_notification_preferences table created successfully!\n');
        
        // Verify
        const [rows] = await connection.query(
            `SELECT COUNT(*) as count FROM information_schema.tables 
             WHERE table_schema = ? AND table_name = ?`,
            [DB_CONFIG.database, 'employee_notification_preferences']
        );
        
        console.log(`Verification: Table exists = ${rows[0].count > 0 ? 'YES' : 'NO'}`);
        
    } catch (err) {
        console.error('❌ Error:', err.message);
        console.error('Code:', err.code);
    } finally {
        if (connection) await connection.end();
    }
}

testCreateTable();
