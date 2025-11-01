import { Pool } from 'pg';

export const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL || undefined,
  host: process.env.PGHOST,
  port: process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : undefined,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined,
});

export async function initializePostgres(): Promise<void> {
  // Create tables if not exist
  await pgPool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS applications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      type TEXT DEFAULT 'react',
      status TEXT DEFAULT 'active',
      path TEXT,
      url TEXT,
      domain TEXT,
      leader_id INTEGER,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS projects (
      id SERIAL PRIMARY KEY,
      application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      version TEXT DEFAULT '1.0.0',
      description TEXT,
      path TEXT,
      url TEXT,
      status TEXT DEFAULT 'active',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      is_default INTEGER DEFAULT 0,
      image TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS geckos (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      species TEXT NOT NULL,
      morph TEXT,
      price DOUBLE PRECISION NOT NULL,
      image TEXT,
      age TEXT,
      gender TEXT,
      description TEXT,
      available INTEGER DEFAULT 1,
      category TEXT,
      show_on_web INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS settings (
      id SERIAL PRIMARY KEY,
      key TEXT UNIQUE NOT NULL,
      value TEXT NOT NULL,
      description TEXT,
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS easypay_clients (
      id SERIAL PRIMARY KEY,
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
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);
}


