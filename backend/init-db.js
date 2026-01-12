const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Database connection
const connection = mysql.createConnection({
  host: '127.0.0.1',
  user: 'root',
  password: '',
  database: 'ca_firm_db'
});

const initializeDatabase = async () => {
  try {
    console.log('🚀 Starting database initialization...');

    // Create database if not exists
    const createDbConnection = mysql.createConnection({
      host: '127.0.0.1',
      user: 'root',
      password: ''
    });

    await createDbConnection.promise().query('CREATE DATABASE IF NOT EXISTS ca_firm_db');
    console.log('✅ Database created/verified');
    createDbConnection.end();

    // Create tables (Drop existing for clean re-initialization)
    await connection.promise().query('SET FOREIGN_KEY_CHECKS = 0');
    await connection.promise().query('DROP TABLE IF EXISTS payments');
    await connection.promise().query('DROP TABLE IF EXISTS invoice_items');
    await connection.promise().query('DROP TABLE IF EXISTS invoices');
    await connection.promise().query('DROP TABLE IF EXISTS services');
    await connection.promise().query('DROP TABLE IF EXISTS contacts');
    await connection.promise().query('DROP TABLE IF EXISTS documents');
    await connection.promise().query('DROP TABLE IF EXISTS returns');
    await connection.promise().query('DROP TABLE IF EXISTS return_types');
    await connection.promise().query('DROP TABLE IF EXISTS document_categories');
    await connection.promise().query('DROP TABLE IF EXISTS requests');
    await connection.promise().query('DROP TABLE IF EXISTS clients');
    await connection.promise().query('DROP TABLE IF EXISTS notifications');
    await connection.promise().query('DROP TABLE IF EXISTS users');
    await connection.promise().query('SET FOREIGN_KEY_CHECKS = 1');

    // Create users table
    const usersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_type ENUM('ca', 'client') NOT NULL DEFAULT 'client',
        name VARCHAR(255),
        email VARCHAR(255) UNIQUE,
        mobile VARCHAR(20),
        password VARCHAR(255),
        profile_image VARCHAR(500),
        otp VARCHAR(10),
        otp_expiry TIMESTAMP NULL,
        is_active BOOLEAN DEFAULT TRUE,
        fcm_token VARCHAR(500),
        last_login TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `;
    await connection.promise().query(usersTable);
    console.log('✅ Users table created');

    // Insert sample users with hashed passwords
    const hashedPassword = await bcrypt.hash('123456', 10);
    const insertUsers = `
      INSERT IGNORE INTO users (id, user_type, name, email, mobile, password, is_active) VALUES
      (1, 'ca', 'CA Admin', 'ca@example.com', '9999999999', ?, 1),
      (2, 'client', 'John Doe', 'john@abc.com', '9876543210', ?, 1),
      (3, 'client', 'Jane Smith', 'jane@xyz.com', '9876543211', ?, 1),
      (4, 'client', 'Mike Johnson', 'mike@tech.com', '9876543212', ?, 1)
    `;
    await connection.promise().query(insertUsers, [hashedPassword, hashedPassword, hashedPassword, hashedPassword]);
    console.log('✅ Sample users inserted (password: 123456)');

    // Create clients table
    const clientsTable = `
      CREATE TABLE IF NOT EXISTS clients (
        id INT AUTO_INCREMENT PRIMARY KEY,
        business_name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(20),
        pan_number VARCHAR(20) UNIQUE,
        client_category ENUM('individual', 'business', 'partnership', 'company') DEFAULT 'individual',
        aadhar_number VARCHAR(20),
        gstin VARCHAR(50),
        address TEXT,
        city VARCHAR(100),
        state VARCHAR(100),
        pincode VARCHAR(10),
        status ENUM('active', 'inactive') DEFAULT 'active',
        client_code VARCHAR(20) UNIQUE,
        user_id INT DEFAULT 1,
        date_of_birth DATE,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL
      )
    `;
    await connection.promise().query(clientsTable);
    console.log('✅ Clients table created');

    // Create contacts table
    const contactsTable = `
      CREATE TABLE IF NOT EXISTS contacts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        client_id INT NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(20),
        is_primary BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
      )
    `;
    await connection.promise().query(contactsTable);
    console.log('✅ Contacts table created');

    // Create document categories table
    const categoriesTable = `
      CREATE TABLE IF NOT EXISTS document_categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        category_name VARCHAR(255) NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await connection.promise().query(categoriesTable);
    console.log('✅ Document categories table created');

    // Create documents table
    const documentsTable = `
      CREATE TABLE IF NOT EXISTS documents (
        id INT AUTO_INCREMENT PRIMARY KEY,
        client_id INT NOT NULL,
        category_id INT NOT NULL,
        document_name VARCHAR(255) NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        file_type VARCHAR(100),
        file_size BIGINT,
        financial_year VARCHAR(20),
        month VARCHAR(50),
        description TEXT,
        notes TEXT,
        tags TEXT,
        is_acknowledgement BOOLEAN DEFAULT FALSE,
        is_visible_to_client BOOLEAN DEFAULT TRUE,
        uploaded_by INT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL,
        FOREIGN KEY (client_id) REFERENCES clients(id),
        FOREIGN KEY (category_id) REFERENCES document_categories(id)
      )
    `;
    await connection.promise().query(documentsTable);
    console.log('✅ Documents table created');

    // Create return_types table
    const returnTypesTable = `
      CREATE TABLE IF NOT EXISTS return_types (
        id INT AUTO_INCREMENT PRIMARY KEY,
        return_name VARCHAR(255) NOT NULL,
        return_code VARCHAR(50),
        frequency VARCHAR(50),
        description TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `;
    await connection.promise().query(returnTypesTable);
    console.log('✅ Return Types table created');

    // Create returns table
    const returnsTable = `
      CREATE TABLE IF NOT EXISTS returns (
        id INT AUTO_INCREMENT PRIMARY KEY,
        client_id INT NOT NULL,
        return_type_id INT NOT NULL,
        financial_year VARCHAR(20),
        assessment_year VARCHAR(20),
        period VARCHAR(100),
        due_date DATE,
        status ENUM('pending', 'in_progress', 'filled', 'completed') DEFAULT 'pending',
        notes TEXT,
        created_by INT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL,
        FOREIGN KEY (client_id) REFERENCES clients(id),
        FOREIGN KEY (return_type_id) REFERENCES return_types(id)
      )
    `;
    await connection.promise().query(returnsTable);
    console.log('✅ Returns table created');

    // Create services table
    const servicesTable = `
      CREATE TABLE IF NOT EXISTS services (
        id INT AUTO_INCREMENT PRIMARY KEY,
        service_name VARCHAR(255) NOT NULL,
        service_code VARCHAR(50),
        hsn_sac_code VARCHAR(20),
        description TEXT,
        default_rate DECIMAL(15, 2),
        gst_rate DECIMAL(5, 2) DEFAULT 18.00,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `;
    await connection.promise().query(servicesTable);
    console.log('✅ Services table created');

    // Create invoices table
    const invoicesTable = `
      CREATE TABLE IF NOT EXISTS invoices (
        id INT AUTO_INCREMENT PRIMARY KEY,
        client_id INT NOT NULL,
        invoice_number VARCHAR(50) UNIQUE NOT NULL,
        invoice_date DATE NOT NULL,
        due_date DATE NOT NULL,
        subtotal DECIMAL(15, 2) NOT NULL,
        total_tax DECIMAL(15, 2) NOT NULL,
        total_amount DECIMAL(15, 2) NOT NULL,
        paid_amount DECIMAL(15, 2) DEFAULT 0.00,
        balance_amount DECIMAL(15, 2),
        payment_status ENUM('Draft', 'Sent', 'Pending', 'Partial', 'Paid', 'Overdue') DEFAULT 'Pending',
        notes TEXT,
        created_by INT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL,
        FOREIGN KEY (client_id) REFERENCES clients(id)
      )
    `;
    await connection.promise().query(invoicesTable);
    console.log('✅ Invoices table created');

    // Create invoice items table
    const invoiceItemsTable = `
      CREATE TABLE IF NOT EXISTS invoice_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        invoice_id INT NOT NULL,
        service_id INT,
        description TEXT,
        hsn_sac_code VARCHAR(20),
        quantity DECIMAL(10, 2) NOT NULL DEFAULT 1,
        rate DECIMAL(15, 2) NOT NULL,
        gst_rate DECIMAL(5, 2) DEFAULT 0,
        gst_amount DECIMAL(15, 2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
        FOREIGN KEY (service_id) REFERENCES services(id)
      )
    `;
    await connection.promise().query(invoiceItemsTable);
    console.log('✅ Invoice items table created');

    // Create payments table
    const paymentsTable = `
      CREATE TABLE IF NOT EXISTS payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        invoice_id INT NOT NULL,
        client_id INT NOT NULL,
        payment_date DATE NOT NULL,
        amount DECIMAL(15, 2) NOT NULL,
        payment_mode VARCHAR(50),
        transaction_id VARCHAR(100),
        notes TEXT,
        received_by INT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
        FOREIGN KEY (client_id) REFERENCES clients(id)
      )
    `;
    await connection.promise().query(paymentsTable);
    console.log('✅ Payments table created');

    // Create document_requests table
    const requestsTable = `
      CREATE TABLE IF NOT EXISTS document_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        client_id INT NOT NULL,
        request_type ENUM('Document Request', 'Query', 'Appointment', 'Consultation', 'Other') NOT NULL,
        description TEXT NOT NULL,
        financial_year VARCHAR(20),
        admin_notes TEXT,
        document VARCHAR(500),
        priority ENUM('Low', 'Normal', 'Urgent') DEFAULT 'Normal',
        status ENUM('Pending', 'In Progress', 'Resolved', 'Rejected') DEFAULT 'Pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL,
        handled_by INT DEFAULT NULL,
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
      )
    `;
    await connection.promise().query(requestsTable);
    console.log('✅ Document Requests table created');

    // Create notifications table
    const notificationsTable = `
      CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT,
        type VARCHAR(50),
        reference_type VARCHAR(50),
        reference_id INT,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `;
    await connection.promise().query(notificationsTable);
    console.log('✅ Notifications table created');

    // Insert sample clients
    const insertClients = `
      INSERT IGNORE INTO clients (id, business_name, email, phone, pan_number, client_category, gstin, address, city, state, status, client_code, user_id) VALUES
      (1, 'ABC Enterprises', 'john@abc.com', '9876543210', 'ABCDE1234F', 'business', '27ABCDE1234F1Z5', '123 Business St', 'Mumbai', 'Maharashtra', 'active', 'CLT20240001', 2),
      (2, 'XYZ Trading', 'jane@xyz.com', '9876543211', 'XYZAB5678G', 'business', '27XYZAB5678G2H6', '456 Trade Ave', 'Delhi', 'Delhi', 'active', 'CLT20240002', 3),
      (3, 'Tech Solutions', 'mike@tech.com', '9876543212', 'TECHC9012I', 'business', '27TECHC9012I3J7', '789 Tech Park', 'Bangalore', 'Karnataka', 'active', 'CLT20240003', 4)
    `;
    await connection.promise().query(insertClients);
    console.log('✅ Sample clients inserted');

    // Insert sample contacts
    const insertContacts = `
      INSERT IGNORE INTO contacts (id, client_id, email, phone, is_primary) VALUES
      (1, 1, 'john@abc.com', '9876543210', 1),
      (2, 2, 'jane@xyz.com', '9876543211', 1),
      (3, 3, 'mike@tech.com', '9876543212', 1)
    `;
    await connection.promise().query(insertContacts);
    console.log('✅ Sample contacts inserted');

    // Insert document categories
    const insertCategories = `
      INSERT IGNORE INTO document_categories (id, category_name, description) VALUES
      (1, 'GST Returns', 'GST return documents and related files'),
      (2, 'Income Tax Returns', 'ITR and income tax related documents'),
      (3, 'Financial Statements', 'Balance sheets, P&L statements, etc.'),
      (4, 'Audit Reports', 'Audit reports and related documents'),
      (5, 'Compliance Documents', 'Various compliance related documents'),
      (6, 'Bank Statements', 'Bank statements and financial records'),
      (7, 'Invoices', 'Sales and purchase invoices'),
      (8, 'Receipts', 'Payment receipts and vouchers'),
      (9, 'Contracts', 'Legal contracts and agreements'),
      (10, 'Other', 'Miscellaneous documents')
    `;
    await connection.promise().query(insertCategories);
    console.log('✅ Document categories inserted');

    // Insert return types
    const insertReturnTypes = `
      INSERT IGNORE INTO return_types (id, return_name, return_code, frequency, description) VALUES
      (1, 'GSTR-1', 'GSTR1', 'Monthly', 'Details of outward supplies of goods and/or services'),
      (2, 'GSTR-3B', 'GSTR3B', 'Monthly', 'Summary return with payment of tax'),
      (3, 'GSTR-4', 'GSTR4', 'Quarterly', 'Return for composition dealers'),
      (4, 'GSTR-5', 'GSTR5', 'Monthly', 'Return for Non-Resident taxable person'),
      (5, 'GSTR-6', 'GSTR6', 'Monthly', 'Return for Input Service Distributor'),
      (6, 'GSTR-7', 'GSTR7', 'Monthly', 'Return for authorities deducting TDS'),
      (7, 'GSTR-8', 'GSTR8', 'Monthly', 'Return for e-commerce operators'),
      (8, 'GSTR-9', 'GSTR9', 'Annual', 'Annual return'),
      (9, 'GSTR-9C', 'GSTR9C', 'Annual', 'Reconciliation statement and certification'),
      (10, 'GSTR-10', 'GSTR10', 'One-time', 'Final return'),
      (11, 'GSTR-11', 'GSTR11', 'Monthly', 'Details of inward supplies'),
      (12, 'CMP-08', 'CMP08', 'Quarterly', 'Statement cum challan for composition dealers'),
      (13, 'ITR-1', 'ITR1', 'Annual', 'For individuals having income from salaries, one house property, other sources'),
      (14, 'ITR-2', 'ITR2', 'Annual', 'For individuals and HUFs not having income from business or profession'),
      (15, 'ITR-3', 'ITR3', 'Annual', 'For individuals and HUFs having income from business or profession'),
      (16, 'ITR-4', 'ITR4', 'Annual', 'For presumptive income from business and profession'),
      (17, 'ITR-5', 'ITR5', 'Annual', 'For firms, LLPs, AOPs, BOIs'),
      (18, 'ITR-6', 'ITR6', 'Annual', 'For companies other than companies claiming exemption'),
      (19, 'ITR-7', 'ITR7', 'Annual', 'For persons including companies required to furnish return'),
      (20, 'TDS Return - 24Q', '24Q', 'Quarterly', 'TDS on salary'),
      (21, 'TDS Return - 26Q', '26Q', 'Quarterly', 'TDS on payments other than salary'),
      (22, 'TDS Return - 27Q', '27Q', 'Quarterly', 'TDS on payment of income from property'),
      (23, 'TDS Return - 27EQ', '27EQ', 'Quarterly', 'TCS return'),
      (24, 'Form 15CA/15CB', '15CA', 'As required', 'Information for payments to non-residents'),
      (25, 'ESI Return', 'ESI', 'Monthly', 'Employee State Insurance return'),
      (26, 'PF Return', 'PF', 'Monthly', 'Provident Fund return'),
      (27, 'PT Return', 'PT', 'Monthly/Annual', 'Professional Tax return'),
      (28, 'MCA Annual Filing', 'AOC4', 'Annual', 'Annual filing with Ministry of Corporate Affairs'),
      (29, 'DIR-3 KYC', 'DIR3KYC', 'Annual', 'KYC for directors'),
      (30, 'Other', 'OTHER', 'Varies', 'Other compliance returns')
    `;
    await connection.promise().query(insertReturnTypes);
    console.log('✅ Return types inserted');

    // Insert services
    const insertServices = `
      INSERT IGNORE INTO services (id, service_name, service_code, hsn_sac_code, description, default_rate, gst_rate) VALUES
      (1, 'GST Return Filing', 'GST001', '998313', 'Monthly/Quarterly GST return filing service', 2000.00, 18.00),
      (2, 'Income Tax Return Filing - Individual', 'ITR001', '998312', 'ITR filing for individuals', 3000.00, 18.00),
      (3, 'Income Tax Return Filing - Business', 'ITR002', '998312', 'ITR filing for businesses', 5000.00, 18.00),
      (4, 'TDS Return Filing', 'TDS001', '998313', 'Quarterly TDS return filing', 1500.00, 18.00),
      (5, 'Accounting Services', 'ACC001', '998311', 'Monthly accounting and bookkeeping', 10000.00, 18.00),
      (6, 'Audit Services', 'AUD001', '998312', 'Statutory audit services', 25000.00, 18.00),
      (7, 'Tax Planning & Consultation', 'TAX001', '998312', 'Tax planning and advisory services', 5000.00, 18.00),
      (8, 'Company Registration', 'REG001', '998313', 'New company registration services', 15000.00, 18.00),
      (9, 'GST Registration', 'GST002', '998313', 'GST registration service', 3000.00, 18.00),
      (10, 'PF/ESI Registration', 'PF001', '998313', 'PF and ESI registration', 2000.00, 18.00),
      (11, 'Annual Compliance', 'COM001', '998313', 'Annual compliance services', 20000.00, 18.00),
      (12, 'Payroll Processing', 'PAY001', '998311', 'Monthly payroll processing', 5000.00, 18.00),
      (13, 'Financial Statement Preparation', 'FIN001', '998311', 'Preparation of financial statements', 8000.00, 18.00),
      (14, 'MCA Filing', 'MCA001', '998313', 'MCA annual filing services', 5000.00, 18.00),
      (15, 'Consultation', 'CON001', '998312', 'General consultation services', 2000.00, 18.00)
    `;
    await connection.promise().query(insertServices);
    console.log('✅ Services inserted');

    // Insert sample returns
    const insertReturns = `
      INSERT IGNORE INTO returns (id, client_id, return_type_id, period, due_date, status, notes) VALUES
      (1, 1, 2, 'Aug 2024', '2024-09-20', 'pending', 'Monthly GST return filing'),
      (2, 2, 13, 'FY 2023-24', '2024-07-31', 'filled', 'Annual income tax return'),
      (3, 3, 2, 'Jul 2024', '2024-08-20', 'pending', 'Overdue GST return'),
      (4, 1, 20, 'Q1 2024', '2024-07-31', 'filled', 'Quarterly TDS return'),
      (5, 2, 25, 'Aug 2024', '2024-09-21', 'pending', 'Monthly ESI return')
    `;
    await connection.promise().query(insertReturns);
    console.log('✅ Sample returns inserted');

    // Insert sample requests
    const insertRequests = `
      INSERT IGNORE INTO document_requests (id, client_id, request_type, description, financial_year, priority, status) VALUES
      (1, 1, 'Document Request', 'Need GST return copy for March 2024', '2023-2024', 'Normal', 'Resolved'),
      (2, 2, 'Query', 'Question about TDS deduction rates', '2023-2024', 'Urgent', 'In Progress'),
      (3, 3, 'Appointment', 'Schedule meeting for tax planning', '2024-2025', 'Normal', 'Pending'),
      (4, 1, 'Consultation', 'Need advice on new business structure', '2024-2025', 'Normal', 'In Progress')
    `;
    await connection.promise().query(insertRequests);
    console.log('✅ Sample requests inserted');

    console.log('🎉 Database initialization completed successfully!');
    console.log('📋 Summary:');
    console.log('   - Database: ca_firm_db');
    console.log('   - Tables: clients, contacts, document_categories, documents, returns, invoices, invoice_items, payments, requests');
    console.log('   - Sample data: 3 clients, 10 document categories, 5 returns, 4 requests');

  } catch (error) {
    console.error('❌ Error initializing database:', error);
  } finally {
    connection.end();
  }
};

// Run initialization
initializeDatabase();