import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import bcrypt from 'bcryptjs';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = process.env.DB_PATH || path.join(__dirname, '../../data/database.sqlite');
// Ensure data directory exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}
export const db = new sqlite3.Database(dbPath);
export async function initializeDatabase() {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // Users table
            db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          role TEXT DEFAULT 'user',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
            // EasyPay clients table
            db.run(`
        CREATE TABLE IF NOT EXISTS easypay_clients (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          client_id TEXT UNIQUE NOT NULL,
          display_name TEXT NOT NULL,
          ssn TEXT,
          is_resident TEXT,
          password TEXT,
          pin TEXT,
          first_name TEXT NOT NULL,
          last_name TEXT NOT NULL,
          address TEXT,
          date_of_birth TEXT,
          is_enabled TEXT,
          email TEXT NOT NULL,
          phone TEXT NOT NULL,
          phone2 TEXT,
          gender TEXT,
          language TEXT,
          phone_verified TEXT,
          email_verified TEXT,
          open_date TEXT,
          is_verified TEXT,
          ordered_registration TEXT,
          verification_date TEXT,
          registration_type TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
            // Applications table for managing web projects
            db.run(`
        CREATE TABLE IF NOT EXISTS applications (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          description TEXT,
          type TEXT DEFAULT 'react',
          status TEXT DEFAULT 'active',
          path TEXT,
          url TEXT,
          domain TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);
            // Projects table for managing sub-projects within applications
            db.run(`
        CREATE TABLE IF NOT EXISTS projects (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          application_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          version TEXT DEFAULT '1.0.0',
          description TEXT,
          path TEXT,
          url TEXT,
          status TEXT DEFAULT 'active',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
        )
      `);
            // Categories table for organizing geckos
            db.run(`
        CREATE TABLE IF NOT EXISTS categories (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          is_default INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
            // Geckos table for the Gecko Shop e-commerce
            db.run(`
        CREATE TABLE IF NOT EXISTS geckos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          species TEXT NOT NULL,
          morph TEXT,
          price REAL NOT NULL,
          image TEXT,
          age TEXT,
          gender TEXT,
          description TEXT,
          available INTEGER DEFAULT 1,
          category TEXT,
          show_on_web INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
            // Create indexes for better performance
            db.run(`CREATE INDEX IF NOT EXISTS idx_easypay_clients_client_id ON easypay_clients(client_id)`);
            db.run(`CREATE INDEX IF NOT EXISTS idx_easypay_clients_email ON easypay_clients(email)`);
            db.run(`CREATE INDEX IF NOT EXISTS idx_easypay_clients_phone ON easypay_clients(phone)`);
            db.run(`CREATE INDEX IF NOT EXISTS idx_easypay_clients_display_name ON easypay_clients(display_name)`);
            db.run(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
            db.run(`CREATE INDEX IF NOT EXISTS idx_applications_user_id ON applications(user_id)`);
            db.run(`CREATE INDEX IF NOT EXISTS idx_applications_name ON applications(name)`);
            db.run(`CREATE INDEX IF NOT EXISTS idx_projects_application_id ON projects(application_id)`);
            db.run(`CREATE INDEX IF NOT EXISTS idx_geckos_category ON geckos(category)`);
            db.run(`CREATE INDEX IF NOT EXISTS idx_geckos_available ON geckos(available)`);
            db.run(`CREATE INDEX IF NOT EXISTS idx_categories_id ON categories(id)`);
            // Settings table for gecko-shop configuration
            db.run(`
        CREATE TABLE IF NOT EXISTS settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          key TEXT UNIQUE NOT NULL,
          value TEXT NOT NULL,
          description TEXT,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
            // Update categories table to include image field (check if column exists first)
            db.all("PRAGMA table_info(categories)", [], (err, columns) => {
                if (!err) {
                    const hasImageColumn = columns.some(col => col.name === 'image');
                    if (!hasImageColumn) {
                        db.run('ALTER TABLE categories ADD COLUMN image TEXT');
                    }
                }
            });
            // Ensure geckos table has show_on_web column
            db.all("PRAGMA table_info(geckos)", [], (err, columns) => {
                if (!err) {
                    const hasShowOnWeb = columns.some(col => col.name === 'show_on_web');
                    if (!hasShowOnWeb) {
                        db.run('ALTER TABLE geckos ADD COLUMN show_on_web INTEGER DEFAULT 1');
                    }
                }
            });
            // Insert default settings if not exists
            const defaultSettings = [
                { key: 'show_language_selector', value: 'true', description: 'Show language selector in gecko-shop header' }
            ];
            defaultSettings.forEach((setting) => {
                db.get('SELECT * FROM settings WHERE key = ?', [setting.key], (err, row) => {
                    if (err) {
                        console.error('Error checking setting:', err);
                        return;
                    }
                    if (!row) {
                        db.run('INSERT INTO settings (key, value, description) VALUES (?, ?, ?)', [setting.key, setting.value, setting.description]);
                    }
                });
            });
            // Insert initial categories if not exists (not default - can be deleted)
            const initialCategories = [
                { id: 'macularius', name: 'Leopard Geckos', is_default: 0, image: 'https://images.unsplash.com/photo-1518665750801-883bf1905352?w=400&h=400&fit=crop' },
                { id: 'angramainyu', name: 'Iraqi Geckos', is_default: 0, image: 'https://images.unsplash.com/photo-1565992441121-4367c2968f11?w=400&h=400&fit=crop' },
                { id: 'fuscus', name: 'E. fuscus', is_default: 0, image: 'https://images.unsplash.com/photo-1551963831-b3b1ca40c98e?w=400&h=400&fit=crop' },
                { id: 'hardwickii', name: 'E. hardwickii', is_default: 0, image: 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=400&h=400&fit=crop' }
            ];
            initialCategories.forEach((cat) => {
                db.get('SELECT * FROM categories WHERE id = ?', [cat.id], (err, row) => {
                    if (err) {
                        console.error('Error checking category:', err);
                        return;
                    }
                    if (!row) {
                        db.run('INSERT INTO categories (id, name, is_default, image) VALUES (?, ?, ?, ?)', [cat.id, cat.name, cat.is_default, cat.image]);
                    }
                    else {
                        // Update existing categories with images if they don't have one
                        if (!row.image && cat.image) {
                            db.run('UPDATE categories SET image = ? WHERE id = ?', [cat.image, cat.id]);
                        }
                    }
                });
            });
            // Insert default geckos if not exists
            db.get('SELECT COUNT(*) as count FROM geckos', [], (err, row) => {
                if (err) {
                    console.error('Error checking geckos count:', err);
                    return;
                }
                if (row.count === 0) {
                    const defaultGeckos = [
                        { name: 'Classic Leopard Gecko', species: 'Eublepharis macularius', morph: 'Normal', price: 89.99, age: 'Juvenile', gender: 'Unknown', description: 'Beautiful classic leopard gecko with high-contrast spots. Perfect starter gecko with great temperament.', available: 1, category: 'macularius', image: 'https://images.unsplash.com/photo-1518665750801-883bf1905352?w=800' },
                        { name: 'Albinos Leopard Gecko', species: 'Eublepharis macularius', morph: 'Tremper Albino', price: 149.99, age: 'Adult', gender: 'Male', description: 'Stunning Tremper albino with vibrant orange patterns and red eyes. Exceptional quality.', available: 1, category: 'macularius', image: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=800' },
                        { name: 'High Yellow Leopard Gecko', species: 'Eublepharis macularius', morph: 'High Yellow', price: 119.99, age: 'Sub-adult', gender: 'Female', description: 'Bright yellow coloration with reduced black spotting. Healthy and well-started juvenile.', available: 1, category: 'macularius', image: 'https://images.unsplash.com/photo-1470093851219-69951fcbb533?w=800' },
                        { name: 'Blazing Blizzard Leopard Gecko', species: 'Eublepharis macularius', morph: 'Blazing Blizzard', price: 199.99, age: 'Adult', gender: 'Male', description: 'Rare blazing blizzard morph with stunning white coloration and yellow hints.', available: 1, category: 'macularius', image: 'https://images.unsplash.com/photo-1516893842880-5d5a34eb4b69?w=800' },
                        { name: 'RAPTOR Leopard Gecko', species: 'Eublepharis macularius', morph: 'RAPTOR', price: 249.99, age: 'Adult', gender: 'Female', description: 'Premium RAPTOR (Red-eyed APTOR) with glowing red eyes and beautiful pattern.', available: 0, category: 'macularius', image: 'https://images.unsplash.com/photo-1593305841991-05c297ba4dea?w=800' },
                        { name: 'Enigma Leopard Gecko', species: 'Eublepharis macularius', morph: 'Enigma', price: 179.99, age: 'Juvenile', gender: 'Unknown', description: 'Unique Enigma morph with irregular pattern distribution. Healthy juvenile.', available: 1, category: 'macularius', image: 'https://images.unsplash.com/photo-1577739549075-5be0e3d3dcd9?w=800' },
                        { name: 'Eublepharis angramainyu', species: 'Eublepharis angramainyu', morph: 'Wild Type', price: 299.99, age: 'Adult', gender: 'Male', description: 'Rare Iraqi gecko with unique patterning. Perfect for experienced keepers.', available: 1, category: 'angramainyu', image: 'https://images.unsplash.com/photo-1518665750801-883bf1905352?w=800' },
                        { name: 'Eublepharis fuscus', species: 'Eublepharis fuscus', morph: 'Wild Type', price: 279.99, age: 'Adult', gender: 'Female', description: 'Beautiful Eublepharis fuscus with distinct coloration. Excellent specimens.', available: 1, category: 'fuscus', image: 'https://images.unsplash.com/photo-1518665750801-883bf1905352?w=800' },
                        { name: 'Eublepharis hardwickii', species: 'Eublepharis hardwickii', morph: 'Wild Type', price: 289.99, age: 'Sub-adult', gender: 'Unknown', description: 'Stunning Eublepharis hardwickii with unique characteristics.', available: 1, category: 'hardwickii', image: 'https://images.unsplash.com/photo-1518665750801-883bf1905352?w=800' },
                        { name: 'Mack Snow Leopard Gecko', species: 'Eublepharis macularius', morph: 'Mack Snow', price: 129.99, age: 'Juvenile', gender: 'Female', description: 'Stunning Mack Snow with reduced pigmentation creating beautiful contrast.', available: 1, category: 'macularius', image: 'https://images.unsplash.com/photo-1596436889106-be35e843f974?w=800' }
                    ];
                    const stmt = db.prepare('INSERT INTO geckos (name, species, morph, price, image, age, gender, description, available, category) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
                    defaultGeckos.forEach((gecko) => {
                        stmt.run(gecko.name, gecko.species, gecko.morph, gecko.price, gecko.image, gecko.age, gecko.gender, gecko.description, gecko.available, gecko.category);
                    });
                    stmt.finalize((err) => {
                        if (err) {
                            console.error('Error inserting default geckos:', err);
                        }
                        else {
                            console.log('Default geckos inserted successfully');
                        }
                    });
                }
            });
            // Insert default users if not exists
            const defaultUsers = [
                {
                    name: 'Admin User',
                    email: 'admin@easypay.com',
                    password: 'admin123',
                    role: 'admin'
                },
                {
                    name: 'Manager User',
                    email: 'manager@easypay.com',
                    password: 'manager123',
                    role: 'manager'
                },
                {
                    name: 'Test User',
                    email: 'user@easypay.com',
                    password: 'user123',
                    role: 'user'
                }
            ];
            let createdCount = 0;
            defaultUsers.forEach((userData) => {
                db.get('SELECT COUNT(*) as count FROM users WHERE email = ?', [userData.email], (err, row) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    if (row.count === 0) {
                        const hashedPassword = bcrypt.hashSync(userData.password, 10);
                        db.run('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)', [userData.name, userData.email, hashedPassword, userData.role], (err) => {
                            if (err) {
                                reject(err);
                            }
                            else {
                                createdCount++;
                                console.log(`Default ${userData.role} user created: ${userData.email} / ${userData.password}`);
                                if (createdCount === defaultUsers.length) {
                                    resolve();
                                }
                            }
                        });
                    }
                    else {
                        createdCount++;
                        if (createdCount === defaultUsers.length) {
                            resolve();
                        }
                    }
                });
            });
        });
    });
}
export function closeDatabase() {
    db.close();
}
//# sourceMappingURL=init.js.map