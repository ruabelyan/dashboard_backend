import express, {} from 'express';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import * as XLSX from 'xlsx';
import { db } from '../database/init.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { userUpdateSchema, validateRequest } from '../middleware/validation.js';
const router = express.Router();
/**
 * @swagger
 * components:
 *   schemas:
 *     UserUpdateRequest:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           minLength: 2
 *           maxLength: 50
 *         email:
 *           type: string
 *           format: email
 *         role:
 *           type: string
 *           enum: [user, admin]
 *     UserCreateRequest:
 *       type: object
 *       required:
 *         - name
 *         - email
 *         - password
 *       properties:
 *         name:
 *           type: string
 *           minLength: 2
 *           maxLength: 50
 *         email:
 *           type: string
 *           format: email
 *         password:
 *           type: string
 *           minLength: 6
 *         role:
 *           type: string
 *           enum: [user, admin]
 *           default: user
 */
/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get all users with pagination
 *     tags: [Users]
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
 *           default: 10
 *         description: Number of users per page
 *     responses:
 *       200:
 *         description: List of users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
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
router.get('/', authenticateToken, requireAdmin, (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const offset = (page - 1) * limit;
    // Get total count
    db.get('SELECT COUNT(*) as total FROM users', (err, countResult) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        const total = countResult.total;
        const totalPages = Math.ceil(total / limit);
        // Get users for current page
        db.all('SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?', [limit, offset], (err, users) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            res.json({
                users,
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
 * /users/search:
 *   get:
 *     summary: Search users
 *     tags: [Users]
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
 *           default: 10
 *         description: Number of users per page
 *     responses:
 *       200:
 *         description: Search results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
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
router.get('/search', authenticateToken, requireAdmin, (req, res) => {
    const query = req.query.q;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const offset = (page - 1) * limit;
    if (!query) {
        return res.status(400).json({ error: 'Search query is required' });
    }
    const searchTerm = `%${query}%`;
    // Get total count for search
    db.get('SELECT COUNT(*) as total FROM users WHERE name LIKE ? OR email LIKE ?', [searchTerm, searchTerm], (err, countResult) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        const total = countResult.total;
        const totalPages = Math.ceil(total / limit);
        // Get search results
        db.all('SELECT id, name, email, role, created_at FROM users WHERE name LIKE ? OR email LIKE ? ORDER BY created_at DESC LIMIT ? OFFSET ?', [searchTerm, searchTerm, limit, offset], (err, users) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            res.json({
                users,
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
 * /users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     responses:
 *       200:
 *         description: User details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         description: User not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:id', authenticateToken, requireAdmin, (req, res) => {
    const userId = parseInt(req.params.id);
    db.get('SELECT id, name, email, role, created_at FROM users WHERE id = ?', [userId], (err, user) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(user);
    });
});
/**
 * @swagger
 * /users:
 *   post:
 *     summary: Create new user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserCreateRequest'
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Validation error or user already exists
 *       401:
 *         description: Unauthorized
 */
router.post('/', authenticateToken, requireAdmin, (req, res) => {
    const { name, email, password, role = 'user' } = req.body;
    // Check if user already exists
    db.get('SELECT id FROM users WHERE email = ?', [email], (err, existingUser) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }
        // Hash password and create user
        bcrypt.hash(password, 10, (err, hashedPassword) => {
            if (err) {
                console.error('Password hashing error:', err);
                return res.status(500).json({ error: 'Password hashing error' });
            }
            db.run('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)', [name, email, hashedPassword, role], function (err) {
                if (err) {
                    console.error('User creation error:', err);
                    return res.status(500).json({ error: 'User creation failed' });
                }
                res.status(201).json({
                    id: this.lastID,
                    name,
                    email,
                    role,
                    created_at: new Date().toISOString()
                });
            });
        });
    });
});
/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: Update user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserUpdateRequest'
 *     responses:
 *       200:
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         description: User not found
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.put('/:id', authenticateToken, requireAdmin, validateRequest(userUpdateSchema), (req, res) => {
    const userId = parseInt(req.params.id);
    const { name, email, role } = req.body;
    // Check if user exists
    db.get('SELECT id FROM users WHERE id = ?', [userId], (err, existingUser) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        if (!existingUser) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Check if email is already taken by another user
        if (email) {
            db.get('SELECT id FROM users WHERE email = ? AND id != ?', [email, userId], (err, emailUser) => {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).json({ error: 'Database error' });
                }
                if (emailUser) {
                    return res.status(400).json({ error: 'Email already taken' });
                }
                updateUser();
            });
        }
        else {
            updateUser();
        }
        function updateUser() {
            const updateFields = [];
            const values = [];
            if (name) {
                updateFields.push('name = ?');
                values.push(name);
            }
            if (email) {
                updateFields.push('email = ?');
                values.push(email);
            }
            if (role) {
                updateFields.push('role = ?');
                values.push(role);
            }
            if (updateFields.length === 0) {
                res.status(400).json({ error: 'No fields to update' });
                return;
            }
            updateFields.push('updated_at = CURRENT_TIMESTAMP');
            values.push(userId);
            db.run(`UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`, values, function (err) {
                if (err) {
                    console.error('User update error:', err);
                    return res.status(500).json({ error: 'User update failed' });
                }
                // Get updated user
                db.get('SELECT id, name, email, role, created_at FROM users WHERE id = ?', [userId], (err, user) => {
                    if (err) {
                        console.error('Database error:', err);
                        return res.status(500).json({ error: 'Database error' });
                    }
                    res.json(user);
                });
            });
        }
    });
});
/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Delete user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       404:
 *         description: User not found
 *       401:
 *         description: Unauthorized
 */
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
    const userId = parseInt(req.params.id);
    // Prevent admin from deleting themselves
    if (userId === req.user?.id) {
        return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    db.run('DELETE FROM users WHERE id = ?', [userId], function (err) {
        if (err) {
            console.error('Database error:', err);
            res.status(500).json({ error: 'Database error' });
            return;
        }
        if (this.changes === 0) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        res.json({ message: 'User deleted successfully' });
    });
});
// Configure multer for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
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
 * /api/users/import-excel:
 *   post:
 *     summary: Import users from Excel file
 *     tags: [Users]
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
 *         description: Users imported successfully
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
router.post('/import-excel', authenticateToken, requireAdmin, upload.single('file'), async (req, res) => {
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
        const nameIndex = headers.findIndex(h => h.toLowerCase() === 'name');
        const emailIndex = headers.findIndex(h => h.toLowerCase() === 'email');
        if (nameIndex === -1 || emailIndex === -1) {
            return res.status(400).json({
                error: 'Excel file must contain "name" and "email" columns'
            });
        }
        const validUsers = [];
        const errors = [];
        let duplicates = 0;
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            // Skip empty rows
            if (!row[nameIndex] && !row[emailIndex]) {
                continue;
            }
            const name = row[nameIndex]?.toString().trim();
            const email = row[emailIndex]?.toString().trim();
            // Validate required fields
            if (!name) {
                errors.push(`Row ${i + 2}: Name is required`);
                continue;
            }
            if (!email) {
                errors.push(`Row ${i + 2}: Email is required`);
                continue;
            }
            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                errors.push(`Row ${i + 2}: Invalid email format`);
                continue;
            }
            // Check for duplicate email
            const existingUser = await new Promise((resolve, reject) => {
                db.get('SELECT id FROM users WHERE email = ?', [email], (err, row) => {
                    if (err)
                        reject(err);
                    else
                        resolve(row);
                });
            });
            if (existingUser) {
                duplicates++;
                continue;
            }
            // Build user object (only include columns that exist in database)
            const user = {
                name,
                email,
                role: 'user',
                password: await bcrypt.hash('defaultpassword123', 10), // Default password
                created_at: new Date().toISOString(),
            };
            validUsers.push(user);
        }
        // Insert valid users
        let importedCount = 0;
        for (const user of validUsers) {
            try {
                await new Promise((resolve, reject) => {
                    db.run('INSERT INTO users (name, email, role, password, created_at) VALUES (?, ?, ?, ?, ?)', [user.name, user.email, user.role, user.password, user.created_at], function (err) {
                        if (err)
                            reject(err);
                        else
                            resolve(this);
                    });
                });
                importedCount++;
            }
            catch (error) {
                errors.push(`Failed to import user ${user.name}: ${error}`);
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
/**
 * @swagger
 * /api/users/roles:
 *   get:
 *     summary: Get available roles and permissions
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Available roles and permissions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 roles:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       role:
 *                         type: string
 *                       description:
 *                         type: string
 *                       permissions:
 *                         type: array
 *                         items:
 *                           type: string
 *       401:
 *         description: Unauthorized
 */
router.get('/roles', authenticateToken, (req, res) => {
    const roles = {
        admin: {
            role: 'admin',
            description: 'Full system access',
            permissions: [
                'users.read', 'users.create', 'users.update', 'users.delete', 'users.import',
                'easypay.read', 'easypay.create', 'easypay.update', 'easypay.delete', 'easypay.import',
                'dashboard.read', 'settings.read', 'settings.update',
                'roles.read', 'roles.create', 'roles.update', 'roles.delete'
            ]
        },
        manager: {
            role: 'manager',
            description: 'Management access with limited admin functions',
            permissions: [
                'users.read', 'users.create', 'users.update', 'users.import',
                'easypay.read', 'easypay.create', 'easypay.update', 'easypay.import',
                'dashboard.read', 'settings.read'
            ]
        },
        user: {
            role: 'user',
            description: 'Standard user access',
            permissions: [
                'users.read', 'easypay.read', 'easypay.create', 'dashboard.read'
            ]
        },
        viewer: {
            role: 'viewer',
            description: 'Read-only access',
            permissions: [
                'users.read', 'easypay.read', 'dashboard.read'
            ]
        }
    };
    res.json({ roles });
});
export default router;
//# sourceMappingURL=users.js.map