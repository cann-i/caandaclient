const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET all notifications for a user (only unread)
router.get('/:userId', (req, res) => {
    const { userId } = req.params;

    const query = `
    SELECT * FROM notifications 
    WHERE user_id = ? AND is_read = 0
    ORDER BY created_at DESC
  `;

    db.query(query, [userId], (err, result) => {
        if (err) {
            console.error('Error fetching notifications:', err);
            return res.status(500).json(err);
        }
        res.json(result);
    });
});

// GET unread notifications count for a user
router.get('/:userId/unread', (req, res) => {
    const { userId } = req.params;

    const query = `
    SELECT COUNT(*) as unread_count
    FROM notifications
    WHERE user_id = ? AND is_read = 0
  `;

    db.query(query, [userId], (err, result) => {
        if (err) {
            console.error('Error fetching unread count:', err);
            return res.status(500).json(err);
        }
        res.json({ unread_count: result[0].unread_count });
    });
});

// PUT mark a notification as read
router.put('/:id/read', (req, res) => {
    const { id } = req.params;

    const query = `
    UPDATE notifications
    SET is_read = 1
    WHERE id = ?
  `;

    db.query(query, [id], (err, result) => {
        if (err) {
            console.error('Error marking notification as read:', err);
            return res.status(500).json(err);
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Notification not found' });
        }
        res.json({ message: 'Notification marked as read' });
    });
});

// PUT mark all notifications as read for a user
router.put('/mark-all-read/:userId', (req, res) => {
    const { userId } = req.params;

    const query = `
    UPDATE notifications
    SET is_read = 1
    WHERE user_id = ? AND is_read = 0
  `;

    db.query(query, [userId], (err, result) => {
        if (err) {
            console.error('Error marking all notifications as read:', err);
            return res.status(500).json(err);
        }
        res.json({ message: 'All notifications marked as read', affected: result.affectedRows });
    });
});

// DELETE a notification
router.delete('/:id', (req, res) => {
    const { id } = req.params;

    const query = 'DELETE FROM notifications WHERE id = ?';

    db.query(query, [id], (err, result) => {
        if (err) {
            console.error('Error deleting notification:', err);
            return res.status(500).json(err);
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Notification not found' });
        }
        res.json({ message: 'Notification deleted successfully' });
    });
});

module.exports = router;
