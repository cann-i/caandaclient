const express = require('express');
const router = express.Router();
const db = require('../config/db');
const bcrypt = require('bcryptjs');

// Helper to use db.promise() which is cleaner for transactions
const promiseDb = db.promise();

// GET all clients with primary contact (excluding soft deleted)
router.get('/', (req, res) => {
    const query = `
        SELECT 
            c.id, 
            c.business_name,
            u.name as client_name,
            c.client_category as client_type,
            c.pan_number as pan,
            c.aadhar_number as aadhar,
            c.gstin,
            c.address,
            c.city,
            c.state,
            c.status,
            c.client_code,
            c.date_of_birth as dob,
            c.pincode,
            c.notes,
            c.created_at,
            c.email,
            c.phone,
            c.user_id
        FROM clients c
        LEFT JOIN users u ON c.user_id = u.id
        WHERE c.deleted_at IS NULL
        ORDER BY c.created_at DESC
    `;
    db.query(query, (err, result) => {
        if (err) {
            console.error('Error fetching clients:', err);
            return res.status(500).json(err);
        }
        res.json(result);
    });
});

// ADD new client with contact (TRANSACTIONAL)
router.post('/', async (req, res) => {
    const { business_name, client_name, email, phone, pan, client_type, aadhar, gstin, address, city, state, status, dob, pincode, notes } = req.body;

    const connection = await promiseDb.getConnection();

    try {
        await connection.beginTransaction();

        // 1. Generate CLT code
        const year = new Date().getFullYear();
        // Use FOR UPDATE to lock rows and prevent race condition on client_code generation
        // However, locking by 'client_code LIKE' might not lock the gap properly in all isolation levels.
        // A safer way for high concurrency is a dedicated sequence table, but for this scale, this is better than before.
        const [codeResults] = await connection.query('SELECT client_code FROM clients WHERE client_code LIKE ? ORDER BY id DESC LIMIT 1 FOR UPDATE', [`CLT${year}%`]);

        let newCode = `CLT${year}0001`;
        if (codeResults.length > 0 && codeResults[0].client_code) {
            const lastCode = codeResults[0].client_code;
            const lastNum = parseInt(lastCode.substring(7));
            newCode = `CLT${year}${String(lastNum + 1).padStart(4, '0')}`;
        }

        // 2. Insert Client (without user_id initially or with a placeholder)
        // We set user_id to 1 (Admin) initially or NULL if allowed, then update it.
        const insertClientQuery = `
            INSERT INTO clients 
            (business_name, email, phone, pan_number, client_category, aadhar_number, gstin, address, city, state, status, client_code, user_id, date_of_birth, pincode, notes) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const clientValues = [
            business_name,
            email,
            phone,
            pan,
            (client_type || 'individual').toLowerCase(),
            aadhar,
            gstin,
            address,
            city,
            state,
            (status || 'active').toLowerCase(),
            newCode,
            1, // Placeholder
            dob,
            pincode,
            notes
        ];

        const [clientResult] = await connection.query(insertClientQuery, clientValues);
        const newClientId = clientResult.insertId;

        // 3. Create User Account
        const defaultPassword = '123456';
        const hashedPassword = await bcrypt.hash(defaultPassword, 10);

        const insertUserQuery = `
            INSERT INTO users (user_type, name, email, mobile, password, is_active)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        const userValues = ['client', client_name, email, phone, hashedPassword, 1];

        const [userResult] = await connection.query(insertUserQuery, userValues);
        const newUserId = userResult.insertId;

        // 4. Link User to Client
        await connection.query('UPDATE clients SET user_id = ? WHERE id = ?', [newUserId, newClientId]);

        await connection.commit();

        console.log(`Created Client ${newClientId} and User ${newUserId} with Code ${newCode}`);
        res.json({ message: 'Client and User account added successfully', client_code: newCode });

    } catch (err) {
        await connection.rollback();
        console.error('Transaction Error in Client Creation:', err);

        if (err.code === 'ER_DUP_ENTRY') {
            if (err.message.includes('pan_number')) {
                return res.status(400).json({ message: `Client with PAN ${pan} already exists.` });
            }
            if (err.message.includes('email')) {
                return res.status(400).json({ message: `User with email ${email} already exists.` });
            }
        }
        res.status(500).json({ message: 'Error creating client', error: err.message });
    } finally {
        connection.release();
    }
});

// UPDATE client
router.put('/:id', (req, res) => {
    const { id } = req.params;
    const { business_name, client_name, email, phone, pan, client_type, aadhar, gstin, address, city, state, status, dob, pincode, notes } = req.body;

    const query = `
        UPDATE clients 
        SET business_name=?, email=?, phone=?, pan_number=?, client_category=?, aadhar_number=?, gstin=?, address=?, city=?, state=?, status=?, date_of_birth=?, pincode=?, notes=? 
        WHERE id=?
    `;
    const values = [
        business_name,
        email,
        phone,
        pan,
        (client_type || 'individual').toLowerCase(),
        aadhar,
        gstin,
        address,
        city,
        state,
        (status || 'active').toLowerCase(),
        dob,
        pincode,
        notes,
        id
    ];

    db.query(query, values, (err) => {
        if (err) {
            console.error('Error updating client:', err);
            return res.status(500).json(err);
        }

        // Also update the user name
        const userQuery = `
            UPDATE users u 
            INNER JOIN clients c ON u.id = c.user_id 
            SET u.name = ? 
            WHERE c.id = ?
        `;

        db.query(userQuery, [client_name, id], (userErr) => {
            if (userErr) {
                console.error('Error updating linked user name:', userErr);
                // Don't fail the request, just log it
            }
            res.json({ message: 'Client updated successfully' });
        });
    });
});

