import express from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../database/init.js';
import { generateToken, authenticateToken } from '../middleware/auth.js';
import { loginSchema, registerSchema, validateRequest } from '../middleware/validation.js';
import { AppError, ValidationError, ConflictError, DatabaseError } from '../utils/errors.js';
const router = express.Router();
/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         name:
 *           type: string
 *         email:
 *           type: string
 *         role:
 *           type: string
 *         created_at:
 *           type: string
 *           format: date-time
 *     LoginRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *         password:
 *           type: string
 *           minLength: 6
 *     RegisterRequest:
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
 *     AuthResponse:
 *       type: object
 *       properties:
 *         token:
 *           type: string
 *         user:
 *           $ref: '#/components/schemas/User'
 */
/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: User login
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Invalid credentials
 *       401:
 *         description: Authentication failed
 */
router.post('/login', validateRequest(loginSchema), (req, res, next) => {
    const { email, password } = req.body;
    console.log(`Login attempt for email: ${email}`);
    db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
        if (err) {
            console.error('Database error:', err);
            return next(new DatabaseError('Failed to authenticate user'));
        }
        if (!user) {
            console.log(`User not found: ${email}`);
            return next(new AppError('Invalid credentials', 401));
        }
        console.log(`User found: ${user.name} (${user.email})`);
        bcrypt.compare(password, user.password, (err, isMatch) => {
            if (err) {
                console.error('Password comparison error:', err);
                return next(new DatabaseError('Authentication failed'));
            }
            if (!isMatch) {
                console.log(`Password mismatch for user: ${email}`);
                return next(new AppError('Invalid credentials', 401));
            }
            console.log(`Login successful for user: ${user.name}`);
            const token = generateToken({
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role
            });
            res.json({
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    created_at: user.created_at
                }
            });
        });
    });
});
/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: User registration
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Validation error or user already exists
 */
router.post('/register', validateRequest(registerSchema), (req, res, next) => {
    const { name, email, password } = req.body;
    console.log(`Registration attempt for email: ${email}`);
    // Check if user already exists
    db.get('SELECT id FROM users WHERE email = ?', [email], (err, existingUser) => {
        if (err) {
            console.error('Database error:', err);
            return next(new DatabaseError('Failed to check user existence'));
        }
        if (existingUser) {
            console.log(`User already exists: ${email}`);
            return next(new ConflictError('User already exists'));
        }
        // Hash password and create user
        bcrypt.hash(password, 10, (err, hashedPassword) => {
            if (err) {
                console.error('Password hashing error:', err);
                return next(new DatabaseError('Failed to hash password'));
            }
            db.run('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', [name, email, hashedPassword], function (err) {
                if (err) {
                    console.error('User creation error:', err);
                    return next(new DatabaseError('Failed to create user'));
                }
                console.log(`User created successfully: ${name} (${email})`);
                const token = generateToken({
                    id: this.lastID,
                    email,
                    name,
                    role: 'user'
                });
                res.status(201).json({
                    token,
                    user: {
                        id: this.lastID,
                        name,
                        email,
                        role: 'user',
                        created_at: new Date().toISOString()
                    }
                });
            });
        });
    });
});
/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user information
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 */
router.get('/me', authenticateToken, (req, res) => {
    console.log(`Get current user request from: ${req.user?.email}`);
    res.json({
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role
    });
});
/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: User logout
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 */
router.post('/logout', authenticateToken, (req, res) => {
    console.log(`Logout request from: ${req.user?.email}`);
    // In a stateless JWT system, logout is handled client-side
    // by removing the token from storage
    res.json({ message: 'Logout successful' });
});
/**
 * @swagger
 * /auth/test-login:
 *   post:
 *     summary: Test login with default admin credentials
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Test login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       500:
 *         description: Server error
 */
router.post('/test-login', (req, res) => {
    console.log('Test login attempt with default admin credentials');
    const testCredentials = {
        email: 'admin@easypay.com',
        password: 'admin123'
    };
    db.get('SELECT * FROM users WHERE email = ?', [testCredentials.email], (err, user) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        if (!user) {
            console.log('Default admin user not found');
            return res.status(500).json({ error: 'Default admin user not found. Please run database initialization.' });
        }
        bcrypt.compare(testCredentials.password, user.password, (err, isMatch) => {
            if (err) {
                console.error('Password comparison error:', err);
                return res.status(500).json({ error: 'Authentication error' });
            }
            if (!isMatch) {
                console.log('Default admin password mismatch');
                return res.status(500).json({ error: 'Default admin password mismatch' });
            }
            console.log('Test login successful');
            const token = generateToken({
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role
            });
            res.json({
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    created_at: user.created_at
                },
                message: 'Test login successful! You can now use this token for authenticated requests.'
            });
        });
    });
});
export default router;
//# sourceMappingURL=auth.js.map