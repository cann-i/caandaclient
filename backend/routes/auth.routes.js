const express = require('express');
const router = express.Router();
const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

// Configure Multer for Avatar Uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/profiles/');
    },
    filename: (req, file, cb) => {
        cb(null, 'avatar-' + Date.now() + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only images are allowed'), false);
    }
};

const upload = multer({ storage, fileFilter });

// GET USER PROFILE
router.get('/profile', auth, (req, res) => {
    const userId = req.user.id;
    const query = 'SELECT id, user_type, name, email, mobile, profile_image, is_active, created_at, last_login FROM users WHERE id = ?';

    db.query(query, [userId], (err, results) => {
        if (err) {
            console.error('Error fetching profile:', err);
            return res.status(500).json({ message: 'Server error' });
        }
        if (results.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(results[0]);
    });
});

// UPDATE USER PROFILE (Supports Avatar and Removal)
router.put('/profile', auth, upload.single('avatar'), (req, res) => {
    const userId = req.user.id;
    const { name, mobile, remove_avatar } = req.body;
    let profileImage = undefined; // undefined = do not change

    if (req.file) {
        // Option 1: User uploaded a new file
        profileImage = `/uploads/profiles/${req.file.filename}`;
    } else if (remove_avatar === 'true') {
        // Option 2: User explicitly requested removal
        profileImage = null; // null = set to NULL in DB
    }

    // Dynamic query construction
    let query = 'UPDATE users SET name = ?, mobile = ?';
    let params = [name, mobile];

    if (profileImage !== undefined) {
        query += ', profile_image = ?';
        params.push(profileImage);
    }

    query += ' WHERE id = ?';
    params.push(userId);

    db.query(query, params, (err, result) => {
        if (err) {
            console.error('Error updating profile:', err);
            return res.status(500).json({ message: 'Server error' });
        }

        res.json({
            message: 'Profile updated successfully',
            user: {
                id: userId,
                name,
                mobile,
                profile_image: profileImage // Return new image if updated (or null)
            }
        });
    });
});

// CLIENT LOGIN (Password based)
router.post('/client-login', (req, res) => {
    const { email, password } = req.body;

    const query = `
        SELECT * FROM users 
        WHERE (email = ? OR mobile = ?) 
        AND user_type = 'client' 
        AND is_active = 1
    `;

    db.query(query, [email, email], async (err, results) => {
        if (err) {
            console.error('Login error:', err);
            return res.status(500).json({ message: 'Server error during login' });
        }

        if (results.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials or user not found' });
        }

        const user = results[0];

        // Compare password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Generate Token
        const token = jwt.sign(
            { id: user.id, user_type: user.user_type, name: user.name, email: user.email },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Update last login
        db.query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

        // Return user info and token
        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                user_type: user.user_type,
                mobile: user.mobile
            }
        });
    });
});

// CA LOGIN (Password based)
router.post('/ca-login', (req, res) => {
    const { email, password } = req.body;

    const query = `
        SELECT * FROM users 
        WHERE email = ? 
        AND user_type = 'ca' 
        AND is_active = 1
    `;

    db.query(query, [email], async (err, results) => {
        if (err) {
            console.error('Login error:', err);
            return res.status(500).json({ message: 'Server error during login' });
        }

        if (results.length === 0) {
            // Check if user exists as Client to give better error message
            db.query('SELECT user_type FROM users WHERE email = ?', [email], (checkErr, checkResults) => {
                if (!checkErr && checkResults.length > 0 && checkResults[0].user_type === 'client') {
                    return res.status(400).json({ message: 'This is a Client account. Please use the Client Login tab.' });
                }
                return res.status(401).json({ message: 'Invalid credentials or user not found' });
            });
            return;
        }

        const user = results[0];

        // Compare password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Generate Token
        const token = jwt.sign(
            { id: user.id, user_type: user.user_type, name: user.name, email: user.email },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Update last login
        db.query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

        // Return user info and token
        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                user_type: user.user_type,
                mobile: user.mobile
            }
        });
    });
});

// CHANGE PASSWORD
router.post('/change-password', auth, async (req, res) => {
    const userId = req.user.id;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    if (newPassword !== confirmPassword) {
        return res.status(400).json({ message: 'New password and confirm password do not match' });
    }

    if (newPassword.length < 6) {
        return res.status(400).json({ message: 'New password must be at least 6 characters long' });
    }

    if (currentPassword === newPassword) {
        return res.status(400).json({ message: 'New password must be different from current password' });
    }

    try {
        // Fetch current user password
        const query = 'SELECT password FROM users WHERE id = ?';
        db.query(query, [userId], async (err, results) => {
            if (err) {
                console.error('Error fetching user:', err);
                return res.status(500).json({ message: 'Server error' });
            }

            if (results.length === 0) {
                return res.status(404).json({ message: 'User not found' });
            }

            const user = results[0];

            // Verify current password
            const isMatch = await bcrypt.compare(currentPassword, user.password);
            if (!isMatch) {
                return res.status(401).json({ message: 'Current password is incorrect' });
            }

            // Hash new password
            const hashedPassword = await bcrypt.hash(newPassword, 10);

            // Update password
            const updateQuery = 'UPDATE users SET password = ? WHERE id = ?';
            db.query(updateQuery, [hashedPassword, userId], (updateErr) => {
                if (updateErr) {
                    console.error('Error updating password:', updateErr);
                    return res.status(500).json({ message: 'Server error' });
                }

                res.json({ message: 'Password changed successfully' });
            });
        });
    } catch (error) {
        console.error('Password change error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
