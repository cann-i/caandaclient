const express = require('express');
const router = express.Router();
const db = require('../config/db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { notifyNewDocumentRequest, notifyRequestReplied } = require('../utils/notificationHelper');

// Configure Multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // req.body is populated because fields come before files in FormData (usually) or multer handles it if configured right
        const clientId = req.body.client_id || 'unknown';
        const dir = `uploads/documents_requests/${clientId}`;
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');

        const timestamp = `${year}${month}${day}${hours}${minutes}${seconds}`;
        const ext = path.extname(file.originalname);
        cb(null, `request_${timestamp}${ext}`);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// GET all requests
router.get('/', (req, res) => {
    const query = `
            SELECT 
                r.id, r.client_id, r.request_type, r.description, 
                r.financial_year, r.priority, r.status, 
                r.admin_notes as reply, 
                r.document,
                r.created_at, 
                r.completed_at, r.handled_by,
                c.business_name as client_name,
                c.user_id as client_user_id,
                c.email as client_email
            FROM document_requests r
            LEFT JOIN clients c ON r.client_id = c.id
            WHERE r.deleted_at IS NULL
            ORDER BY r.created_at DESC
        `;
    db.query(query, (err, result) => {
        if (err) {
            console.error('Error fetching requests:', err);
            return res.status(500).json(err);
        }
        res.json(result);
    });
});

// GET requests by user ID
router.get('/user/:userId', (req, res) => {
    const { userId } = req.params;
    const query = `
            SELECT 
                r.id, r.client_id, r.request_type, r.description, 
                r.financial_year, r.priority, r.status, 
                r.admin_notes as reply, 
                r.document,
                r.created_at, 
                r.completed_at, r.handled_by,
                c.business_name as client_name,
                c.user_id as client_user_id,
                c.email as client_email
            FROM document_requests r
            JOIN clients c ON r.client_id = c.id
            JOIN users u ON u.id = ?
            WHERE (c.user_id = u.id OR c.email = u.email) AND r.deleted_at IS NULL
            ORDER BY r.created_at DESC
        `;
    db.query(query, [userId], (err, result) => {
        if (err) {
            console.error('Error fetching user requests:', err);
            return res.status(500).json(err);
        }
        res.json(result);
    });
});

// ADD new request
router.post('/', (req, res) => {
    console.log('Received POST /api/requests body:', req.body);
    const { client_id: userIdOrClientId, request_type, description, priority, status, financial_year } = req.body;

    // First try to find if there is a client linked to this user_id
    // If not found, assume it might be a direct client_id or use as is (which might fail if no link)
    // Based on debug info, users table id=66 (Apson) matches clients table id=7 (Apson). But clients table user_id is 1.
    // We need to resolve the correct client_id for the documents table.
    // Strategy: Try to find a client with this user_id. If not, try to find a client with same email.

    // For this specific issue: Frontend sends user_id (66). We need to insert into document_requests which needs client_id (7).

    const findClientQuery = `SELECT id, business_name FROM clients WHERE user_id = ? OR email = (SELECT email FROM users WHERE id = ?) LIMIT 1`;

    db.query(findClientQuery, [userIdOrClientId, userIdOrClientId], (err, results) => {
        if (err) {
            console.error('Error finding client:', err);
            return res.status(500).json(err);
        }

        let finalClientId = userIdOrClientId;
        let clientName = 'Unknown Client';
        if (results.length > 0) {
            finalClientId = results[0].id;
            clientName = results[0].business_name;
            console.log(`Mapped user_id ${userIdOrClientId} to client_id ${finalClientId}`);
        } else {
            console.log(`No client found for user_id ${userIdOrClientId}, trying as direct client_id`);
        }

        const query = `
            INSERT INTO document_requests
            (client_id, request_type, description, financial_year, priority, status, admin_notes, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const values = [finalClientId, request_type, description, financial_year, priority || 'Normal', status || 'Pending', null, new Date()];

        db.query(query, values, async (err, result) => {
            if (err) {
                console.error('Error adding request:', err);
                return res.status(500).json(err);
            }

            // Create notification for CA - fetch CA user dynamically
            try {
                // Find CA user (user_type = 'ca')
                const caQuery = "SELECT id FROM users WHERE user_type = 'ca' LIMIT 1";
                db.query(caQuery, async (caErr, caResults) => {
                    if (!caErr && caResults.length > 0) {
                        const caUserId = caResults[0].id;
                        console.log(`Creating notification for CA user_id: ${caUserId}`);
                        await notifyNewDocumentRequest(caUserId, clientName, request_type, result.insertId);
                    } else {
                        console.error('No CA user found in database');
                    }
                });
            } catch (notifErr) {
                console.error('Error creating notification:', notifErr);
                // Don't fail the request if notification fails
            }

            res.json({ message: 'Request added successfully', id: result.insertId });
        });
    });
});

// UPDATE request (Reply & Status & File)
router.put('/:id', upload.single('file'), (req, res) => {
    const { id } = req.params;
    // When using multer, text fields are in req.body
    const { status, reply } = req.body;
    let documentPath = null;

    if (req.file) {
        documentPath = req.file.path.replace(/\\/g, '/'); // Normalize path
    }

    console.log(`Updating request ${id}. Status: ${status}, Reply: ${reply}, File: ${documentPath}`);

    let query = '';
    let values = [];

    // Logic for completed_at
    // If status is 'Resolved', set completed_at to NOW()
    // If status is NOT 'Resolved', set completed_at to NULL (re-opened)
    const completedAtSql = status === 'Resolved' ? 'NOW()' : 'NULL';

    if (documentPath) {
        query = `
            UPDATE document_requests
            SET status=?, admin_notes=?, document=?, completed_at=${completedAtSql}, updated_at=NOW()
            WHERE id=?
        `;
        values = [status, reply, documentPath, id];
    } else {
        query = `
            UPDATE document_requests
            SET status=?, admin_notes=?, completed_at=${completedAtSql}, updated_at=NOW()
            WHERE id=?
        `;
        values = [status, reply, id];
    }

    db.query(query, values, async (err, result) => {
        if (err) {
            console.error('Error updating request:', err);
            return res.status(500).json(err);
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Request not found' });
        }

        // If reply is provided, send notification to client
        if (reply) {
            try {
                // Fetch client user_id and request_type
                const fetchQuery = `
                    SELECT c.user_id, r.request_type 
                    FROM document_requests r
                    JOIN clients c ON r.client_id = c.id
                    WHERE r.id = ?
                `;
                db.query(fetchQuery, [id], async (fetchErr, fetchResult) => {
                    if (!fetchErr && fetchResult.length > 0) {
                        const clientUserId = fetchResult[0].user_id;
                        const requestType = fetchResult[0].request_type;
                        await notifyRequestReplied(clientUserId, requestType, id);
                    }
                });
            } catch (notifErr) {
                console.error('Error creating notification:', notifErr);
                // Don't fail the request if notification fails
            }
        }

        res.json({ message: 'Request updated successfully', document: documentPath });
    });
});

// DELETE request
router.delete('/:id', (req, res) => {
    const { id } = req.params;

    const query = 'UPDATE document_requests SET deleted_at = NOW() WHERE id = ?';

    db.query(query, [id], (err, result) => {
        if (err) {
            console.error('Error deleting request:', err);
            return res.status(500).json(err);
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Request not found' });
        }
        res.json({ message: 'Request deleted successfully' });
    });
});

module.exports = router;
