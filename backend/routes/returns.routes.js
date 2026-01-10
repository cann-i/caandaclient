const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { notifyReturnCreated } = require('../utils/notificationHelper');

// GET return types
router.get('/types', (req, res) => {
    const query = 'SELECT * FROM return_types WHERE is_active = 1 ORDER BY return_name';
    db.query(query, (err, result) => {
        if (err) {
            console.error('Error fetching return types:', err);
            return res.status(500).json(err);
        }
        res.json(result);
    });
});

// GET single return type by ID
router.get('/type/:id', (req, res) => {
    const { id } = req.params;
    const query = 'SELECT * FROM return_types WHERE id = ? AND is_active = 1';
    db.query(query, [id], (err, result) => {
        if (err) {
            console.error('Error fetching return type:', err);
            return res.status(500).json(err);
        }
        if (result.length === 0) {
            return res.status(404).json({ message: 'Return type not found' });
        }
        res.json(result[0]);
    });
});

// GET all returns
router.get('/', (req, res) => {
    const { user_id } = req.query;

    let query = `
        SELECT 
            r.*,
            c.business_name as client_name,
            rt.return_name as return_type
        FROM returns r
        LEFT JOIN clients c ON r.client_id = c.id
        LEFT JOIN return_types rt ON r.return_type_id = rt.id
        WHERE r.deleted_at IS NULL AND c.deleted_at IS NULL
    `;

    const params = [];

    if (user_id) {
        query += ' AND c.user_id = ?';
        params.push(user_id);
    }

    query += ' ORDER BY r.created_at DESC';

    db.query(query, params, (err, result) => {
        if (err) {
            console.error('Error fetching returns:', err);
            return res.status(500).json(err);
        }
        res.json(result);
    });
});

// ADD new return
router.post('/', (req, res) => {
    const { client_id, return_type_id, financial_year, assessment_year, status, notes } = req.body;

    const query = `
        INSERT INTO returns 
        (client_id, return_type_id, financial_year, assessment_year, status, notes, created_by) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [client_id, return_type_id, financial_year, assessment_year, status || 'pending', notes, 1];

    db.query(query, values, async (err, result) => {
        if (err) {
            console.error('Error adding return:', err);
            return res.status(500).json(err);
        }

        // Create notification for client
        try {
            // Fetch client user_id and return type name
            const fetchQuery = `
                SELECT c.user_id, rt.return_name 
                FROM clients c
                LEFT JOIN return_types rt ON rt.id = ?
                WHERE c.id = ?
            `;
            db.query(fetchQuery, [return_type_id, client_id], async (fetchErr, fetchResult) => {
                if (!fetchErr && fetchResult.length > 0) {
                    const clientUserId = fetchResult[0].user_id;
                    const returnTypeName = fetchResult[0].return_name;
                    await notifyReturnCreated(clientUserId, returnTypeName, financial_year, result.insertId);
                }
            });
        } catch (notifErr) {
            console.error('Error creating notification:', notifErr);
            // Don't fail the request if notification fails
        }

        res.json({ message: 'Return added successfully', id: result.insertId });
    });
});

// UPDATE return
router.put('/:id', (req, res) => {
    const { id } = req.params;
    const { client_id, return_type_id, financial_year, assessment_year, status, notes } = req.body;

    const query = `
        UPDATE returns 
        SET client_id=?, return_type_id=?, financial_year=?, assessment_year=?, status=?, notes=?, updated_at=NOW()
        WHERE id=?
    `;
    const values = [client_id, return_type_id, financial_year, assessment_year, status, notes, id];

    db.query(query, values, (err, result) => {
        if (err) {
            console.error('Error updating return:', err);
            return res.status(500).json(err);
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Return not found' });
        }
        res.json({ message: 'Return updated successfully' });
    });
});

// DELETE return (Soft Delete)
router.delete('/:id', (req, res) => {
    const { id } = req.params;

    const query = 'UPDATE returns SET deleted_at = NOW() WHERE id = ?';

    db.query(query, [id], (err, result) => {
        if (err) {
            console.error('Error deleting return:', err);
            return res.status(500).json(err);
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Return not found' });
        }
        res.json({ message: 'Return deleted successfully' });
    });
});

module.exports = router;