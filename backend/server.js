const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

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

app.use('/uploads', express.static('uploads'));

const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Backend running on port ${PORT}`);
});