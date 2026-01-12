const mysql = require('mysql2');
require('dotenv').config();
const bcrypt = require('bcryptjs');

const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ca_firm_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

let db;
let isMock = false;

// Determine if we should use Mock DB based on explicit ENV var
if (process.env.MOCK_DB === 'true' && process.env.NODE_ENV === 'development') {
    isMock = true;
    console.warn('⚠️ MOCK_DB is enabled. Application will run with mock data.');
} else {
    try {
        db = mysql.createPool(dbConfig);

        // Test connection
        db.getConnection((err, connection) => {
            if (err) {
                console.error('❌ Database connection failed:', err.message);
                // We do NOT fallback to mock automatically in production or without explicit flag
                // process.exit(1); // Optional: Crash if DB is critical
            } else {
                console.log('✅ Connected to database');
                connection.release();
            }
        });

    } catch (error) {
        console.error('❌ Could not initialize database pool:', error.message);
    }
}

// Mock Data
// Hash for '123456': $2b$10$Y4AiVP4H0ztcHPXRRdRXfu30zI67O4WAKB7wTSRwAMAt10yNjkrGO
const mockUsers = [
    {
        id: 1,
        user_type: 'ca',
        name: 'CA Admin',
        email: 'ca@example.com',
        mobile: '9999999999',
        password: '$2b$10$Y4AiVP4H0ztcHPXRRdRXfu30zI67O4WAKB7wTSRwAMAt10yNjkrGO',
        is_active: 1
    },
    {
        id: 2,
        user_type: 'client',
        name: 'John Doe',
        email: 'john@abc.com',
        mobile: '9876543210',
        password: '$2b$10$Y4AiVP4H0ztcHPXRRdRXfu30zI67O4WAKB7wTSRwAMAt10yNjkrGO',
        is_active: 1
    }
];

// Mock wrapper
const pool = {
    query: (sql, params, callback) => {
        if (!isMock && db) {
            return db.query(sql, params, callback);
        }

        if (!isMock && !db) {
            if (callback) callback(new Error('Database not connected'), null);
            return;
        }

        // MOCK LOGIC (Only runs if MOCK_DB=true)
        console.log('⚠️ Mock DB Query:', sql.substring(0, 100));

        let results = [];
        let error = null;

        // Mocking for Auth
        if (sql.includes('SELECT * FROM users')) {
             if (sql.includes("user_type = 'ca'")) {
                 results = [mockUsers[0]];
             } else {
                 results = [mockUsers[1]];
             }
        } else if (sql.includes('SELECT id, user_type')) {
            // Check params for ID
            const userId = params && params.length > 0 ? params[0] : 1;
            const user = mockUsers.find(u => u.id === userId) || mockUsers[0];
            results = [user];
        } else if (sql.includes('UPDATE users SET last_login')) {
            // No-op for update
            results = { affectedRows: 1 };
        }

        if (callback) {
            setTimeout(() => callback(error, results), 50);
        }
    },
    execute: (sql, params, callback) => {
         if (!isMock && db) {
            return db.execute(sql, params, callback);
        }
        if (callback) callback(null, []);
    },
    promise: () => {
        if (!isMock && db) {
             return db.promise();
        }
        // Mock promise interface
        return {
            query: async (sql, params) => {
                console.warn('⚠️ Mock DB query (promise):', sql.substring(0, 50));
                if (sql.includes('SELECT * FROM users')) return [[mockUsers[0]], []];
                if (sql.includes('INSERT INTO clients')) return [{ insertId: 3 }, []]; // Mock insert ID
                if (sql.includes('INSERT INTO users')) return [{ insertId: 3 }, []]; // Mock insert ID
                return [[], []];
            },
            execute: async () => {
                 return [[], []];
            },
            beginTransaction: async () => {},
            commit: async () => {},
            rollback: async () => {},
            release: () => {}
        }
    },
    getConnection: (cb) => {
        if (!isMock && db) return db.getConnection(cb);

        if (!isMock && !db) {
            cb(new Error('Database not connected'), null);
            return;
        }

        // Mock connection object
        const mockConn = {
            release: () => {},
            query: (s, p, c) => pool.query(s, p, c), // Use main pool query mock
            promise: () => pool.promise(),
            beginTransaction: async () => {},
            commit: async () => {},
            rollback: async () => {}
        };
        cb(null, mockConn);
    }
};

module.exports = pool;
