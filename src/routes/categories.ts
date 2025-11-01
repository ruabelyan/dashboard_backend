import express from 'express';
import { dbAll, dbGet, dbRun } from '../database/db.js';

const router = express.Router();

/**
 * Get all categories
 */
router.get('/', async (req, res) => {
    try {
        const rows: any[] = await dbAll('SELECT * FROM categories ORDER BY name ASC', []);
        const categories = [
            { id: 'all', name: 'All Species', isDefault: true, image: null },
            ...rows.map(row => ({
                id: row.id,
                name: row.name,
                isDefault: false,
                description: row.description,
                image: row.image || null
            }))
        ];
        res.json({ categories });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

/**
 * Create a new category
 */
router.post('/', async (req, res) => {
    const { id, name, description, image } = req.body;

    if (!id || !name) {
        return res.status(400).json({ error: 'ID and name are required' });
    }

    try {
        await dbRun('INSERT INTO categories (id, name, description, image, is_default) VALUES (?, ?, ?, ?, ?)', [id, name, description, image || null, 0]);
        const category = await dbGet('SELECT * FROM categories WHERE id = ?', [id]);
        res.status(201).json({ category });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Failed to create category' });
    }
});

/**
 * Update category
 */
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, description, image } = req.body;

    try {
        const category: any = await dbGet('SELECT * FROM categories WHERE id = ?', [id]);
        if (!category) return res.status(404).json({ error: 'Category not found' });
        await dbRun('UPDATE categories SET name = ?, description = ?, image = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
            name || category.name,
            description !== undefined ? description : category.description,
            image !== undefined ? image : category.image,
            id
        ]);
        const updatedCategory = await dbGet('SELECT * FROM categories WHERE id = ?', [id]);
        res.json({ category: updatedCategory });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

/**
 * Delete category
 */
router.delete('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const category: any = await dbGet('SELECT * FROM categories WHERE id = ?', [id]);
        if (!category) return res.status(404).json({ error: 'Category not found' });
        await dbRun('UPDATE geckos SET category = NULL, updated_at = CURRENT_TIMESTAMP WHERE category = ?', [id]);
        await dbRun('DELETE FROM categories WHERE id = ?', [id]);
        res.json({ message: 'Category deleted successfully' });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

/**
 * Get geckos by category
 */
router.get('/:id/geckos', async (req, res) => {
    const { id } = req.params;
    try {
        const geckos = await dbAll('SELECT * FROM geckos WHERE category = ? ORDER BY id ASC', [id]);
        res.json({ geckos: geckos || [] });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

export default router;

