import { db as sqliteDb } from './init.js';
import { pgPool } from './postgres.js';

const isPostgres = (process.env.DB_TYPE || '').toLowerCase() === 'postgres';

// Convert SQLite parameter placeholders (?) to PostgreSQL placeholders ($1, $2, etc.)
function convertQuery(query: string): string {
    let paramIndex = 1;
    return query.replace(/\?/g, () => `$${paramIndex++}`);
}

export async function dbAll<T = any>(query: string, params: any[] = []): Promise<T[]> {
    if (isPostgres) {
        const res = await pgPool.query(convertQuery(query), params);
        return res.rows as T[];
    }
    return new Promise<T[]>((resolve, reject) => {
        sqliteDb.all(query, params, (err, rows) => {
            if (err) return reject(err);
            resolve(rows as T[]);
        });
    });
}

export async function dbGet<T = any>(query: string, params: any[] = []): Promise<T | undefined> {
    if (isPostgres) {
        const res = await pgPool.query(convertQuery(query), params);
        return (res.rows[0] as T) || undefined;
    }
    return new Promise<T | undefined>((resolve, reject) => {
        sqliteDb.get(query, params, (err, row) => {
            if (err) return reject(err);
            resolve((row as T) || undefined);
        });
    });
}

export async function dbRun(query: string, params: any[] = []): Promise<{ lastID?: number }> {
    if (isPostgres) {
        // For INSERT queries, use RETURNING id to get the last inserted ID
        if (query.trim().toUpperCase().startsWith('INSERT')) {
            const returningQuery = query + ' RETURNING id';
            try {
                const result = await pgPool.query(convertQuery(returningQuery), params);
                return { lastID: result.rows[0]?.id };
            } catch (err: any) {
                // If RETURNING doesn't work, try without it
                if (err.message.includes('RETURNING')) {
                    await pgPool.query(convertQuery(query), params);
                    return {};
                }
                throw err;
            }
        }
        await pgPool.query(convertQuery(query), params);
        return {};
    }
    return new Promise((resolve, reject) => {
        sqliteDb.run(query, params, function (err) {
            if (err) return reject(err);
            resolve({ lastID: (this as any).lastID });
        });
    });
}


