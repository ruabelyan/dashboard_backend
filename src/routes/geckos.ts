import express from 'express';
import { dbAll, dbGet, dbRun } from '../database/db.js';

const router = express.Router();

/**
 * @openapi
 * /api/geckos:
 *   get:
 *     tags:
 *       - Geckos
 *     summary: List geckos
 *     description: Returns a list of geckos. Public endpoint.
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category id. Use 'all' for all categories
 *       - in: query
 *         name: available_only
 *         schema:
 *           type: boolean
 *         description: When true, only returns available geckos
 *     responses:
 *       200:
 *         description: List of geckos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 geckos:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: integer }
 *                       name: { type: string }
 *                       species: { type: string }
 *                       morph: { type: string, nullable: true }
 *                       price: { type: number }
 *                       image: { type: string, nullable: true }
 *                       age: { type: string, nullable: true }
 *                       gender: { type: string, nullable: true }
 *                       description: { type: string, nullable: true }
 *                       available: { type: integer }
 *                       category: { type: string, nullable: true }
 */
router.get('/', async (req, res) => {
    const { category, available_only } = req.query;
    let query = 'SELECT * FROM geckos WHERE 1=1';
    const params: any[] = [];
    if (category && category !== 'all') {
        query += ' AND category = ?';
        params.push(category);
    }
    if (available_only === 'true') {
        query += ' AND available = 1';
    }
    query += ' ORDER BY id ASC';
    try {
        const geckos = await dbAll(query, params);
        res.json({ geckos: geckos || [] });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

/**
 * @openapi
 * /api/geckos/{id}:
 *   get:
 *     tags:
 *       - Geckos
 *     summary: Get gecko by id
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Gecko item
 *       404:
 *         description: Gecko not found
 */
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const gecko = await dbGet('SELECT * FROM geckos WHERE id = ?', [id]);
        if (!gecko) return res.status(404).json({ error: 'Gecko not found' });
        res.json({ gecko });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

/**
 * @openapi
 * /api/geckos/categories/all:
 *   get:
 *     tags:
 *       - Geckos
 *     summary: List gecko categories (derived)
 *     responses:
 *       200:
 *         description: List of categories
 */
router.get('/categories/all', async (req, res) => {
    try {
        const rows: any[] = await dbAll('SELECT DISTINCT category FROM geckos', []);
        const categoryNames: Record<string, string> = {
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
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

/**
 * @openapi
 * /api/geckos:
 *   post:
 *     tags:
 *       - Geckos
 *     summary: Create gecko (admin)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               species: { type: string }
 *               morph: { type: string }
 *               price: { type: number }
 *               image: { type: string }
 *               age: { type: string }
 *               gender: { type: string }
 *               description: { type: string }
 *               available: { type: integer }
 *               category: { type: string }
 *               show_on_web: { type: integer }
 *     responses:
 *       201:
 *         description: Created gecko
 */
router.post('/', async (req, res) => {
    const { name, species, morph, price, image, age, gender, description, available, category, show_on_web } = req.body;

    if (!name || !species || !price) {
        return res.status(400).json({ error: 'Name, species, and price are required' });
    }

    try {
        const result = await dbRun(
            'INSERT INTO geckos (name, species, morph, price, image, age, gender, description, available, category, show_on_web) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [name, species, morph, price, image, age, gender, description, available || 1, category, show_on_web !== undefined ? show_on_web : 1]
        );
        const gecko = result.lastID
            ? await dbGet('SELECT * FROM geckos WHERE id = ?', [result.lastID])
            : await dbGet('SELECT * FROM geckos ORDER BY id DESC LIMIT 1', []);
        res.status(201).json({ gecko });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Failed to create gecko' });
    }
});

/**
 * @openapi
 * /api/geckos/{id}:
 *   put:
 *     tags:
 *       - Geckos
 *     summary: Update gecko (admin)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Updated gecko
 *       404:
 *         description: Not found
 */
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, species, morph, price, image, age, gender, description, available, category, show_on_web } = req.body;
    try {
        const gecko: any = await dbGet('SELECT * FROM geckos WHERE id = ?', [id]);
        if (!gecko) return res.status(404).json({ error: 'Gecko not found' });
        await dbRun(
            'UPDATE geckos SET name = ?, species = ?, morph = ?, price = ?, image = ?, age = ?, gender = ?, description = ?, available = ?, category = ?, show_on_web = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [
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
                show_on_web !== undefined ? show_on_web : (gecko as any).show_on_web,
                id
            ]
        );
        const updatedGecko = await dbGet('SELECT * FROM geckos WHERE id = ?', [id]);
        res.json({ gecko: updatedGecko });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Failed to update gecko' });
    }
});

/**
 * @openapi
 * /api/geckos/{id}:
 *   delete:
 *     tags:
 *       - Geckos
 *     summary: Delete gecko (admin)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Deleted
 *       404:
 *         description: Not found
 */
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const gecko = await dbGet('SELECT * FROM geckos WHERE id = ?', [id]);
        if (!gecko) return res.status(404).json({ error: 'Gecko not found' });
        await dbRun('DELETE FROM geckos WHERE id = ?', [id]);
        res.json({ message: 'Gecko deleted successfully' });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Failed to delete gecko' });
    }
});

export default router;

