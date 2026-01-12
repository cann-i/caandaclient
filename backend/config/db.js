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
const mockUsers = [
    {
        id: 1,
        user_type: 'ca',
        name: 'CA Admin',
        email: 'ca@example.com',
        mobile: '9999999999',
        password: '$2b$10$Y4AiVP4H0ztcHPXRRdRXfu30zI67O4WAKB7wTSRwAMAt10yNjkrGO', // Hash for '123456'
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

const mockClients = [
    {
        id: 1,
        business_name: 'ABC Enterprises',
        client_name: 'John Doe',
        email: 'john@abc.com',
        phone: '9876543210',
        pan: 'ABCDE1234F',
        aadhar: '123456789012',
        gstin: '27ABCDE1234F1Z5',
        address: '123 Business St',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        status: 'active',
        client_code: 'CLT20240001',
        dob: '1990-01-01',
        notes: 'Premium Client',
        created_at: new Date().toISOString(),
        user_id: 2
    }
];

const mockDocuments = [
    {
        id: 1,
        client_id: 1,
        clientName: 'ABC Enterprises',
        document_name: 'GST Return Jul 2024',
        file_name: 'GST_Jul24.pdf',
        file_path: 'uploads/documents/sample.pdf',
        type: 'GST Returns',
        category_id: 1,
        financial_year: '2024-2025',
        file_size: 102400,
        is_visible_to_client: 1,
        created_at: new Date().toISOString()
    }
];

const mockReturns = [
    {
        id: 1,
        client_id: 1,
        client_name: 'ABC Enterprises',
        return_type: 'GSTR-3B',
        financial_year: '2024-2025',
        assessment_year: '2025-2026',
        status: 'pending',
        notes: 'Due next week',
        created_at: new Date().toISOString()
    }
];

const mockRequests = [
    {
        id: 1,
        client_id: 1,
        client_name: 'ABC Enterprises',
        request_type: 'Query',
        description: 'Question about TDS',
        priority: 'Normal',
        status: 'Pending',
        created_at: new Date().toISOString()
    }
];

const mockInvoices = [
    {
        id: 1,
        clientId: 1,
        client: 'ABC Enterprises',
        invoiceNumber: 'INV-001',
        date: new Date().toISOString(),
        dueDate: new Date().toISOString(),
        totalAmount: 5000,
        paidAmount: 0,
        balanceAmount: 5000,
        status: 'Sent',
        items: []
    }
];

const mockNotifications = [];

// Mock wrapper
const pool = {
    query: (sql, params, callback) => {
        if (!isMock && db) {
            return db.query(sql, params, callback);
        }

        // Handle optional params (sql, callback)
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }

        if (!isMock && !db) {
            if (callback) callback(new Error('Database not connected'), null);
            return;
        }

        // MOCK LOGIC (Only runs if MOCK_DB=true)
        console.log('⚠️ Mock DB Query:', sql.substring(0, 100).replace(/\n/g, ' '));

        let results = [];
        let error = null;

        // Simple routing based on SQL keywords
        if (sql.includes('SELECT * FROM users') || sql.includes('SELECT id, user_type')) {
             if (sql.includes("user_type = 'ca'")) {
                 results = [mockUsers[0]];
             } else if (sql.includes("user_type = 'client'")) {
                 results = [mockUsers[1]];
             } else if (sql.includes('WHERE id = ?')) {
                 const id = params[0];
                 results = mockUsers.filter(u => u.id === id);
             } else {
                 results = mockUsers; // Fallback
             }
        }
        else if (sql.includes('FROM clients') || sql.includes('INTO clients')) {
            if (sql.includes('SELECT')) {
                results = mockClients;
            } else {
                results = { insertId: 2, affectedRows: 1 };
            }
        }
        else if (sql.includes('FROM documents') || sql.includes('INTO documents')) {
             if (sql.includes('SELECT')) {
                results = mockDocuments;
            } else {
                results = { insertId: 2, affectedRows: 1 };
            }
        }
        else if (sql.includes('FROM returns') || sql.includes('INTO returns')) {
             if (sql.includes('SELECT')) {
                results = mockReturns;
            } else {
                results = { insertId: 2, affectedRows: 1 };
            }
        }
        else if (sql.includes('FROM requests') || sql.includes('INTO requests') || sql.includes('FROM document_requests')) {
             if (sql.includes('SELECT')) {
                results = mockRequests;
            } else {
                results = { insertId: 2, affectedRows: 1 };
            }
        }
        else if (sql.includes('FROM invoices') || sql.includes('INTO invoices')) {
             if (sql.includes('SELECT')) {
                results = mockInvoices;
            } else {
                results = { insertId: 2, affectedRows: 1 };
            }
        }
        else if (sql.includes('FROM notifications')) {
            results = mockNotifications;
        }
        else if (sql.includes('UPDATE users SET last_login')) {
            results = { affectedRows: 1 };
        }
        else if (sql.includes('SELECT') && sql.includes('FROM services')) {
             results = [{id: 1, service_name: 'Consulting', default_rate: 1000, gst_rate: 18}];
        }
        else {
            // Default empty array for unknown SELECTs, or success for others
            if (sql.trim().toUpperCase().startsWith('SELECT')) {
                results = [];
            } else {
                results = { affectedRows: 1, insertId: 1 };
            }
        }

        if (callback) {
            setTimeout(() => callback(error, results), 10);
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
                console.warn('⚠️ Mock DB query (promise):', sql.substring(0, 50).replace(/\n/g, ' '));
                return new Promise((resolve, reject) => {
                    pool.query(sql, params, (err, res) => {
                        if (err) reject(err);
                        else resolve([res, []]);
                    });
                });
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
