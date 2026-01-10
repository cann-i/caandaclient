const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { notifyInvoiceGenerated } = require('../utils/notificationHelper');

// Helper to format dates to YYYY-MM-DD (without timezone conversion)
const formatDate = (date) => {
    if (!date) return null;
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// --- GLOBAL PAYMENTS ROUTE ---
// GET /api/invoices/payments/all - Fetch all payments with client and invoice info
router.get('/payments/all', async (req, res) => {
    try {
        const [payments] = await db.promise().query(`
            SELECT 
                p.*, 
                c.business_name as client_name, 
                i.invoice_number,
                i.total_amount as invoice_total,
                i.paid_amount as invoice_paid,
                i.balance_amount as invoice_due
            FROM payments p
            JOIN clients c ON p.client_id = c.id
            JOIN invoices i ON p.invoice_id = i.id
            ORDER BY p.payment_date DESC
        `);

        const formattedPayments = payments.map(p => ({
            ...p,
            date: formatDate(p.payment_date),
            amount: Number(p.amount),
            invoice_total: Number(p.invoice_total),
            invoice_paid: Number(p.invoice_paid),
            invoice_due: Number(p.invoice_due)
        }));

        res.json(formattedPayments);
    } catch (err) {
        console.error('Error fetching all payments:', err);
        res.status(500).json({ error: err.message });
    }
});

// 1. GET ALL INVOICES
router.get('/', async (req, res) => {
    try {
        // Fixed: Use business_name and join contacts table for email
        const [invoices] = await db.promise().query(`
                SELECT 
                    i.*, 
                    c.business_name as client, 
                COALESCE(c.email, '') as clientEmail,
                COALESCE(c.phone, '') as clientPhone,
                COALESCE(SUM(p.amount), 0) as total_paid
            FROM invoices i
            JOIN clients c ON i.client_id = c.id
            LEFT JOIN payments p ON i.id = p.invoice_id
            WHERE i.deleted_at IS NULL
            GROUP BY i.id
            ORDER BY i.created_at DESC
        `);

        // Fetch items for each invoice to match frontend structure
        const invoicesWithItems = await Promise.all(invoices.map(async (inv) => {
            const [items] = await db.promise().query(`
                SELECT ii.id, ii.service_id, s.service_name as service, ii.description, ii.quantity, ii.rate, ii.gst_rate 
                FROM invoice_items ii
                LEFT JOIN services s ON ii.service_id = s.id
                WHERE ii.invoice_id = ?
            `, [inv.id]);

            // Map DB columns to Frontend columns
            return {
                id: inv.id,
                clientId: inv.client_id, // Added for linking
                invoiceNumber: inv.invoice_number,
                client: inv.client,
                clientEmail: inv.clientEmail,
                clientPhone: inv.clientPhone,
                amount: inv.subtotal,
                taxAmount: inv.total_tax,
                totalAmount: inv.total_amount,
                date: formatDate(inv.invoice_date),
                dueDate: formatDate(inv.due_date),
                status: inv.payment_status, // Maps DB 'payment_status' to Frontend 'status'
                description: inv.notes || '',
                services: items.map(i => i.service), // Array of service names
                items: items, // Full item details if needed
                paymentDate: inv.payment_status === 'Paid' ? formatDate(inv.updated_at) : null,
                paidAmount: inv.total_paid,
                balanceAmount: inv.balance_amount,
                createdAt: inv.created_at
            };
        }));

        res.json(invoicesWithItems);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// 2. GET SINGLE INVOICE (For View Modal)
router.get('/:id', async (req, res) => {
    try {
        const [invoices] = await db.promise().query(`
            SELECT 
                i.*, 
                c.business_name as client, 
                COALESCE(c.email, '') as clientEmail,
                COALESCE(c.phone, '') as clientPhone
            FROM invoices i 
            JOIN clients c ON i.client_id = c.id 
            WHERE i.id = ?
        `, [req.params.id]);

        if (invoices.length === 0) return res.status(404).json({ error: 'Invoice not found' });

        const inv = invoices[0];
        const [items] = await db.promise().query(`
            SELECT ii.*, s.service_name as service
            FROM invoice_items ii
            LEFT JOIN services s ON ii.service_id = s.id
            WHERE ii.invoice_id = ?
        `, [req.params.id]);
        const [payments] = await db.promise().query('SELECT * FROM payments WHERE invoice_id = ?', [req.params.id]);

        res.json({
            id: inv.id,
            invoiceNumber: inv.invoice_number,
            client: inv.client,
            clientEmail: inv.clientEmail,
            clientPhone: inv.clientPhone,
            amount: inv.subtotal,
            taxAmount: inv.total_tax,
            totalAmount: inv.total_amount,
            paidAmount: inv.paid_amount,
            balanceAmount: inv.balance_amount,
            status: inv.payment_status,
            date: formatDate(inv.invoice_date),
            dueDate: formatDate(inv.due_date),
            description: inv.notes || '',
            items: items,
            payments: payments,
            paymentDate: inv.payment_status === 'Paid' ? formatDate(inv.updated_at) : null,
            createdAt: inv.created_at
        });
    } catch (err) {
        console.error('Error fetching single invoice:', err);
        res.status(500).json({ error: err.message });
    }
});

// 3. CREATE INVOICE
router.post('/', async (req, res) => {
    const connection = await db.promise().getConnection();
    try {
        await connection.beginTransaction();

        const { client, clientEmail, date, dueDate, items, amount, taxAmount, totalAmount, description, status } = req.body;

        // 1. Find Client ID from client name
        // Fixed: Use business_name instead of client_name
        // 1. Find Client ID from client name/business name
        // Improved lookup: check business_name first, or client_name in users table
        const [clients] = await connection.query(`
            SELECT c.id, c.user_id 
            FROM clients c
            LEFT JOIN users u ON c.user_id = u.id 
            WHERE c.business_name = ? OR u.name = ?
        `, [client, client]);

        if (clients.length === 0) {
            await connection.rollback();
            return res.status(400).json({ error: 'Client not found in database. Check spelling or create client first.' });
        }

        const clientId = clients[0].id;
        const clientUserId = clients[0].user_id;

        // 2. Generate Sequential Invoice Number (INVYYYYMM-XXXX)
        const dateObj = new Date();
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const datePrefix = `INV${year}${month}-`;

        // Find latest invoice for this month to determine sequence
        const [latestInvoice] = await connection.query(
            'SELECT invoice_number FROM invoices WHERE invoice_number LIKE ? ORDER BY invoice_number DESC LIMIT 1',
            [`${datePrefix}%`]
        );

        let sequence = 1;
        if (latestInvoice.length > 0) {
            const lastNumber = latestInvoice[0].invoice_number;
            // Extract the numeric part (INV202601-XXXX -> XXXX)
            const lastSequence = parseInt(lastNumber.replace(datePrefix, ''));
            if (!isNaN(lastSequence)) {
                sequence = lastSequence + 1;
            }
        }

        const invoiceNumber = `${datePrefix}${String(sequence).padStart(4, '0')}`;
        const [result] = await connection.query(`
            INSERT INTO invoices 
            (client_id, invoice_number, invoice_date, due_date, subtotal, total_tax, total_amount, payment_status, notes, created_by) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [clientId, invoiceNumber, date, dueDate, amount, taxAmount, totalAmount, status || 'Pending', description, 1]);

        const invoiceId = result.insertId;

        // 3. Insert Items
        if (items && items.length > 0) {
            for (const item of items) {
                const itemAmount = item.quantity * item.rate;
                const itemGstAmount = (itemAmount * item.gst) / 100;

                await connection.query(`
                    INSERT INTO invoice_items 
                    (invoice_id, service_id, description, hsn_sac_code, quantity, rate, gst_rate, gst_amount) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `, [invoiceId, item.serviceId || 1, item.description || '', '', item.quantity, item.rate, item.gst, itemGstAmount]);
            }
        }

        await connection.commit();

        // Create notification for client
        try {
            await notifyInvoiceGenerated(clientUserId, invoiceNumber, totalAmount, invoiceId);
        } catch (notifErr) {
            console.error('Error creating notification:', notifErr);
            // Don't fail the request if notification fails
        }

        res.status(201).json({ message: 'Invoice created', id: invoiceId, invoiceNumber });
    } catch (err) {
        await connection.rollback();
        console.error('Error creating invoice:', err);
        res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
});

// 4. UPDATE INVOICE
router.put('/:id', async (req, res) => {
    const connection = await db.promise().getConnection();
    try {
        await connection.beginTransaction();

        const { client, date, dueDate, items, amount, taxAmount, totalAmount, description, status, notes } = req.body;
        const invoiceId = req.params.id;

        // Use 'notes' from body if valid, otherwise fallback to description (legacy behavior), or empty string
        const invoiceNotes = notes !== undefined ? notes : (description || '');

        // 1. Find Client ID if client name changed
        const [clients] = await connection.query(`
            SELECT c.id 
            FROM clients c
            LEFT JOIN users u ON c.user_id = u.id 
            WHERE c.business_name = ? OR u.name = ?
        `, [client, client]);

        if (clients.length === 0) {
            await connection.rollback();
            return res.status(400).json({ error: 'Client not found in database.' });
        }

        const clientId = clients[0].id;

        // 2. Update Invoice Details
        await connection.query(`
            UPDATE invoices 
            SET client_id = ?, invoice_date = ?, due_date = ?, subtotal = ?, total_tax = ?, total_amount = ?, notes = ?
            WHERE id = ?
        `, [clientId, date, dueDate, amount, taxAmount, totalAmount, invoiceNotes, invoiceId]);

        // 3. Update Status if provided (optional, but good to keep in sync)
        if (status) {
            await connection.query('UPDATE invoices SET payment_status = ? WHERE id = ?', [status, invoiceId]);
        }

        // 4. Delete existing items
        await connection.query('DELETE FROM invoice_items WHERE invoice_id = ?', [invoiceId]);

        // 5. Insert New Items
        if (items && items.length > 0) {
            for (const item of items) {
                // Handle property name mismatch
                const gstRate = item.gst !== undefined ? item.gst : (item.gst_rate || 0);
                const serviceName = item.service || item.description || '';

                const itemAmount = (item.quantity || 0) * (item.rate || 0);
                const itemGstAmount = (itemAmount * gstRate) / 100;

                await connection.query(`
                    INSERT INTO invoice_items 
                    (invoice_id, service_id, description, hsn_sac_code, quantity, rate, gst_rate, gst_amount) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `, [invoiceId, item.serviceId || 1, item.description || '', '', item.quantity, item.rate, gstRate, itemGstAmount]);
            }
        }

        await connection.commit();
        res.json({ message: 'Invoice updated successfully' });
    } catch (err) {
        await connection.rollback();
        console.error('Error updating invoice:', err);
        res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
});

// 4. UPDATE STATUS
router.put('/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        await db.promise().query('UPDATE invoices SET payment_status = ? WHERE id = ?', [status, req.params.id]);
        res.json({ message: 'Status updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 5. ADD PAYMENT
router.post('/:id/payments', async (req, res) => {
    const connection = await db.promise().getConnection();
    try {
        await connection.beginTransaction();

        const { paymentAmount, paymentDate, paymentMethod, transactionId, notes } = req.body;

        // Get current invoice details
        const [invoices] = await connection.query('SELECT * FROM invoices WHERE id = ?', [req.params.id]);
        const invoice = invoices[0];

        if (!invoice) {
            await connection.rollback();
            return res.status(404).json({ error: 'Invoice not found' });
        }

        // 1. Insert Payment Record
        await connection.query(`
            INSERT INTO payments 
            (invoice_id, client_id, payment_date, amount, payment_mode, transaction_id, notes, received_by) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [req.params.id, invoice.client_id, paymentDate, paymentAmount, paymentMethod, transactionId, notes, 1]);

        // 2. Update Invoice Totals
        const newPaidAmount = parseFloat(invoice.paid_amount || 0) + parseFloat(paymentAmount);
        const newBalanceAmount = parseFloat(invoice.total_amount) - newPaidAmount;

        let newStatus = invoice.payment_status;
        if (newBalanceAmount <= 0) {
            newStatus = 'Paid';
        } else if (newPaidAmount > 0) {
            newStatus = 'Partial';
        }

        await connection.query(`
            UPDATE invoices 
            SET paid_amount = ?, balance_amount = ?, payment_status = ? 
            WHERE id = ?
        `, [newPaidAmount, newBalanceAmount, newStatus, req.params.id]);

        await connection.commit();
        res.json({ message: 'Payment added', newStatus });
    } catch (err) {
        await connection.rollback();
        console.error('Error adding payment:', err);
        res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
});

// 6. DELETE INVOICE (Soft Delete)
router.delete('/:id', async (req, res) => {
    try {
        // Soft delete: Update deleted_at timestamp
        await db.promise().query('UPDATE invoices SET deleted_at = NOW() WHERE id = ?', [req.params.id]);

        // Optionally soft delete related payments if needed, but usually hiding the invoice is enough
        // DB constraints might require handling children, but if soft deleting, we keep them.

        res.json({ message: 'Invoice deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;