const express = require('express');
const router = express.Router();
const db = require('../config/db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/auth');
const { notifyDocumentUploaded } = require('../utils/notificationHelper');

// Configure multer for local storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Note: req.body is not fully populated here if using standard multer usage without text fields coming first
    // But for this simple setup, we will save to a temporary or general folder if needed,
    // or rely on the fact that we might organize files differently.
    // However, to keep it simple and secure, let's store in a flat structure or by ID after processing.
    // For now, preserving existing logic but creating directory if needed.
    const clientId = req.body.client_id || 'general';
    const dir = `uploads/documents/${clientId}`;

    // Ensure directory exists
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    // Use document name if provided, else use original name
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({ storage: storage });

// Apply Auth Middleware to ALL routes
router.use(auth);

// GET all documents
router.get('/', (req, res) => {
  const { user_id, exclude_clients } = req.query;
  const currentUser = req.user; // From auth middleware

  let query = `
        SELECT 
            d.*, 
            c.business_name as clientName,
            cat.category_name as type,
            u.user_type as uploader_role
        FROM documents d
        LEFT JOIN clients c ON d.client_id = c.id
        LEFT JOIN document_categories cat ON d.category_id = cat.id
        LEFT JOIN users u ON d.uploaded_by = u.id
        WHERE c.deleted_at IS NULL AND d.deleted_at IS NULL
    `;

  const params = [];

  // ACCESS CONTROL
  if (currentUser.user_type === 'client') {
    // Clients can ONLY see their own documents that are marked visible
    query += ' AND c.user_id = ? AND d.is_visible_to_client = 1';
    params.push(currentUser.id);
  } else {
    // CA/Admin Logic
    if (user_id) {
      // If Admin wants to filter by specific user
      query += ' AND c.user_id = ?';
      params.push(user_id);
    }
    if (exclude_clients === 'true') {
      query += " AND u.user_type != 'client'";
    }
  }

  query += ' ORDER BY d.created_at DESC';

  db.query(query, params, (err, result) => {
    if (err) {
      console.error('Error fetching documents:', err);
      return res.status(500).json(err);
    }
    res.json(result);
  });
});

// GET all document categories
router.get('/categories', (req, res) => {
  db.query('SELECT * FROM document_categories WHERE is_active = 1', (err, result) => {
    if (err) {
      console.error('Error fetching categories:', err);
      return res.status(500).json(err);
    }
    res.json(result);
  });
});

// DOWNLOAD document
router.get('/download/:id', (req, res) => {
  const docId = req.params.id;
  const currentUser = req.user;

  const query = `
      SELECT d.*, c.user_id as client_user_id
      FROM documents d
      JOIN clients c ON d.client_id = c.id
      WHERE d.id = ? AND d.deleted_at IS NULL
  `;

  db.query(query, [docId], (err, results) => {
    if (err) {
      console.error('Error fetching document for download:', err);
      return res.status(500).json({ message: 'Server error' });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: 'Document not found' });
    }

    const doc = results[0];

    // Access Control
    if (currentUser.user_type === 'client') {
      if (doc.client_user_id !== currentUser.id) {
        return res.status(403).json({ message: 'Access denied' });
      }
      if (!doc.is_visible_to_client) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    // File path resolution
    // Note: stored paths might differ based on OS (windows vs linux separators)
    // The DB stores relative path like "uploads/documents/..."
    const filePath = path.resolve(doc.file_path);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found on server' });
    }

    // Stream file
    res.download(filePath, doc.file_name || 'document');
  });
});

