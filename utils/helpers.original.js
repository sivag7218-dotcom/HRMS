const { db } = require("../config/database");

// Helper: find employee record for a given user id by matching username to WorkEmail or EmployeeNumber
async function findEmployeeByUserId(userId) {
    const c = await db();
    try {
        const [u] = await c.query("SELECT username FROM users WHERE id = ?", [userId]);
        if (!u || !u.length) return null;
        const username = u[0].username;
        const [emp] = await c.query("SELECT * FROM employees WHERE WorkEmail = ? OR EmployeeNumber = ? LIMIT 1", [username, username]);
        if (!emp || !emp.length) return null;
        return emp[0];
    } finally {
        c.end();
    }
}

function toMySQLDateTime(val) {
    if (!val) return null;
    const d = new Date(val);
    if (isNaN(d.getTime())) return null;
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}

// Helper: get or create master record and return id
async function getOrCreateMaster(conn, table, column, value, context = {}) {
    if (!value || String(value).trim() === '') return null;
    const val = String(value).trim();
    
    try {
        // 1. Check if the master record already exists
        const [rows] = await conn.query(
            `SELECT id FROM \`${table}\` WHERE \`${column}\` = ? LIMIT 1`, 
            [val]
        );
        
        if (rows.length) {
            console.log(`✓ Found existing ${table}: ${val}`);
            return rows[0].id;
        }
        
        // 2. If it doesn't exist, create it with auto-populated fields
        console.log(`+ Creating new ${table}: ${val}`);

        if (table === 'weekly_off_policies') {
            // Generate a unique policy code and use context for links
            const policyCode = `WOP-${val.replace(/\s+/g, '-').toUpperCase()}-${Date.now().toString().slice(-4)}`;
            
            const [res] = await conn.query(
                `INSERT INTO weekly_off_policies (
                    name, policy_code, effective_date, 
                    location_id, department_id, shift_policy_id, is_active
                ) VALUES (?, ?, CURRENT_DATE, ?, ?, ?, 1)`, 
                [
                    val, 
                    policyCode, 
                    context.location_id || null, 
                    context.department_id || null, 
                    context.shift_policy_id || null
                ]
            );
            return res.insertId;
        }

        // Default behavior for simple masters (Locations, Departments, etc.)
        const [res] = await conn.query(`INSERT INTO \`${table}\` (\`${column}\`) VALUES (?)`, [val]);
        return res.insertId;

    } catch (error) {
        console.error(`✗ Error in getOrCreateMaster for ${table}:`, error.message);
        throw error;
    }
}
// async function getOrCreateMaster(conn, table, column, value) {
//     if (value === undefined || value === null || String(value).trim() === '') return null;
//     const val = String(value).trim();
    
//     try {
//         // Check if exists
//         const [rows] = await conn.query(`SELECT id FROM \`${table}\` WHERE \`${column}\` = ? LIMIT 1`, [val]);
//         if (rows.length) {
//             console.log(`✓ Found existing ${table}: ${val} (ID: ${rows[0].id})`);
//             return rows[0].id;
//         }
        
//         // Create new entry
//         const [res] = await conn.query(`INSERT INTO \`${table}\` (\`${column}\`) VALUES (?)`, [val]);
//         console.log(`✓ Created new ${table}: ${val} (ID: ${res.insertId})`);
//         return res.insertId;
//     } catch (error) {
//         console.error(`✗ Error in getOrCreateMaster for ${table}.${column}="${val}":`, error.message);
//         throw error;
//     }
// }

module.exports = { findEmployeeByUserId, toMySQLDateTime, getOrCreateMaster };
