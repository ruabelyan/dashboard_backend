import express from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import { db } from '../database/init.js';
import { authenticateToken } from '../middleware/auth.js';
import { easypayClientSchema, validateRequest } from '../middleware/validation.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import EasyPayDataImporter from '../services/EasyPayDataImporter.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = express.Router();
/**
 * @swagger
 * components:
 *   schemas:
 *     EasyPayClient:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         client_id:
 *           type: string
 *         display_name:
 *           type: string
 *         ssn:
 *           type: string
 *         is_resident:
 *           type: string
 *         password:
 *           type: string
 *         pin:
 *           type: string
 *         first_name:
 *           type: string
 *         last_name:
 *           type: string
 *         address:
 *           type: string
 *         date_of_birth:
 *           type: string
 *         is_enabled:
 *           type: string
 *         email:
 *           type: string
 *           format: email
 *         phone:
 *           type: string
 *         phone2:
 *           type: string
 *         gender:
 *           type: string
 *         language:
 *           type: string
 *         phone_verified:
 *           type: string
 *         email_verified:
 *           type: string
 *         open_date:
 *           type: string
 *         is_verified:
 *           type: string
 *         ordered_registration:
 *           type: string
 *         verification_date:
 *           type: string
 *         registration_type:
 *           type: string
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 */
/**
 * @swagger
 * /easypay/clients:
 *   get:
 *     summary: Get EasyPay clients with pagination
 *     tags: [EasyPay Clients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of clients per page
 *     responses:
 *       200:
 *         description: List of EasyPay clients
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 clients:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/EasyPayClient'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 */
router.get('/clients', authenticateToken, (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;
    // Get total count
    db.get('SELECT COUNT(*) as total FROM easypay_clients', (err, countResult) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        const total = countResult.total;
        const totalPages = Math.ceil(total / limit);
        // Get clients for current page
        db.all('SELECT * FROM easypay_clients ORDER BY created_at DESC LIMIT ? OFFSET ?', [limit, offset], (err, clients) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            // Transform database column names to frontend expected format
            const transformedClients = clients.map(client => ({
                "Client ID": client.client_id,
                "Display Name": client.display_name,
                "SSN": client.ssn,
                "Is Resident": client.is_resident,
                "Password": client.password,
                "Pin": client.pin,
                "First Name": client.first_name,
                "Last Name": client.last_name,
                "Address": client.address,
                "Date Of Birth": client.date_of_birth,
                "Is Enabled": client.is_enabled,
                "Email": client.email,
                "Phone": client.phone,
                "Phone2": client.phone2,
                "Gender": client.gender,
                "Language": client.language,
                "Phone Verified": client.phone_verified,
                "Email Verified": client.email_verified,
                "Open Date": client.open_date,
                "Is Varificated": client.is_verified,
                "Ordered Registration": client.ordered_registration,
                "VerificationDate": client.verification_date,
                "Registration Type": client.registration_type
            }));
            res.json({
                clients: transformedClients,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages
                }
            });
        });
    });
});
/**
 * @swagger
 * /easypay/clients/search:
 *   get:
 *     summary: Search EasyPay clients
 *     tags: [EasyPay Clients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of clients per page
 *     responses:
 *       200:
 *         description: Search results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 clients:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/EasyPayClient'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 */
