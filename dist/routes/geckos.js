import express from 'express';
import { db } from '../database/init.js';
const router = express.Router();
/**
 * Get all geckos (public endpoint - no auth required)
 */
router.get('/', (req, res) => {
    const { category, available_only } = req.query;
    let query = 'SELECT * FROM geckos WHERE 1=1';
    const params = [];
    if (category && category !== 'all') {
        query += ' AND category = ?';
        params.push(category);
    }
    if (available_only === 'true') {
        query += ' AND available = 1';
    }
    query += ' ORDER BY id ASC';
    db.all(query, params, (err, geckos) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json({ geckos: geckos || [] });
    });
});
/**
 * Get a specific gecko by ID
 */
router.get('/:id', (req, res) => {
    const { id } = req.params;
    db.get('SELECT * FROM geckos WHERE id = ?', [id], (err, gecko) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        if (!gecko) {
            return res.status(404).json({ error: 'Gecko not found' });
        }
        res.json({ gecko });
    });
});
/**
 * Get all categories
 */
router.get('/categories/all', (req, res) => {
    db.all('SELECT DISTINCT category FROM geckos', [], (err, rows) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        const categoryNames = {
            'macularius': 'Leopard Geckos',
            'angramainyu': 'Iraqi Geckos',
            'fuscus': 'E. fuscus',
            'hardwickii': 'E. hardwickii'
        };
        const categories = [
            { id: 'all', name: 'All Species' },
            ...rows.map(row => ({
                id: row.category,
                name: categoryNames[row.category] || row.category.charAt(0).toUpperCase() + row.category.slice(1)
            }))
        ];
        res.json({ categories });
    });
});
/**
 * Create a new gecko (admin only - would add auth middleware)
 */
router.post('/', (req, res) => {
    const { name, species, morph, price, image, age, gender, description, available, category, show_on_web } = req.body;
    if (!name || !species || !price) {
        return res.status(400).json({ error: 'Name, species, and price are required' });
    }
    db.run('INSERT INTO geckos (name, species, morph, price, image, age, gender, description, available, category, show_on_web) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [name, species, morph, price, image, age, gender, description, available || 1, category, show_on_web !== undefined ? show_on_web : 1], function (err) {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Failed to create gecko' });
        }
        db.get('SELECT * FROM geckos WHERE id = ?', [this.lastID], (err, gecko) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            res.status(201).json({ gecko });
        });
    });
});
/**
 * Update a gecko (admin only)
 */
router.put('/:id', (req, res) => {
    const { id } = req.params;
    const { name, species, morph, price, image, age, gender, description, available, category, show_on_web } = req.body;
    db.get('SELECT * FROM geckos WHERE id = ?', [id], (err, gecko) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        if (!gecko) {
            return res.status(404).json({ error: 'Gecko not found' });
        }
        db.run('UPDATE geckos SET name = ?, species = ?, morph = ?, price = ?, image = ?, age = ?, gender = ?, description = ?, available = ?, category = ?, show_on_web = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
            name || gecko.name,
            species || gecko.species,
            morph !== undefined ? morph : gecko.morph,
            price !== undefined ? price : gecko.price,
            image !== undefined ? image : gecko.image,
            age !== undefined ? age : gecko.age,
            gender !== undefined ? gender : gecko.gender,
            description !== undefined ? description : gecko.description,
            available !== undefined ? available : gecko.available,
            category !== undefined ? category : gecko.category,
            show_on_web !== undefined ? show_on_web : gecko.show_on_web,
            id
        ], (err) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Failed to update gecko' });
            }
            db.get('SELECT * FROM geckos WHERE id = ?', [id], (err, updatedGecko) => {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).json({ error: 'Database error' });
                }
                res.json({ gecko: updatedGecko });
            });
        });
    });
});
/**
 * Delete a gecko (admin only)
 */
router.delete('/:id', (req, res) => {
    const { id } = req.params;
    db.get('SELECT * FROM geckos WHERE id = ?', [id], (err, gecko) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        if (!gecko) {
            return res.status(404).json({ error: 'Gecko not found' });
        }
        db.run('DELETE FROM geckos WHERE id = ?', [id], (err) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Failed to delete gecko' });
            }
            res.json({ message: 'Gecko deleted successfully' });
        });
    });
});
export default router;
//# sourceMappingURL=geckos.js.map