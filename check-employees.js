const mysql = require('mysql2/promise');

const DB_CONFIG = {
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'hrms_db_new'
};

async function checkEmployeesTable() {
    let connection;
    
    try {
        connection = await mysql.createConnection(DB_CONFIG);
        
        console.log('\n📊 Checking employees table structure:\n');
        const [columns] = await connection.query('DESCRIBE employees');
        
        const idColumn = columns.find(c => c.Field === 'id');
        const empIdColumn = columns.find(c => c.Field === 'EmployeeID');
        
        if (idColumn) {
            console.log('✅ employees table has an "id" column');
            console.log('   Field:', idColumn.Field);
            console.log('   Type:', idColumn.Type);
            console.log('   Key:', idColumn.Key);
        } else if (empIdColumn) {
            console.log('⚠️  employees table uses "EmployeeID" instead of "id"');
            console.log('   Field:', empIdColumn.Field);
            console.log('   Type:', empIdColumn.Type);
            console.log('   Key:', empIdColumn.Key);
        } else {
            console.log('❌ No id or EmployeeID column found!');
        }
        
        console.log('\n📋 All columns in employees table:');
        columns.forEach(c => console.log(`  - ${c.Field} (${c.Type})`));
        
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        if (connection) await connection.end();
    }
}

checkEmployeesTable();