router.get('/clients/search', authenticateToken, (req, res) => {
    const query = req.query.q;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;
    if (!query) {
        return res.status(400).json({ error: 'Search query is required' });
    }
    const searchTerm = `%${query}%`;
    // Get total count for search
    db.get(`SELECT COUNT(*) as total FROM easypay_clients 
     WHERE display_name LIKE ? OR first_name LIKE ? OR last_name LIKE ? 
     OR email LIKE ? OR phone LIKE ? OR client_id LIKE ? OR ssn LIKE ? OR phone2 LIKE ?`, [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm], (err, countResult) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        const total = countResult.total;
        const totalPages = Math.ceil(total / limit);
        // Get search results
        db.all(`SELECT * FROM easypay_clients 
         WHERE display_name LIKE ? OR first_name LIKE ? OR last_name LIKE ? 
         OR email LIKE ? OR phone LIKE ? OR client_id LIKE ? OR ssn LIKE ? OR phone2 LIKE ?
         ORDER BY created_at DESC LIMIT ? OFFSET ?`, [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, limit, offset], (err, clients) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            // Transform database column names to frontend expected format
            const transformedClients = clients.map(client => ({
                "Client ID": client.client_id,
                "Display Name": client.display_name,
                "SSN": client.ssn,
                "Is Resident": client.is_resident,
                "Password": client.password,
                "Pin": client.pin,
                "First Name": client.first_name,
                "Last Name": client.last_name,
                "Address": client.address,
                "Date Of Birth": client.date_of_birth,
                "Is Enabled": client.is_enabled,
                "Email": client.email,
                "Phone": client.phone,
                "Phone2": client.phone2,
                "Gender": client.gender,
                "Language": client.language,
                "Phone Verified": client.phone_verified,
                "Email Verified": client.email_verified,
                "Open Date": client.open_date,
                "Is Varificated": client.is_verified,
                "Ordered Registration": client.ordered_registration,
                "VerificationDate": client.verification_date,
                "Registration Type": client.registration_type
            }));
            res.json({
                clients: transformedClients,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages
                }
            });
        });
    });
});
/**
 * @swagger
 * /easypay/clients/{id}:
 *   get:
 *     summary: Get EasyPay client by ID
 *     tags: [EasyPay Clients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Client ID
 *     responses:
 *       200:
 *         description: Client details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EasyPayClient'
 *       404:
 *         description: Client not found
 *       401:
 *         description: Unauthorized
 */
router.get('/clients/:id', authenticateToken, (req, res) => {
    const clientId = parseInt(req.params.id);
    db.get('SELECT * FROM easypay_clients WHERE id = ?', [clientId], (err, client) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        if (!client) {
            return res.status(404).json({ error: 'Client not found' });
        }
        // Transform database column names to frontend expected format
        const transformedClient = {
            "Client ID": client.client_id,
            "Display Name": client.display_name,
            "SSN": client.ssn,
            "Is Resident": client.is_resident,
            "Password": client.password,
            "Pin": client.pin,
            "First Name": client.first_name,
            "Last Name": client.last_name,
            "Address": client.address,
            "Date Of Birth": client.date_of_birth,
            "Is Enabled": client.is_enabled,
            "Email": client.email,
            "Phone": client.phone,
            "Phone2": client.phone2,
            "Gender": client.gender,
            "Language": client.language,
            "Phone Verified": client.phone_verified,
            "Email Verified": client.email_verified,
            "Open Date": client.open_date,
            "Is Varificated": client.is_verified,
            "Ordered Registration": client.ordered_registration,
            "VerificationDate": client.verification_date,
            "Registration Type": client.registration_type
        };
        res.json(transformedClient);
    });
});
/**
 * @swagger
 * /easypay/clients:
 *   post:
 *     summary: Create new EasyPay client
 *     tags: [EasyPay Clients]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EasyPayClient'
 *     responses:
 *       201:
 *         description: Client created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EasyPayClient'
 *       400:
 *         description: Validation error or client already exists
 *       401:
 *         description: Unauthorized
 */
