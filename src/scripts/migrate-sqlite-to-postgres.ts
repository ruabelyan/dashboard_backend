/**
 * Migration script to copy data from SQLite to PostgreSQL
 * 
 * Usage:
 * 1. Set up PostgreSQL connection in config.env
 * 2. Set DB_TYPE=postgres in config.env
 * 3. Run: npx tsx src/scripts/migrate-sqlite-to-postgres.ts
 */

import sqlite3 from 'sqlite3';
import { Pool } from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: './config.env' });

const sqliteDbPath = process.env.DB_PATH || path.join(__dirname, '../../data/database.sqlite');

const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL || undefined,
    host: process.env.PGHOST,
    port: process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : undefined,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
    ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined,
});

async function querySqlite<T>(query: string, params: any[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(sqliteDbPath);
        db.all(query, params, (err, rows) => {
            db.close();
            if (err) return reject(err);
            resolve(rows as T[]);
        });
    });
}

async function migrateTable(tableName: string, columns: string[], transform?: (row: any) => any) {
    console.log(`\n📦 Migrating ${tableName}...`);

    const sqliteRows = await querySqlite<any>(`SELECT * FROM ${tableName}`);
    console.log(`   Found ${sqliteRows.length} rows`);

    if (sqliteRows.length === 0) {
        console.log(`   ⏭️  Skipping ${tableName} (no data)`);
        return;
    }

    // Clear existing data
    await pgPool.query(`TRUNCATE TABLE ${tableName} RESTART IDENTITY CASCADE`);

    // Insert data
    for (const row of sqliteRows) {
        const data = transform ? transform(row) : row;
        const values = columns.map((_, idx) => `$${idx + 1}`).join(', ');
        const columnNames = columns.join(', ');

        try {
            await pgPool.query(
                `INSERT INTO ${tableName} (${columnNames}) VALUES (${values})`,
                columns.map(col => data[col] !== undefined ? data[col] : null)
            );
        } catch (err: any) {
            console.error(`   ❌ Error inserting row:`, err.message);
            console.error(`   Row data:`, data);
        }
    }

    console.log(`   ✅ Migrated ${sqliteRows.length} rows`);
}

async function migrate() {
    try {
        console.log('🚀 Starting migration from SQLite to PostgreSQL...');
        console.log(`📂 SQLite DB: ${sqliteDbPath}`);

        // Check PostgreSQL configuration
        const hasConnectionString = !!process.env.DATABASE_URL;
        const hasIndividualConfig = !!(process.env.PGHOST && process.env.PGUSER && process.env.PGDATABASE);

        if (!hasConnectionString && !hasIndividualConfig) {
            console.error('\n❌ PostgreSQL configuration not found!');
            console.error('\nPlease add one of the following to your config.env:');
            console.error('\nOption 1 - Connection String:');
            console.error('DATABASE_URL=postgresql://user:password@localhost:5432/dbname');
            console.error('\nOption 2 - Individual Parameters:');
            console.error('PGHOST=localhost');
            console.error('PGPORT=5432');
            console.error('PGUSER=your_username');
            console.error('PGPASSWORD=your_password');
            console.error('PGDATABASE=your_database_name');
            process.exit(1);
        }

        console.log('\n🔌 Testing PostgreSQL connection...');
        console.log(`   Host: ${process.env.PGHOST || 'from DATABASE_URL'}`);
        console.log(`   Database: ${process.env.PGDATABASE || 'from DATABASE_URL'}`);

        // Test connections
        try {
            await pgPool.query('SELECT 1');
            console.log('✅ PostgreSQL connection successful');
        } catch (connError: any) {
            console.error('\n❌ Failed to connect to PostgreSQL!');
            console.error(`   Error: ${connError.message}`);

            if (connError.code === 'ECONNREFUSED') {
                console.error('\n💡 PostgreSQL is not running or not accessible.');
                console.error('   Please check:');
                console.error('   1. Is PostgreSQL installed?');
                console.error('   2. Is PostgreSQL service running?');
                console.error('   3. Is the host and port correct in config.env?');
                console.error('\n   See SETUP_POSTGRES.md for installation instructions.');
            } else if (connError.code === '28P01') {
                console.error('\n💡 Authentication failed.');
                console.error('   Please check username and password in config.env');
            } else if (connError.code === '3D000') {
                console.error('\n💡 Database does not exist.');
                console.error('   Please create the database first:');
                console.error('   CREATE DATABASE your_database_name;');
            }

            process.exit(1);
        }

        const testDb = new sqlite3.Database(sqliteDbPath);
        await new Promise<void>((resolve, reject) => {
            testDb.get('SELECT 1', (err) => {
                testDb.close();
                if (err) reject(err);
                else resolve();
            });
        });
        console.log('✅ SQLite connection successful\n');

        // Migrate users
        await migrateTable('users', ['id', 'name', 'email', 'password', 'role', 'created_at', 'updated_at']);

        // Migrate applications
        await migrateTable('applications', ['id', 'user_id', 'name', 'description', 'type', 'status', 'path', 'url', 'domain', 'leader_id', 'created_at', 'updated_at']);

        // Migrate projects
        await migrateTable('projects', ['id', 'application_id', 'name', 'version', 'description', 'path', 'url', 'status', 'created_at', 'updated_at']);

        // Migrate categories
        await migrateTable('categories', ['id', 'name', 'description', 'is_default', 'image', 'created_at', 'updated_at']);

        // Migrate geckos
        await migrateTable('geckos', ['id', 'name', 'species', 'morph', 'price', 'image', 'age', 'gender', 'description', 'available', 'category', 'show_on_web', 'created_at', 'updated_at']);

        // Migrate settings
        await migrateTable('settings', ['id', 'key', 'value', 'description', 'updated_at']);

        // Migrate easypay_clients
        await migrateTable('easypay_clients', [
            'id', 'client_id', 'display_name', 'ssn', 'is_resident', 'password', 'pin',
            'first_name', 'last_name', 'address', 'date_of_birth', 'is_enabled',
            'email', 'phone', 'phone2', 'gender', 'language', 'phone_verified',
            'email_verified', 'open_date', 'is_verified', 'ordered_registration',
            'verification_date', 'registration_type', 'created_at', 'updated_at'
        ]);

        console.log('\n🎉 Migration completed successfully!');
    } catch (error) {
        console.error('\n❌ Migration failed:', error);
        process.exit(1);
    } finally {
        await pgPool.end();
    }
}

migrate();

