import express from 'express';
import { db } from '../database/init.js';
import { authenticateToken } from '../middleware/auth.js';
const router = express.Router();
/**
 * Get all applications for the authenticated user
 */
router.get('/', authenticateToken, (req, res) => {
    const userId = req.user?.id;
    db.all('SELECT * FROM applications WHERE user_id = ? ORDER BY created_at DESC', [userId], (err, applications) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json({ applications });
    });
});
/**
 * Get a specific application
 */
router.get('/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const userId = req.user?.id;
    db.get('SELECT * FROM applications WHERE id = ? AND user_id = ?', [id, userId], (err, application) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        if (!application) {
            return res.status(404).json({ error: 'Application not found' });
        }
        res.json({ application });
    });
});
/**
 * Create a new application
 */
router.post('/', authenticateToken, (req, res) => {
    const userId = req.user?.id;
    const { name, description, type, path, url, domain } = req.body;
    if (!name) {
        return res.status(400).json({ error: 'Name is required' });
    }
    db.run('INSERT INTO applications (user_id, name, description, type, path, url, domain) VALUES (?, ?, ?, ?, ?, ?, ?)', [userId, name, description, type || 'react', path, url, domain], function (err) {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Failed to create application' });
        }
        db.get('SELECT * FROM applications WHERE id = ?', [this.lastID], (err, application) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            res.status(201).json({ application });
        });
    });
});
/**
 * Update an application
 */
router.put('/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const userId = req.user?.id;
    const { name, description, type, status, path, url, domain } = req.body;
    db.get('SELECT * FROM applications WHERE id = ? AND user_id = ?', [id, userId], (err, app) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        if (!app) {
            return res.status(404).json({ error: 'Application not found' });
        }
        db.run('UPDATE applications SET name = ?, description = ?, type = ?, status = ?, path = ?, url = ?, domain = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?', [name || app.name, description !== undefined ? description : app.description, type || app.type, status || app.status, path, url, domain, id, userId], (err) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Failed to update application' });
            }
            db.get('SELECT * FROM applications WHERE id = ?', [id], (err, application) => {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).json({ error: 'Database error' });
                }
                res.json({ application });
            });
        });
    });
});
/**
 * Delete an application
 */
router.delete('/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const userId = req.user?.id;
    db.get('SELECT * FROM applications WHERE id = ? AND user_id = ?', [id, userId], (err, app) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        if (!app) {
            return res.status(404).json({ error: 'Application not found' });
        }
        db.run('DELETE FROM applications WHERE id = ? AND user_id = ?', [id, userId], (err) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Failed to delete application' });
            }
            res.json({ message: 'Application deleted successfully' });
        });
    });
});
/**
 * Get all projects for a specific application
 */
router.get('/:id/projects', authenticateToken, (req, res) => {
    const { id } = req.params;
    const userId = req.user?.id;
    // Check if application exists and belongs to user
    db.get('SELECT * FROM applications WHERE id = ? AND user_id = ?', [id, userId], (err, application) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        if (!application) {
            return res.status(404).json({ error: 'Application not found' });
        }
        // Get projects for this application
        db.all('SELECT * FROM projects WHERE application_id = ? ORDER BY created_at DESC', [id], (err, projects) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            res.json({ projects: projects || [] });
        });
    });
});
/**
 * Get a specific project
 */
router.get('/:id/projects/:projectId', authenticateToken, (req, res) => {
    const { id, projectId } = req.params;
    const userId = req.user?.id;
    db.get('SELECT p.* FROM projects p INNER JOIN applications a ON p.application_id = a.id WHERE p.id = ? AND p.application_id = ? AND a.user_id = ?', [projectId, id, userId], (err, project) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }
        res.json({ project });
    });
});
/**
 * Create a new project
 */
router.post('/:id/projects', authenticateToken, (req, res) => {
    const { id } = req.params;
    const userId = req.user?.id;
    const { name, version, description, path, url } = req.body;
    if (!name) {
        return res.status(400).json({ error: 'Name is required' });
    }
    // Check if application exists and belongs to user
    db.get('SELECT * FROM applications WHERE id = ? AND user_id = ?', [id, userId], (err, application) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        if (!application) {
            return res.status(404).json({ error: 'Application not found' });
        }
        db.run('INSERT INTO projects (application_id, name, version, description, path, url, status) VALUES (?, ?, ?, ?, ?, ?, ?)', [id, name, version || '1.0.0', description, path, url, 'active'], function (err) {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Failed to create project' });
            }
            db.get('SELECT * FROM projects WHERE id = ?', [this.lastID], (err, project) => {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).json({ error: 'Database error' });
                }
                res.status(201).json({ project });
            });
        });
    });
});
/**
 * Update a project
 */
router.put('/:id/projects/:projectId', authenticateToken, (req, res) => {
    const { id, projectId } = req.params;
    const userId = req.user?.id;
    const { name, version, description, status, path, url } = req.body;
    db.get('SELECT p.* FROM projects p INNER JOIN applications a ON p.application_id = a.id WHERE p.id = ? AND p.application_id = ? AND a.user_id = ?', [projectId, id, userId], (err, project) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }
        db.run('UPDATE projects SET name = ?, version = ?, description = ?, status = ?, path = ?, url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [name || project.name, version || project.version, description !== undefined ? description : project.description, status || project.status, path, url, projectId], (err) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Failed to update project' });
            }
            db.get('SELECT * FROM projects WHERE id = ?', [projectId], (err, updatedProject) => {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).json({ error: 'Database error' });
                }
                res.json({ project: updatedProject });
            });
        });
    });
});
/**
 * Delete a project
 */
router.delete('/:id/projects/:projectId', authenticateToken, (req, res) => {
    const { id, projectId } = req.params;
    const userId = req.user?.id;
    db.get('SELECT p.* FROM projects p INNER JOIN applications a ON p.application_id = a.id WHERE p.id = ? AND p.application_id = ? AND a.user_id = ?', [projectId, id, userId], (err, project) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }
        db.run('DELETE FROM projects WHERE id = ?', [projectId], (err) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Failed to delete project' });
            }
            res.json({ message: 'Project deleted successfully' });
        });
    });
});
export default router;
//# sourceMappingURL=applications.js.map