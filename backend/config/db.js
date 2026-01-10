const mysql = require('mysql2');

const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'ca_firm_db'
});

// IMPORTANT: This allows us to use async/await in routes
module.exports = db;