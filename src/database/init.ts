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

export async function initializeDatabase(): Promise<void> {
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

      // Create indexes for better performance
      db.run(`CREATE INDEX IF NOT EXISTS idx_easypay_clients_client_id ON easypay_clients(client_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_easypay_clients_email ON easypay_clients(email)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_easypay_clients_phone ON easypay_clients(phone)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_easypay_clients_display_name ON easypay_clients(display_name)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);

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
        db.get('SELECT COUNT(*) as count FROM users WHERE email = ?', [userData.email], (err, row: any) => {
          if (err) {
            reject(err);
            return;
          }
          
          if (row.count === 0) {
            const hashedPassword = bcrypt.hashSync(userData.password, 10);
            
            db.run(
              'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
              [userData.name, userData.email, hashedPassword, userData.role],
              (err) => {
                if (err) {
                  reject(err);
                } else {
                  createdCount++;
                  console.log(`Default ${userData.role} user created: ${userData.email} / ${userData.password}`);
                  
                  if (createdCount === defaultUsers.length) {
                    resolve();
                  }
                }
              }
            );
          } else {
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

export function closeDatabase(): void {
  db.close();
}
