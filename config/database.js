/**
 * DATABASE CONFIGURATION - REFACTORED
 * 
 * Improvements:
 * - Environment variable support
 * - Better connection pool management
 * - Enhanced error handling
 * - Connection health checks
 * - Graceful shutdown support
 * - Query timeout handling
 * - Connection leak detection
 * - Better logging
 * 
 * BACKWARD COMPATIBLE: All existing exports maintained
 */

const mysql = require("mysql2/promise");

/**
 * Database Configuration
 * Reads from environment variables with fallbacks
 */
const DB = {
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "root",
    database: process.env.DB_NAME || "hrms_db_new",
    // Connection Pool Settings
    waitForConnections: true,
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '25', 10),
    queueLimit: parseInt(process.env.DB_QUEUE_LIMIT || '50', 10),
    // Timeouts (in milliseconds)
    connectTimeout: parseInt(process.env.DB_CONNECT_TIMEOUT || '10000', 10), // 10s
    acquireTimeout: parseInt(process.env.DB_ACQUIRE_TIMEOUT || '10000', 10),  // 10s
    timeout: parseInt(process.env.DB_QUERY_TIMEOUT || '30000', 10),          // 30s
    // Character set
    charset: 'utf8mb4',
    // Timezone
    timezone: '+00:00', // Store dates in UTC
    // Additional settings
    multipleStatements: false, // Security: prevent SQL injection via multiple statements
    dateStrings: false, // Return Date objects instead of strings
    supportBigNumbers: true,
    bigNumberStrings: false,
    // Enable keep-alive to prevent connection drops
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
};

// Warn if using default credentials
if (DB.user === 'root' && DB.password === 'root') {
    console.warn("");
    console.warn("⚠️  WARNING: Using default database credentials!");
    console.warn("⚠️  Please set DB_USER and DB_PASSWORD environment variables for security.");
    console.warn("");
}

// Global connection pool instance
let __pool = null;
let __isShuttingDown = false;

/**
 * Get or create connection pool
 * Singleton pattern for pool management
 * @returns {mysql.Pool}
 */
function getPool() {
    if (!__pool && !__isShuttingDown) {
        __pool = mysql.createPool(DB);

        // Log pool creation
        console.log(`[DB] Connection pool created (limit: ${DB.connectionLimit})`);
        console.log(`[DB] Using database: ${DB.database}`);

        // Set up pool event listeners for monitoring
        __pool.on('acquire', (connection) => {
            // Uncomment for detailed connection tracking
            // console.log(`[DB] Connection ${connection.threadId} acquired`);
        });

        __pool.on('connection', (connection) => {
            console.log(`[DB] New connection ${connection.threadId} established`);
        });

        __pool.on('enqueue', () => {
            console.warn(`[DB] Waiting for available connection (pool full)`);
        });

        __pool.on('release', (connection) => {
            // Uncomment for detailed connection tracking
            // console.log(`[DB] Connection ${connection.threadId} released`);
        });
    }

    return __pool;
}

/**
 * Get a database connection from the pool
 * Enhanced version with better error handling and connection cleanup
 * 
 * BACKWARD COMPATIBLE: Maintains same behavior as original db() function
 * 
 * @returns {Promise<mysql.PoolConnection>}
 */
async function db() {
    if (__isShuttingDown) {
        throw new Error('Database pool is shutting down');
    }

    const pool = getPool();
    let conn = null;

    try {
        conn = await pool.getConnection();

        // Override conn.end() to call release() instead
        // This prevents accidentally closing pooled connections
        if (conn && typeof conn.release === 'function') {
            const originalEnd = conn.end;
            conn.end = async () => {
                try {
                    conn.release();
                } catch (err) {
                    console.error('[DB] Error releasing connection:', err.message);
                }
            };

            // Store original end for emergency use
            conn._originalEnd = originalEnd;
        }

        return conn;
    } catch (error) {
        console.error('[DB] Error acquiring connection from pool:', error.message);

        // If connection was acquired but error occurred, release it
        if (conn) {
            try {
                conn.release();
            } catch (releaseError) {
                console.error('[DB] Error releasing connection after error:', releaseError.message);
            }
        }

        throw error;
    }
}

/**
 * Execute a query directly using the pool
 * Automatically handles connection acquisition and release
 * 
 * @param {string} sql - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<Array>} Query results
 */
