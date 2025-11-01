# PostgreSQL Setup Guide

PostgreSQL is not currently installed on your system. Follow these steps to install and configure it.

## Option 1: Install PostgreSQL via Homebrew (macOS)

### 1. Install PostgreSQL

```bash
brew install postgresql@15
# or for the latest version:
brew install postgresql
```

### 2. Start PostgreSQL Service

```bash
# Start PostgreSQL service
brew services start postgresql@15
# or
brew services start postgresql
```

### 3. Create Database

```bash
# Connect to PostgreSQL (creates your user database automatically on first connection)
psql postgres

# In psql prompt, create a new database:
CREATE DATABASE dashboard_db;

# Create a user (optional, you can use your macOS user):
CREATE USER dashboard_user WITH PASSWORD 'your_password';

# Grant privileges:
GRANT ALL PRIVILEGES ON DATABASE dashboard_db TO dashboard_user;

# Exit psql:
\q
```

### 4. Configure in config.env

Add to `config.env`:

```env
# Database Type
DB_TYPE=postgres

# PostgreSQL Connection (Option 1: Connection String)
DATABASE_URL=postgresql://dashboard_user:your_password@localhost:5432/dashboard_db

# OR (Option 2: Individual Parameters)
# PGHOST=localhost
# PGPORT=5432
# PGUSER=dashboard_user
# PGPASSWORD=your_password
# PGDATABASE=dashboard_db
```

### 5. Run Migration

```bash
cd dashboard_backend
npx tsx src/scripts/migrate-sqlite-to-postgres.ts
```

## Option 2: Install PostgreSQL via Official Installer (macOS)

1. Download PostgreSQL from: https://www.postgresql.org/download/macosx/
2. Run the installer and follow the setup wizard
3. The installer will set up PostgreSQL and create a default `postgres` user
4. Note the port (default is 5432) and password you set during installation
5. Configure `config.env` as shown above

## Option 3: Use Docker (Recommended for Development)

### 1. Run PostgreSQL in Docker

```bash
docker run --name postgres-dashboard \
  -e POSTGRES_USER=dashboard_user \
  -e POSTGRES_PASSWORD=your_password \
  -e POSTGRES_DB=dashboard_db \
  -p 5432:5432 \
  -d postgres:15
```

### 2. Configure in config.env

```env
DB_TYPE=postgres
PGHOST=localhost
PGPORT=5432
PGUSER=dashboard_user
PGPASSWORD=your_password
PGDATABASE=dashboard_db
```

### 3. Run Migration

```bash
cd dashboard_backend
npx tsx src/scripts/migrate-sqlite-to-postgres.ts
```

### 4. Stop/Start Docker Container

```bash
# Stop
docker stop postgres-dashboard

# Start
docker start postgres-dashboard

# Remove (if needed)
docker rm postgres-dashboard
```

## Option 4: Use Cloud PostgreSQL (Production)

### Services:
- **AWS RDS**: https://aws.amazon.com/rds/postgresql/
- **Heroku Postgres**: https://www.heroku.com/postgres
- **Supabase**: https://supabase.com
- **Neon**: https://neon.tech
- **Railway**: https://railway.app

### Configuration for Cloud:

```env
DB_TYPE=postgres
DATABASE_URL=postgresql://user:password@host:5432/dbname?sslmode=require
# OR
PGHOST=your-host.amazonaws.com
PGPORT=5432
PGUSER=your_username
PGPASSWORD=your_password
PGDATABASE=your_database
PGSSL=true
```

## Verify Installation

### Test Connection

```bash
# If installed locally:
psql -h localhost -U dashboard_user -d dashboard_db

# If using Docker:
docker exec -it postgres-dashboard psql -U dashboard_user -d dashboard_db
```

### Check PostgreSQL is Running

```bash
# Homebrew:
brew services list | grep postgresql

# Docker:
docker ps | grep postgres

# Check port:
lsof -i :5432
```

## Troubleshooting

### Connection Refused

- **PostgreSQL not running**: Start the service
  ```bash
  brew services start postgresql
  # or
  docker start postgres-dashboard
  ```

- **Wrong port**: Default is 5432, check if PostgreSQL is running on a different port

- **Firewall**: Make sure port 5432 is not blocked

### Authentication Failed

- Check username and password in `config.env`
- Verify user exists: `\du` in psql
- Check `pg_hba.conf` settings

### Database Does Not Exist

```bash
psql -U postgres
CREATE DATABASE dashboard_db;
```

## Quick Start (Docker - Easiest)

```bash
# 1. Start PostgreSQL
docker run --name postgres-dashboard \
  -e POSTGRES_USER=dashboard \
  -e POSTGRES_PASSWORD=dashboard123 \
  -e POSTGRES_DB=dashboard_db \
  -p 5432:5432 \
  -d postgres:15

# 2. Add to config.env
cat >> config.env << EOF

# PostgreSQL
DB_TYPE=postgres
PGHOST=localhost
PGPORT=5432
PGUSER=dashboard
PGPASSWORD=dashboard123
PGDATABASE=dashboard_db
EOF

# 3. Run migration
cd dashboard_backend
npx tsx src/scripts/migrate-sqlite-to-postgres.ts

# 4. Start server
npm run dev
```

