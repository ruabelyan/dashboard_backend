# PostgreSQL Migration Guide

This guide explains how to migrate from SQLite to PostgreSQL and configure the backend to use PostgreSQL.

## Prerequisites

1. PostgreSQL server installed and running
2. A PostgreSQL database created
3. Node.js dependencies installed (`npm install`)

## Configuration

### 1. Set Environment Variables

Add the following to your `config.env` file:

```env
# Database Type (sqlite or postgres)
DB_TYPE=postgres

# PostgreSQL Connection Options
# Option 1: Use connection string
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# Option 2: Use individual connection parameters
PGHOST=localhost
PGPORT=5432
PGUSER=your_username
PGPASSWORD=your_password
PGDATABASE=your_database_name

# SSL (if using managed PostgreSQL like AWS RDS, Heroku, etc.)
PGSSL=true
```

### 2. Database Initialization

When you start the server with `DB_TYPE=postgres`, the application will automatically:
- Connect to PostgreSQL
- Create all required tables if they don't exist
- Set up the schema

Simply run:
```bash
npm run dev
# or
npm start
```

## Migration from SQLite to PostgreSQL

### Automatic Migration Script

We provide a migration script to copy all data from SQLite to PostgreSQL:

```bash
# 1. Make sure PostgreSQL is configured in config.env
# 2. Set DB_TYPE=postgres in config.env
# 3. Run the migration script
npx tsx src/scripts/migrate-sqlite-to-postgres.ts
```

The script will:
- ✅ Test both SQLite and PostgreSQL connections
- ✅ Copy data from all tables:
  - `users`
  - `applications`
  - `projects`
  - `categories`
  - `geckos`
  - `settings`
  - `easypay_clients`
- ✅ Preserve all data including IDs
- ✅ Clear existing PostgreSQL data before migration (to avoid duplicates)

### Manual Migration Steps

If you prefer to migrate manually:

1. **Export SQLite data:**
   ```bash
   sqlite3 data/database.sqlite .dump > backup.sql
   ```

2. **Create PostgreSQL schema:**
   - The schema is automatically created when you start the server with `DB_TYPE=postgres`
   - Or you can manually run the schema from `src/database/postgres.ts`

3. **Import data:**
   - You may need to convert SQLite syntax to PostgreSQL syntax
   - Handle AUTOINCREMENT → SERIAL conversions
   - Handle DATETIME → TIMESTAMP conversions

## Switching Between Databases

You can switch between SQLite and PostgreSQL by changing the `DB_TYPE` environment variable:

- `DB_TYPE=sqlite` (or not set) → Uses SQLite
- `DB_TYPE=postgres` → Uses PostgreSQL

The application automatically detects the database type and uses the appropriate connection and query syntax.

## Database Abstraction

The application uses a database abstraction layer (`src/database/db.ts`) that:
- Automatically converts SQLite `?` placeholders to PostgreSQL `$1, $2, ...` placeholders
- Handles INSERT operations with `RETURNING id` for PostgreSQL
- Provides async/await interface for both databases
- Maintains backward compatibility with SQLite

## Troubleshooting

### Connection Issues

1. **Check PostgreSQL is running:**
   ```bash
   # macOS
   brew services list | grep postgresql
   
   # Linux
   sudo systemctl status postgresql
   ```

2. **Test connection:**
   ```bash
   psql -h localhost -U your_username -d your_database_name
   ```

3. **Check firewall/network settings** if connecting to remote PostgreSQL

### SSL Issues

If you're using a managed PostgreSQL service (AWS RDS, Heroku, etc.), you may need:
```env
PGSSL=true
```

### Migration Issues

If the migration script fails:
1. Check that both databases are accessible
2. Verify table schemas match
3. Check for data type incompatibilities
4. Review error messages for specific issues

### Common Errors

- **"relation does not exist"**: Run the initialization script or start the server to create tables
- **"syntax error at or near"**: Usually means query conversion issue, check the abstraction layer
- **"connection refused"**: PostgreSQL server is not running or wrong connection details

## Rollback to SQLite

To rollback to SQLite:
1. Set `DB_TYPE=sqlite` (or remove the variable)
2. Restart the server
3. Your SQLite database will be used as before

**Note**: Data created in PostgreSQL will NOT automatically appear in SQLite. You would need to export from PostgreSQL and import to SQLite manually if needed.