router.post('/clients', authenticateToken, validateRequest(easypayClientSchema), (req, res) => {
    const clientData = req.body;
    // Check if client already exists
    db.get('SELECT id FROM easypay_clients WHERE client_id = ?', [clientData.client_id], (err, existingClient) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        if (existingClient) {
            return res.status(400).json({ error: 'Client already exists' });
        }
        // Insert new client
        db.run(`INSERT INTO easypay_clients (
        client_id, display_name, ssn, is_resident, password, pin,
        first_name, last_name, address, date_of_birth, is_enabled,
        email, phone, phone2, gender, language, phone_verified,
        email_verified, open_date, is_verified, ordered_registration,
        verification_date, registration_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            clientData.client_id, clientData.display_name, clientData.ssn, clientData.is_resident,
            clientData.password, clientData.pin, clientData.first_name, clientData.last_name,
            clientData.address, clientData.date_of_birth, clientData.is_enabled,
            clientData.email, clientData.phone, clientData.phone2, clientData.gender,
            clientData.language, clientData.phone_verified, clientData.email_verified,
            clientData.open_date, clientData.is_verified, clientData.ordered_registration,
            clientData.verification_date, clientData.registration_type
        ], function (err) {
            if (err) {
                console.error('Client creation error:', err);
                return res.status(500).json({ error: 'Client creation failed' });
            }
            // Get created client
            db.get('SELECT * FROM easypay_clients WHERE id = ?', [this.lastID], (err, client) => {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).json({ error: 'Database error' });
                }
                res.status(201).json(client);
            });
        });
    });
});
/**
 * @swagger
 * /easypay/clients/{id}:
 *   put:
 *     summary: Update EasyPay client
 *     tags: [EasyPay Clients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Client ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EasyPayClient'
 *     responses:
 *       200:
 *         description: Client updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EasyPayClient'
 *       404:
 *         description: Client not found
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.put('/clients/:id', authenticateToken, validateRequest(easypayClientSchema), (req, res) => {
    const clientId = parseInt(req.params.id);
    const clientData = req.body;
    // Check if client exists
    db.get('SELECT id FROM easypay_clients WHERE id = ?', [clientId], (err, existingClient) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        if (!existingClient) {
            return res.status(404).json({ error: 'Client not found' });
        }
        // Update client
        db.run(`UPDATE easypay_clients SET 
        client_id = ?, display_name = ?, ssn = ?, is_resident = ?, password = ?, pin = ?,
        first_name = ?, last_name = ?, address = ?, date_of_birth = ?, is_enabled = ?,
        email = ?, phone = ?, phone2 = ?, gender = ?, language = ?, phone_verified = ?,
        email_verified = ?, open_date = ?, is_verified = ?, ordered_registration = ?,
        verification_date = ?, registration_type = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`, [
            clientData.client_id, clientData.display_name, clientData.ssn, clientData.is_resident,
            clientData.password, clientData.pin, clientData.first_name, clientData.last_name,
            clientData.address, clientData.date_of_birth, clientData.is_enabled,
            clientData.email, clientData.phone, clientData.phone2, clientData.gender,
            clientData.language, clientData.phone_verified, clientData.email_verified,
            clientData.open_date, clientData.is_verified, clientData.ordered_registration,
            clientData.verification_date, clientData.registration_type, clientId
        ], function (err) {
            if (err) {
                console.error('Client update error:', err);
                return res.status(500).json({ error: 'Client update failed' });
            }
            // Get updated client
            db.get('SELECT * FROM easypay_clients WHERE id = ?', [clientId], (err, client) => {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).json({ error: 'Database error' });
                }
                res.json(client);
            });
        });
    });
});
/**
 * @swagger
 * /easypay/clients/{id}:
 *   delete:
 *     summary: Delete EasyPay client
 *     tags: [EasyPay Clients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Client ID
 *     responses:
 *       200:
 *         description: Client deleted successfully
 *       404:
 *         description: Client not found
 *       401:
 *         description: Unauthorized
 */
router.delete('/clients/:id', authenticateToken, (req, res) => {
    const clientId = parseInt(req.params.id);
    db.run('DELETE FROM easypay_clients WHERE id = ?', [clientId], function (err) {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Client not found' });
        }
        res.json({ message: 'Client deleted successfully' });
    });
});
/**
 * @swagger
 * /easypay/import:
 *   post:
 *     summary: Import EasyPay clients from JSON file
 *     tags: [EasyPay Clients]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               batchSize:
 *                 type: integer
 *                 default: 100
 *                 description: Number of clients to process in each batch
 *               skipDuplicates:
 *                 type: boolean
 *                 default: true
 *                 description: Skip clients that already exist
 *               updateExisting:
 *                 type: boolean
 *                 default: false
 *                 description: Update existing clients instead of skipping
 *               dryRun:
 *                 type: boolean
 *                 default: false
 *                 description: Analyze data without importing
 *     responses:
 *       200:
 *         description: Import completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 stats:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     imported:
 *                       type: integer
 *                     skipped:
 *                       type: integer
 *                     errors:
 *                       type: integer
 *                     duplicates:
 *                       type: integer
 *                     processingTime:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Import failed
 */
router.post('/import', authenticateToken, async (req, res) => {
    try {
        const options = {
            batchSize: req.body.batchSize || 100,
            skipDuplicates: req.body.skipDuplicates !== false, // default true
            updateExisting: req.body.updateExisting || false,
            dryRun: req.body.dryRun || false
        };
        console.log(`📥 Import request from ${req.user?.email} with options:`, options);
        const importer = new EasyPayDataImporter();
        const stats = await importer.importAll(options);
        res.json({
            message: options.dryRun ? 'Data analysis completed' : 'Import completed successfully',
            stats,
            options
        });
    }
    catch (error) {
        console.error('Import error:', error);
        res.status(500).json({
            error: 'Import failed',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Configure multer for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
            file.mimetype === 'application/vnd.ms-excel') {
            cb(null, true);
        }
        else {
            cb(new Error('Only Excel files are allowed'));
        }
    },
});
/**
 * @swagger
 * /api/easypay/import-excel:
 *   post:
 *     summary: Import EasyPay clients from Excel file
 *     tags: [EasyPay]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Excel file (.xlsx or .xls)
 *     responses:
 *       200:
 *         description: EasyPay clients imported successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 imported:
 *                   type: number
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: string
 *                 duplicates:
 *                   type: number
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/import-excel', authenticateToken, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        if (jsonData.length < 2) {
            return res.status(400).json({ error: 'Excel file must contain at least a header row and one data row' });
        }
        const headers = jsonData[0];
        const rows = jsonData.slice(1);
        // Validate required columns
        const clientIdIndex = headers.findIndex(h => h.toLowerCase() === 'client id');
        const displayNameIndex = headers.findIndex(h => h.toLowerCase() === 'display name');
        const firstNameIndex = headers.findIndex(h => h.toLowerCase() === 'first name');
        const lastNameIndex = headers.findIndex(h => h.toLowerCase() === 'last name');
        const emailIndex = headers.findIndex(h => h.toLowerCase() === 'email');
        const phoneIndex = headers.findIndex(h => h.toLowerCase() === 'phone');
        if (clientIdIndex === -1 || displayNameIndex === -1 || firstNameIndex === -1 ||
            lastNameIndex === -1 || emailIndex === -1 || phoneIndex === -1) {
            return res.status(400).json({
                error: 'Excel file must contain "Client ID", "Display Name", "First Name", "Last Name", "Email", and "Phone" columns'
            });
        }
        const validClients = [];
        const errors = [];
        let duplicates = 0;
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            // Skip empty rows
            if (!row[clientIdIndex] && !row[displayNameIndex]) {
                continue;
            }
            const clientId = row[clientIdIndex]?.toString().trim();
            const displayName = row[displayNameIndex]?.toString().trim();
            const firstName = row[firstNameIndex]?.toString().trim();
            const lastName = row[lastNameIndex]?.toString().trim();
            const email = row[emailIndex]?.toString().trim();
            const phone = row[phoneIndex]?.toString().trim();
            // Validate required fields
            if (!clientId) {
                errors.push(`Row ${i + 2}: Client ID is required`);
                continue;
            }
            if (!displayName) {
                errors.push(`Row ${i + 2}: Display Name is required`);
                continue;
            }
            if (!firstName) {
                errors.push(`Row ${i + 2}: First Name is required`);
                continue;
            }
            if (!lastName) {
                errors.push(`Row ${i + 2}: Last Name is required`);
                continue;
            }
            if (!email) {
                errors.push(`Row ${i + 2}: Email is required`);
                continue;
            }
            if (!phone) {
                errors.push(`Row ${i + 2}: Phone is required`);
                continue;
            }
            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                errors.push(`Row ${i + 2}: Invalid email format`);
                continue;
            }
            // Check for duplicate client ID
            const existingClient = await new Promise((resolve, reject) => {
                db.get('SELECT id FROM easypay_clients WHERE client_id = ?', [clientId], (err, row) => {
                    if (err)
                        reject(err);
                    else
                        resolve(row);
                });
            });
            if (existingClient) {
                duplicates++;
                continue;
            }
            // Build client object
            const client = {
                client_id: clientId,
                display_name: displayName,
                first_name: firstName,
                last_name: lastName,
                email: email,
                phone: phone,
                created_at: new Date().toISOString(),
            };
            // Add optional fields
            const ssnIndex = headers.findIndex(h => h.toLowerCase() === 'ssn');
            const isResidentIndex = headers.findIndex(h => h.toLowerCase() === 'is resident');
            const passwordIndex = headers.findIndex(h => h.toLowerCase() === 'password');
            const pinIndex = headers.findIndex(h => h.toLowerCase() === 'pin');
            const addressIndex = headers.findIndex(h => h.toLowerCase() === 'address');
            const dateOfBirthIndex = headers.findIndex(h => h.toLowerCase() === 'date of birth');
            const isEnabledIndex = headers.findIndex(h => h.toLowerCase() === 'is enabled');
            const phone2Index = headers.findIndex(h => h.toLowerCase() === 'phone2');
            const genderIndex = headers.findIndex(h => h.toLowerCase() === 'gender');
            const languageIndex = headers.findIndex(h => h.toLowerCase() === 'language');
            const phoneVerifiedIndex = headers.findIndex(h => h.toLowerCase() === 'phone verified');
            const emailVerifiedIndex = headers.findIndex(h => h.toLowerCase() === 'email verified');
            const openDateIndex = headers.findIndex(h => h.toLowerCase() === 'open date');
            const isVerifiedIndex = headers.findIndex(h => h.toLowerCase() === 'is varificated');
            const orderedRegistrationIndex = headers.findIndex(h => h.toLowerCase() === 'ordered registration');
            const verificationDateIndex = headers.findIndex(h => h.toLowerCase() === 'verificationdate');
            const registrationTypeIndex = headers.findIndex(h => h.toLowerCase() === 'registration type');
            if (ssnIndex !== -1 && row[ssnIndex])
                client.ssn = row[ssnIndex].toString().trim();
            if (isResidentIndex !== -1 && row[isResidentIndex])
                client.is_resident = row[isResidentIndex].toString().trim();
            if (passwordIndex !== -1 && row[passwordIndex])
                client.password = row[passwordIndex].toString().trim();
            if (pinIndex !== -1 && row[pinIndex])
                client.pin = row[pinIndex].toString().trim();
            if (addressIndex !== -1 && row[addressIndex])
                client.address = row[addressIndex].toString().trim();
            if (dateOfBirthIndex !== -1 && row[dateOfBirthIndex])
                client.date_of_birth = row[dateOfBirthIndex].toString().trim();
            if (isEnabledIndex !== -1 && row[isEnabledIndex])
                client.is_enabled = row[isEnabledIndex].toString().trim();
            if (phone2Index !== -1 && row[phone2Index])
                client.phone2 = row[phone2Index].toString().trim();
            if (genderIndex !== -1 && row[genderIndex])
                client.gender = row[genderIndex].toString().trim();
            if (languageIndex !== -1 && row[languageIndex])
                client.language = row[languageIndex].toString().trim();
            if (phoneVerifiedIndex !== -1 && row[phoneVerifiedIndex])
                client.phone_verified = row[phoneVerifiedIndex].toString().trim();
            if (emailVerifiedIndex !== -1 && row[emailVerifiedIndex])
                client.email_verified = row[emailVerifiedIndex].toString().trim();
            if (openDateIndex !== -1 && row[openDateIndex])
                client.open_date = row[openDateIndex].toString().trim();
            if (isVerifiedIndex !== -1 && row[isVerifiedIndex])
                client.is_verified = row[isVerifiedIndex].toString().trim();
            if (orderedRegistrationIndex !== -1 && row[orderedRegistrationIndex])
                client.ordered_registration = row[orderedRegistrationIndex].toString().trim();
            if (verificationDateIndex !== -1 && row[verificationDateIndex])
                client.verification_date = row[verificationDateIndex].toString().trim();
            if (registrationTypeIndex !== -1 && row[registrationTypeIndex])
                client.registration_type = row[registrationTypeIndex].toString().trim();
            validClients.push(client);
        }
        // Insert valid clients
        let importedCount = 0;
        for (const client of validClients) {
            try {
                await new Promise((resolve, reject) => {
                    const fields = Object.keys(client);
                    const placeholders = fields.map(() => '?').join(', ');
                    const values = Object.values(client);
                    db.run(`INSERT INTO easypay_clients (${fields.join(', ')}) VALUES (${placeholders})`, values, function (err) {
                        if (err)
                            reject(err);
                        else
                            resolve(this);
                    });
                });
                importedCount++;
            }
            catch (error) {
                errors.push(`Failed to import client ${client.display_name}: ${error}`);
            }
        }
        res.json({
            success: true,
            imported: importedCount,
            errors,
            duplicates,
        });
    }
    catch (error) {
        console.error('Excel import error:', error);
        res.status(500).json({ error: 'Failed to process Excel file' });
    }
});
export default router;
//# sourceMappingURL=easypay.js.map