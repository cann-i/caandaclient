const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET all active services
router.get('/', (req, res) => {
    const query = `
        SELECT 
            id,
            service_name,
            service_code,
            hsn_sac_code,
            description,
            default_rate,
            gst_rate
        FROM services
        WHERE is_active = 1
        ORDER BY service_name ASC
    `;
    db.query(query, (err, result) => {
        if (err) {
            console.error('Error fetching services:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(result);
    });
});

// GET single service by ID
router.get('/:id', (req, res) => {
    const { id } = req.params;
    const query = 'SELECT * FROM services WHERE id = ? AND is_active = 1';
    db.query(query, [id], (err, result) => {
        if (err) {
            console.error('Error fetching service:', err);
            return res.status(500).json(err);
        }
        if (result.length === 0) {
            return res.status(404).json({ message: 'Service not found' });
        }
        res.json(result[0]);
    });
});

module.exports = router;

