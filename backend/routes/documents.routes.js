const express = require('express');
const router = express.Router();
const db = require('../config/db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { notifyDocumentUploaded } = require('../utils/notificationHelper');

// Configure multer for local storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
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

// GET all documents
router.get('/', (req, res) => {
  const { user_id, exclude_clients } = req.query;

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
  if (user_id) {
    // If fetching for a specific user (Client Dashboard), ensure they only see what they are allowed to see
    query += ' AND c.user_id = ? AND d.is_visible_to_client = 1';
    params.push(user_id);
  }

  if (exclude_clients === 'true') {
    query += " AND u.user_type != 'client'";
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

// UPLOAD documents
router.post('/upload', upload.array('files'), async (req, res) => {
  let { client_id, category_id, financial_year, month, description, tags, visibility, is_acknowledgement, uploaded_by } = req.body;

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: 'No files uploaded' });
  }

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
      clientUserId = clientById[0].user_id;
    }

    // Get category name for notification
    const [category] = await db.promise().query('SELECT category_name FROM document_categories WHERE id = ?', [category_id]);
    if (category.length > 0) {
      categoryName = category[0].category_name;
    }
  } catch (err) {
    console.error('Error resolving client ID:', err);
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
        file.originalname, // document_name (Keep original name for display if needed, or user might want new name here too. Usually 'document_name' is user-friendly name.) 
        // NOTE: User asked to "rewrite the file name", usually implies the stored file. 
        // I will store the NEW filename in file_name column so it matches disk.
        file.filename,     // file_name (saved name)
        file.path.replace(/\\/g, '/'), // file_path
        file.mimetype,
        file.size,
        financial_year,
        month,
        description,
        tags,
        is_acknowledgement === 'true' ? 1 : 0,
        uploaded_by || 1,
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
      if (visibility === 'client' && clientUserId) {
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
          // Don't fail the upload if notification fails
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

  const query = 'UPDATE documents SET deleted_at = NOW() WHERE id = ?';

  db.query(query, [id], (err, result) => {
    if (err) {
      console.error('Error deleting document:', err);
      return res.status(500).json(err);
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Document not found' });
    }

    res.json({ message: 'Document deleted successfully' });
  });
});

module.exports = router;
