import express from 'express';
import { dbAll, dbGet, dbRun } from '../database/db.js';

const router = express.Router();

/**
 * Get all settings
 */
router.get('/', async (req, res) => {
    try {
        const rows: any[] = await dbAll('SELECT * FROM settings ORDER BY key ASC', []);
        const settings: any = {};
        rows.forEach(row => {
            settings[row.key] = {
                value: row.value === 'true',
                description: row.description
            };
        });
        res.json({ settings });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

/**
 * Get a specific setting
 */
router.get('/:key', async (req, res) => {
    const { key } = req.params;
    try {
        const row: any = await dbGet('SELECT * FROM settings WHERE key = ?', [key]);
        if (!row) {
            return res.status(404).json({ error: 'Setting not found' });
        }
        res.json({
            key: row.key,
            value: row.value === 'true',
            description: row.description
        });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

/**
 * Update a setting
 */
router.put('/:key', async (req, res) => {
    const { key } = req.params;
    const { value } = req.body;

    if (typeof value !== 'boolean') {
        return res.status(400).json({ error: 'Value must be a boolean' });
    }

    try {
        // Check if setting exists, if not create it
        const existing = await dbGet('SELECT * FROM settings WHERE key = ?', [key]);
        if (!existing) {
            await dbRun('INSERT INTO settings (key, value) VALUES (?, ?)', [key, value.toString()]);
        } else {
            await dbRun('UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?', [value.toString(), key]);
        }
        res.json({ key, value, message: 'Setting updated successfully' });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Failed to update setting' });
    }
});

export default router;

