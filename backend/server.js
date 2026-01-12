const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const app = express();

app.use(morgan('combined'));
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/clients', require('./routes/clients.routes'));
app.use('/api/returns', require('./routes/returns.routes'));
app.use('/api/documents', require('./routes/documents.routes'));
app.use('/api/invoices', require('./routes/invoices.routes'));
app.use('/api/services', require('./routes/services.routes'));
app.use('/api/requests', require('./routes/requests.routes'));
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/notifications', require('./routes/notifications.routes'));

// Protect /uploads/documents
const auth = require('./middleware/auth');
app.use('/uploads/documents', auth, (req, res, next) => {
    // If we reach here, the token is valid.
    // However, static serving usually doesn't work well with Bearer tokens in <img src> or direct links.
    // So this mainly protects direct API access.
    // For proper download, users should use the /api/documents/download/:id endpoint.
    // We block direct access to documents folder to force use of the API which checks permissions.
    res.status(403).send('Access Denied. Please use the download API.');
});

// Allow public access to profile images (avatars)
app.use('/uploads/profiles', express.static('uploads/profiles'));

// Fallback for other uploads if any (but block by default if unsure)
// app.use('/uploads', express.static('uploads'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Backend running on port ${PORT}`);
});