// DELETE client (Soft Delete)
router.delete('/:id', (req, res) => {
    const { id } = req.params;

    db.query('UPDATE clients SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL', [id], (err, result) => {
        if (err) {
            console.error('Error deleting client:', err);
            return res.status(500).json(err);
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Client not found or already deleted' });
        }
        res.json({ message: 'Client deleted successfully' });
    });
});

// RESTORE client (Undo soft delete)
router.patch('/:id/restore', (req, res) => {
    const { id } = req.params;

    db.query('UPDATE clients SET deleted_at = NULL WHERE id = ? AND deleted_at IS NOT NULL', [id], (err, result) => {
        if (err) {
            console.error('Error restoring client:', err);
            return res.status(500).json(err);
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Client not found or not deleted' });
        }
        res.json({ message: 'Client restored successfully' });
    });
});

// GET all contacts for a specific client
router.get('/:id/contacts', (req, res) => {
    const { id } = req.params;
    db.query('SELECT * FROM contacts WHERE client_id = ?', [id], (err, result) => {
        if (err) {
            console.error('Error fetching contacts:', err);
            return res.status(500).json(err);
        }
        res.json(result);
    });
});

// ADD new contact for a client
router.post('/:id/contacts', (req, res) => {
    const { id } = req.params;
    const { email, phone, is_primary } = req.body;

    db.query('INSERT INTO contacts (client_id, email, phone, is_primary) VALUES (?, ?, ?, ?)',
        [id, email, phone, is_primary || false], (err, result) => {
            if (err) {
                console.error('Error adding contact:', err);
                return res.status(500).json(err);
            }
            res.json({ message: 'Contact added successfully' });
        });
});

// UPDATE contact
router.put('/:clientId/contacts/:contactId', (req, res) => {
    const { contactId } = req.params;
    const { email, phone, is_primary } = req.body;

    db.query('UPDATE contacts SET email=?, phone=?, is_primary=? WHERE id=?',
        [email, phone, is_primary, contactId], (err) => {
            if (err) {
                console.error('Error updating contact:', err);
                return res.status(500).json(err);
            }
            res.json({ message: 'Contact updated successfully' });
        });
});

// DELETE contact
router.delete('/:clientId/contacts/:contactId', (req, res) => {
    const { contactId } = req.params;

    db.query('DELETE FROM contacts WHERE id=?', [contactId], (err, result) => {
        if (err) {
            console.error('Error deleting contact:', err);
            return res.status(500).json(err);
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Contact not found' });
        }
        res.json({ message: 'Contact deleted successfully' });
    });
});

// GET client by user_id
router.get('/by-user/:userId', (req, res) => {
    const { userId } = req.params;

    const query = `
        SELECT 
            c.id,
            c.business_name,
            c.email,
            c.phone,
            c.pan_number,
            c.client_category,
            c.aadhar_number,
            c.gstin,
            c.address,
            c.city,
            c.state,
            c.pincode,
            c.status,
            c.client_code,
            c.date_of_birth,
            c.notes,
            c.created_at
        FROM clients c
        WHERE c.user_id = ? AND c.deleted_at IS NULL
    `;

    db.query(query, [userId], (err, results) => {
        if (err) {
            console.error('Error fetching client by user_id:', err);
            return res.status(500).json({ message: 'Server error' });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: 'Client record not found' });
        }

        res.json(results[0]);
    });
});

// UPDATE client profile by user_id
router.put('/profile/:userId', (req, res) => {
    const { userId } = req.params;
    const {
        business_name,
        aadhar_number,
        gstin,
        address,
        city,
        state,
        pincode,
        date_of_birth,
        client_category,
        notes
    } = req.body;

    // First, get the client_id from user_id
    db.query('SELECT id FROM clients WHERE user_id = ? AND deleted_at IS NULL', [userId], (err, results) => {
        if (err) {
            console.error('Error fetching client:', err);
            return res.status(500).json({ message: 'Server error' });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: 'Client record not found' });
        }

        const clientId = results[0].id;

        // Update client data
        const query = `
            UPDATE clients 
            SET 
                business_name = ?,
                aadhar_number = ?,
                gstin = ?,
                address = ?,
                city = ?,
                state = ?,
                pincode = ?,
                date_of_birth = ?,
                client_category = ?,
                notes = ?
            WHERE id = ?
        `;

        const values = [
            business_name,
            aadhar_number,
            gstin,
            address,
            city,
            state,
            pincode,
            date_of_birth,
            client_category,
            notes,
            clientId
        ];

        db.query(query, values, (updateErr) => {
            if (updateErr) {
                console.error('Error updating client profile:', updateErr);
                return res.status(500).json({ message: 'Server error' });
            }

            res.json({ message: 'Client profile updated successfully' });
        });
    });
});

// ⛔ THIS LINE IS MANDATORY
module.exports = router;