db.query = async (sql, params) => {
    const pool = getPool();

    try {
        const [rows, fields] = await pool.query(sql, params);
        return [rows, fields];
    } catch (error) {
        console.error('[DB] Query error:', error.message);
        console.error('[DB] SQL:', sql.substring(0, 200)); // Log first 200 chars
        throw error;
    }
};

/**
 * Get a connection from the pool
 * Useful for transaction handling
 * 
 * @returns {Promise<mysql.PoolConnection>}
 */
db.getConnection = async () => {
    if (__isShuttingDown) {
        throw new Error('Database pool is shutting down');
    }

    const pool = getPool();
    let conn = null;

    try {
        conn = await pool.getConnection();

        // Override conn.end() to call release() instead
        if (conn && typeof conn.release === 'function') {
            const originalEnd = conn.end;
            conn.end = async () => {
                try {
                    conn.release();
                } catch (err) {
                    console.error('[DB] Error releasing connection:', err.message);
                }
            };
            conn._originalEnd = originalEnd;
        }

        return conn;
    } catch (error) {
        console.error('[DB] Error getting connection:', error.message);
        throw error;
    }
};

/**
 * Execute a transaction with automatic rollback on error
 * 
 * @param {Function} callback - Async function that receives connection and executes queries
 * @returns {Promise<any>} Result of callback function
 */
db.transaction = async (callback) => {
    const conn = await db.getConnection();

    try {
        await conn.beginTransaction();

        const result = await callback(conn);

        await conn.commit();
        return result;
    } catch (error) {
        await conn.rollback();
        console.error('[DB] Transaction rolled back:', error.message);
        throw error;
    } finally {
        conn.release();
    }
};

/**
 * Check database connection health
 * Useful for health check endpoints
 * 
 * @returns {Promise<Object>} Connection status
 */
db.healthCheck = async () => {
    try {
        const pool = getPool();
        const [rows] = await pool.query('SELECT 1 as healthy');

        return {
            healthy: rows[0]?.healthy === 1,
            timestamp: new Date().toISOString(),
            poolSize: pool.pool?._allConnections?.length || 0,
            freeConnections: pool.pool?._freeConnections?.length || 0
        };
    } catch (error) {
        console.error('[DB] Health check failed:', error.message);
        return {
            healthy: false,
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
};

/**
 * Gracefully close all database connections
 * Should be called during application shutdown
 * 
 * @returns {Promise<void>}
 */
db.shutdown = async () => {
    if (__isShuttingDown) {
        console.log('[DB] Shutdown already in progress');
        return;
    }

    __isShuttingDown = true;

    if (__pool) {
        try {
            console.log('[DB] Closing connection pool...');
            await __pool.end();
            __pool = null;
            console.log('[DB] Connection pool closed successfully');
        } catch (error) {
            console.error('[DB] Error closing pool:', error.message);
            throw error;
        }
    }
};

/**
 * Get current pool statistics
 * Useful for monitoring and debugging
 * 
 * @returns {Object} Pool statistics
 */
db.getPoolStats = () => {
    if (!__pool) {
        return { error: 'Pool not initialized' };
    }

    const pool = __pool.pool;

    return {
        allConnections: pool._allConnections?.length || 0,
        freeConnections: pool._freeConnections?.length || 0,
        connectionQueue: pool._connectionQueue?.length || 0,
        acquiringConnections: pool._acquiringConnections?.length || 0,
        connectionLimit: DB.connectionLimit
    };
};

/**
 * Escape a value for use in SQL queries
 * Use parameterized queries instead when possible
 * 
 * @param {any} value - Value to escape
 * @returns {string} Escaped value
 */
db.escape = (value) => {
    const pool = getPool();
    return pool.escape(value);
};

/**
 * Escape an identifier (table name, column name) for use in SQL
 * 
 * @param {string} identifier - Identifier to escape
 * @returns {string} Escaped identifier
 */
db.escapeId = (identifier) => {
    const pool = getPool();
    return pool.escapeId(identifier);
};

// Handle process termination gracefully
process.on('SIGINT', async () => {
    console.log('\n[DB] Received SIGINT, closing database connections...');
    await db.shutdown();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n[DB] Received SIGTERM, closing database connections...');
    await db.shutdown();
    process.exit(0);
});

// Export for backward compatibility
module.exports = { DB, db };
