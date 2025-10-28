import express from 'express';
import { db } from '../database/init.js';
const router = express.Router();
/**
 * Get all settings
 */
router.get('/', (req, res) => {
    db.all('SELECT * FROM settings ORDER BY key ASC', [], (err, rows) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        const settings = {};
        rows.forEach(row => {
            settings[row.key] = {
                value: row.value === 'true',
                description: row.description
            };
        });
        res.json({ settings });
    });
});
/**
 * Get a specific setting
 */
router.get('/:key', (req, res) => {
    const { key } = req.params;
    db.get('SELECT * FROM settings WHERE key = ?', [key], (err, row) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        if (!row) {
            return res.status(404).json({ error: 'Setting not found' });
        }
        res.json({
            key: row.key,
            value: row.value === 'true',
            description: row.description
        });
    });
});
/**
 * Update a setting
 */
router.put('/:key', (req, res) => {
    const { key } = req.params;
    const { value } = req.body;
    if (typeof value !== 'boolean') {
        return res.status(400).json({ error: 'Value must be a boolean' });
    }
    db.run('UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?', [value.toString(), key], function (err) {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Failed to update setting' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Setting not found' });
        }
        res.json({ key, value, message: 'Setting updated successfully' });
    });
});
export default router;
//# sourceMappingURL=settings.js.map