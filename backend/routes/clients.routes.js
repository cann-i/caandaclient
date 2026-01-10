const express = require('express');
const router = express.Router();
const db = require('../config/db');
const bcrypt = require('bcryptjs');

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

// ADD new client with contact
router.post('/', (req, res) => {
    const { business_name, client_name, email, phone, pan, client_type, aadhar, gstin, address, city, state, status, dob, pincode, notes } = req.body;

    // Generate CLT code
    const year = new Date().getFullYear();
    db.query('SELECT client_code FROM clients WHERE client_code LIKE ? ORDER BY id DESC LIMIT 1', [`CLT${year}%`], (err, results) => {
        if (err) {
            console.error('Error fetching last client code:', err);
            return res.status(500).json(err);
        }

        let newCode = `CLT${year}0001`;
        if (results && results.length > 0 && results[0].client_code) {
            const lastCode = results[0].client_code;
            // Format: CLT20250014 (3 chars + 4 year + 4 seq)
            const lastNum = parseInt(lastCode.substring(7));
            newCode = `CLT${year}${String(lastNum + 1).padStart(4, '0')}`;
        }

        const query = `
            INSERT INTO clients 
            (business_name, email, phone, pan_number, client_category, aadhar_number, gstin, address, city, state, status, client_code, user_id, date_of_birth, pincode, notes) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            newCode,
            1, // Default to Admin user_id
            dob,
            pincode,
            notes
        ];

        db.query(query, values, (err, result) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ message: `Client with PAN ${pan} already exists.` });
                }
                console.error('Error adding client:', err);
                return res.status(500).json(err);
            }

            // Create User Account for the Client
            const defaultPassword = '123456';
            bcrypt.hash(defaultPassword, 10, (hashErr, hashedPassword) => {
                if (hashErr) {
                    console.error('Error hashing password:', hashErr);
                    // We still return success for client creation, but log the error. 
                    return res.json({ message: 'Client added successfully, but user account creation failed', client_code: newCode });
                }

                const userQuery = `
                    INSERT INTO users (user_type, name, email, mobile, password, is_active)
                    VALUES (?, ?, ?, ?, ?, ?)
                `;
                const userValues = ['client', client_name, email, phone, hashedPassword, 1];

                db.query(userQuery, userValues, (userErr, userResult) => {
                    if (userErr) {
                        console.error('Error creating user account:', JSON.stringify(userErr));
                        // Return error so frontend knows
                        return res.status(500).json({ message: 'Client created but User account creation failed: ' + userErr.message });
                    }

                    // CRITICAL FIX: Update the client record with the new user_id
                    const newUserId = userResult.insertId;
                    // We need to know the client ID. The 'result' variable from line 84 contains the client insert result.
                    const newClientId = result.insertId;

                    db.query('UPDATE clients SET user_id = ? WHERE id = ?', [newUserId, newClientId], (updateErr) => {
                        if (updateErr) {
                            console.error('Error linking user to client:', updateErr);
                            // Return success but warning (or could rely on repair script later)
                        }
                        console.log(`Linked Client ${newClientId} to User ${newUserId}`);
                        res.json({ message: 'Client and User account added successfully', client_code: newCode });
                    });
                });
            });
        });
    });
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
