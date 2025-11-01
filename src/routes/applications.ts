import express from 'express';
import { dbAll, dbGet, dbRun } from '../database/db.js';
import { authenticateToken, type AuthRequest } from '../middleware/auth.js';

const router = express.Router();

/**
 * Get all applications for the authenticated user
 */
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
    const userId = req.user?.id;
    try {
        const applications = await dbAll('SELECT * FROM applications WHERE user_id = ? ORDER BY created_at DESC', [userId]);
        res.json({ applications });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

/**
 * Get a specific application
 */
router.get('/:id', authenticateToken, async (req: AuthRequest, res) => {
    const { id } = req.params;
    const userId = req.user?.id;
    try {
        const application = await dbGet('SELECT * FROM applications WHERE id = ? AND user_id = ?', [id, userId]);
        if (!application) {
            return res.status(404).json({ error: 'Application not found' });
        }
        res.json({ application });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

/**
 * Create a new application
 */
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
    const userId = req.user?.id;
    const { name, description, type, path, url, domain } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'Name is required' });
    }

    try {
        const result = await dbRun('INSERT INTO applications (user_id, name, description, type, path, url, domain) VALUES (?, ?, ?, ?, ?, ?, ?)', [userId, name, description, type || 'react', path, url, domain]);
        const application = result.lastID
            ? await dbGet('SELECT * FROM applications WHERE id = ?', [result.lastID])
            : await dbGet('SELECT * FROM applications WHERE user_id = ? ORDER BY id DESC LIMIT 1', [userId]);
        res.status(201).json({ application });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Failed to create application' });
    }
});

/**
 * Update an application
 */
router.put('/:id', authenticateToken, async (req: AuthRequest, res) => {
    const { id } = req.params;
    const userId = req.user?.id;
    const { name, description, type, status, path, url, domain, leader_id } = req.body;

    try {
        const app: any = await dbGet('SELECT * FROM applications WHERE id = ? AND user_id = ?', [id, userId]);
        if (!app) {
            return res.status(404).json({ error: 'Application not found' });
        }

        await dbRun(
            'UPDATE applications SET name = ?, description = ?, type = ?, status = ?, path = ?, url = ?, domain = ?, leader_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
            [name || app.name, description !== undefined ? description : app.description, type || app.type, status || app.status, path, url, domain, leader_id !== undefined ? leader_id : app.leader_id, id, userId]
        );

        const application = await dbGet('SELECT * FROM applications WHERE id = ?', [id]);
        res.json({ application });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Failed to update application' });
    }
});

/**
 * Delete an application
 */
router.delete('/:id', authenticateToken, async (req: AuthRequest, res) => {
    const { id } = req.params;
    const userId = req.user?.id;

    try {
        const app = await dbGet('SELECT * FROM applications WHERE id = ? AND user_id = ?', [id, userId]);
        if (!app) {
            return res.status(404).json({ error: 'Application not found' });
        }

        await dbRun('DELETE FROM applications WHERE id = ? AND user_id = ?', [id, userId]);
        res.json({ message: 'Application deleted successfully' });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Failed to delete application' });
    }
});

/**
 * Get all projects for a specific application
 */
router.get('/:id/projects', authenticateToken, async (req: AuthRequest, res) => {
    const { id } = req.params;
    const userId = req.user?.id;

    try {
        const application = await dbGet('SELECT * FROM applications WHERE id = ? AND user_id = ?', [id, userId]);
        if (!application) {
            return res.status(404).json({ error: 'Application not found' });
        }

        const projects = await dbAll('SELECT * FROM projects WHERE application_id = ? ORDER BY created_at DESC', [id]);
        res.json({ projects: projects || [] });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

/**
 * Get a specific project
 */
router.get('/:id/projects/:projectId', authenticateToken, async (req: AuthRequest, res) => {
    const { id, projectId } = req.params;
    const userId = req.user?.id;

    try {
        const project = await dbGet(
            'SELECT p.* FROM projects p INNER JOIN applications a ON p.application_id = a.id WHERE p.id = ? AND p.application_id = ? AND a.user_id = ?',
            [projectId, id, userId]
        );
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }
        res.json({ project });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

/**
 * Create a new project
 */
router.post('/:id/projects', authenticateToken, async (req: AuthRequest, res) => {
    const { id } = req.params;
    const userId = req.user?.id;
    const { name, version, description, path, url } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'Name is required' });
    }

    try {
        const application = await dbGet('SELECT * FROM applications WHERE id = ? AND user_id = ?', [id, userId]);
        if (!application) {
            return res.status(404).json({ error: 'Application not found' });
        }

        const result = await dbRun(
            'INSERT INTO projects (application_id, name, version, description, path, url, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [id, name, version || '1.0.0', description, path, url, 'active']
        );
        const project = result.lastID
            ? await dbGet('SELECT * FROM projects WHERE id = ?', [result.lastID])
            : await dbGet('SELECT * FROM projects WHERE application_id = ? ORDER BY id DESC LIMIT 1', [id]);
        res.status(201).json({ project });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Failed to create project' });
    }
});

/**
 * Update a project
 */
router.put('/:id/projects/:projectId', authenticateToken, async (req: AuthRequest, res) => {
    const { id, projectId } = req.params;
    const userId = req.user?.id;
    const { name, version, description, status, path, url } = req.body;

    try {
        const project: any = await dbGet(
            'SELECT p.* FROM projects p INNER JOIN applications a ON p.application_id = a.id WHERE p.id = ? AND p.application_id = ? AND a.user_id = ?',
            [projectId, id, userId]
        );
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        await dbRun(
            'UPDATE projects SET name = ?, version = ?, description = ?, status = ?, path = ?, url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [name || project.name, version || project.version, description !== undefined ? description : project.description, status || project.status, path, url, projectId]
        );

        const updatedProject = await dbGet('SELECT * FROM projects WHERE id = ?', [projectId]);
        res.json({ project: updatedProject });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Failed to update project' });
    }
});

/**
 * Delete a project
 */
router.delete('/:id/projects/:projectId', authenticateToken, async (req: AuthRequest, res) => {
    const { id, projectId } = req.params;
    const userId = req.user?.id;

    try {
        const project = await dbGet(
            'SELECT p.* FROM projects p INNER JOIN applications a ON p.application_id = a.id WHERE p.id = ? AND p.application_id = ? AND a.user_id = ?',
            [projectId, id, userId]
        );
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        await dbRun('DELETE FROM projects WHERE id = ?', [projectId]);
        res.json({ message: 'Project deleted successfully' });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Failed to delete project' });
    }
});

export default router;