// UPLOAD documents
router.post('/upload', upload.array('files'), async (req, res) => {
  let { client_id, category_id, financial_year, month, description, tags, visibility, is_acknowledgement, uploaded_by } = req.body;
  const currentUser = req.user;

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: 'No files uploaded' });
  }

  // Security: If uploader is client, ensure they are uploading for themselves
  // However, clients usually upload to their own 'client_id' (which maps to their user_id).
  // The frontend might send client_id.

  // Resolve Client ID (Handle case where client_id is actually user_id)
  let resolvedClientId = client_id;
  let clientUserId = null;
  let categoryName = '';

  try {
    // Check if client_id exists as a primary key
    const [clientById] = await db.promise().query('SELECT id, user_id FROM clients WHERE id = ?', [client_id]);

    if (clientById.length === 0) {
      // If not found by ID, check if it matches a user_id
      const [clientByUserId] = await db.promise().query('SELECT id, user_id FROM clients WHERE user_id = ?', [client_id]);
      if (clientByUserId.length > 0) {
        resolvedClientId = clientByUserId[0].id; // Use the resolved Client ID
        clientUserId = clientByUserId[0].user_id;
      } else {
        console.warn('Could not resolve valid client_id for upload. Using provided:', client_id);
      }
    } else {
      resolvedClientId = clientById[0].id;
      clientUserId = clientById[0].user_id;
    }

    // Access Check: If user is client, they can only upload to their own client record
    if (currentUser.user_type === 'client') {
       if (clientUserId !== currentUser.id) {
         return res.status(403).json({ message: 'You can only upload documents for your own account' });
       }
       // Clients uploading files -> usually visible to themselves
       visibility = 'both';
       uploaded_by = currentUser.id;
    } else {
       // If CA is uploading, use the ID from token or body (if provided)
       uploaded_by = currentUser.id;
    }

    // Get category name for notification
    const [category] = await db.promise().query('SELECT category_name FROM document_categories WHERE id = ?', [category_id]);
    if (category.length > 0) {
      categoryName = category[0].category_name;
    }
  } catch (err) {
    console.error('Error resolving client ID:', err);
    return res.status(500).json({ message: 'Database error during client resolution' });
  }


  // Format timestamp: YYYYMMDDHHmmss
  const now = new Date();
  const timestamp = now.getFullYear().toString() +
    (now.getMonth() + 1).toString().padStart(2, '0') +
    now.getDate().toString().padStart(2, '0') +
    now.getHours().toString().padStart(2, '0') +
    now.getMinutes().toString().padStart(2, '0') +
    now.getSeconds().toString().padStart(2, '0');

  // Sanitize category name for filename
  const sanitizedCategory = categoryName ? categoryName.replace(/\s+/g, '_') : 'Document';

  const promises = req.files.map((file, index) => {
    return new Promise((resolve, reject) => {
      // Generate new filename: Category_YYYYMMDDHHmmss[_Index].ext
      // If multiple files, append index to ensure uniqueness
      const ext = path.extname(file.originalname);
      const indexSuffix = req.files.length > 1 ? `_${index + 1}` : '';
      const newFilename = `${sanitizedCategory}_${timestamp}${indexSuffix}${ext}`;
      const newPath = path.join(path.dirname(file.path), newFilename);

      // Rename file on disk
      try {
        fs.renameSync(file.path, newPath);
        // Update file object with new details
        file.filename = newFilename;
        file.path = newPath;
      } catch (renameErr) {
        console.error('Error renaming file:', renameErr);
        // If rename fails, we proceed with original name (fallback)
      }

      const query = `
                INSERT INTO documents 
                (client_id, category_id, document_name, file_name, file_path, file_type, file_size, financial_year, month, description, notes, is_acknowledgement, uploaded_by, is_visible_to_client)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
      const values = [
        resolvedClientId,
        category_id,
        file.originalname,
        file.filename,     // file_name (saved name)
        file.path.replace(/\\/g, '/'), // file_path
        file.mimetype,
        file.size,
        financial_year,
        month,
        description,
        tags,
        is_acknowledgement === 'true' ? 1 : 0,
        uploaded_by,
        (visibility === 'client' || visibility === 'both') ? 1 : 0
      ];

      db.query(query, values, (err, result) => {
        if (err) {
          console.error(`DB Error on File ${index}:`, err.message);
          reject(err);
        } else {
          console.log(`DB Success on File ${index}, ID:`, result.insertId);
          resolve({ insertId: result.insertId, fileName: file.originalname });
        }
      });
    });
  });

  Promise.all(promises)
    .then(async (results) => {
      console.log('--- Upload Success ---');

      // Create notification for client if visible to client and we have client user_id
      // Only notify if the UPLOADER is NOT the client (i.e. CA uploaded it)
      if (visibility === 'client' && clientUserId && currentUser.user_type !== 'client') {
        try {
          // Create one notification for the upload (using first document as reference)
          const firstDoc = results[0];
          const documentCount = results.length;
          const documentDescription = documentCount > 1
            ? `${documentCount} new documents`
            : 'A new document';

          await notifyDocumentUploaded(clientUserId, documentDescription, categoryName, firstDoc.insertId);
          console.log(`✅ Notification created for client user_id: ${clientUserId}`);
        } catch (notifErr) {
          console.error('Error creating notification:', notifErr);
        }
      }

      res.json({ message: 'Documents uploaded successfully' });
    })
    .catch(err => {
      console.error('--- Upload Failed ---', err);
      res.status(500).json({ message: 'Error saving document metadata', error: err.message });
    });
});

// DELETE document (Soft Delete)
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const currentUser = req.user;

  // First check ownership/permission
  const checkQuery = `
      SELECT d.id, c.user_id as client_user_id
      FROM documents d
      JOIN clients c ON d.client_id = c.id
      WHERE d.id = ?
  `;

  db.query(checkQuery, [id], (err, results) => {
      if (err) return res.status(500).json(err);
      if (results.length === 0) return res.status(404).json({ message: 'Document not found' });

      const doc = results[0];

      if (currentUser.user_type === 'client') {
          if (doc.client_user_id !== currentUser.id) {
              return res.status(403).json({ message: 'Access denied' });
          }
      }

      const query = 'UPDATE documents SET deleted_at = NOW() WHERE id = ?';
      db.query(query, [id], (delErr, result) => {
        if (delErr) {
          console.error('Error deleting document:', delErr);
          return res.status(500).json(delErr);
        }
        res.json({ message: 'Document deleted successfully' });
      });
  });
});

module.exports = router;
