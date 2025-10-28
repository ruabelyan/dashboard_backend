import express from 'express';
import { db } from '../database/init.js';
const router = express.Router();
/**
 * Get all categories
 */
router.get('/', (req, res) => {
    db.all('SELECT * FROM categories ORDER BY name ASC', [], (err, rows) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        // Add "All Species" at the beginning
        const categories = [
            { id: 'all', name: 'All Species', isDefault: true, image: null },
            ...rows.map(row => ({
                id: row.id,
                name: row.name,
                isDefault: false, // All categories from database are editable/deletable
                description: row.description,
                image: row.image || null
            }))
        ];
        res.json({ categories });
    });
});
/**
 * Create a new category
 */
router.post('/', (req, res) => {
    const { id, name, description, image } = req.body;
    if (!id || !name) {
        return res.status(400).json({ error: 'ID and name are required' });
    }
    db.run('INSERT INTO categories (id, name, description, image, is_default) VALUES (?, ?, ?, ?, ?)', [id, name, description, image || null, 0], function (err) {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Failed to create category' });
        }
        db.get('SELECT * FROM categories WHERE id = ?', [id], (err, category) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            res.status(201).json({ category });
        });
    });
});
/**
 * Update category
 */
router.put('/:id', (req, res) => {
    const { id } = req.params;
    const { name, description, image } = req.body;
    db.get('SELECT * FROM categories WHERE id = ?', [id], (err, category) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }
        db.run('UPDATE categories SET name = ?, description = ?, image = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
            name || category.name,
            description !== undefined ? description : category.description,
            image !== undefined ? image : category.image,
            id
        ], (err) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Failed to update category' });
            }
            db.get('SELECT * FROM categories WHERE id = ?', [id], (err, updatedCategory) => {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).json({ error: 'Database error' });
                }
                res.json({ category: updatedCategory });
            });
        });
    });
});
/**
 * Delete category
 */
router.delete('/:id', (req, res) => {
    const { id } = req.params;
    db.get('SELECT * FROM categories WHERE id = ?', [id], (err, category) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }
        // Allow deletion of all categories (only "all" is protected in frontend)
        // Remove category from all geckos
        db.run('UPDATE geckos SET category = NULL, updated_at = CURRENT_TIMESTAMP WHERE category = ?', [id], (err) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Failed to remove category from geckos' });
            }
            // Delete the category
            db.run('DELETE FROM categories WHERE id = ?', [id], (err) => {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).json({ error: 'Failed to delete category' });
                }
                res.json({ message: 'Category deleted successfully' });
            });
        });
    });
});
/**
 * Get geckos by category
 */
router.get('/:id/geckos', (req, res) => {
    const { id } = req.params;
    db.all('SELECT * FROM geckos WHERE category = ? ORDER BY id ASC', [id], (err, geckos) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json({ geckos: geckos || [] });
    });
});
export default router;
//# sourceMappingURL=categories.js.map