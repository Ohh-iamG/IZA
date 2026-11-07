import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';

declare global {
  var _postgresPool: Pool | undefined;
}

export const createPool = () => {
  if (!global._postgresPool) {
    global._postgresPool = new Pool({
      host: process.env.SQL_HOST,
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      database: process.env.SQL_DB_NAME,
      max: 10,
      min: 0,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 10000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
    });

    global._postgresPool.on('error', (err: any) => {
      // Cloud SQL proxies or scale-to-zero instances routinely recycle idle connections.
      // Log as a transient notice instead of throwing an unhandled fatal error.
      if (err?.message?.includes('Connection terminated unexpectedly') || err?.code === 'ECONNRESET') {
        console.warn('Postgres connection pool recycled an idle connection (handled gracefully).');
      } else {
        console.warn('Postgres pool notice:', err?.message || err);
      }
    });
  }
  return global._postgresPool;
};

export const pool = createPool();

export const db = drizzle(pool, { schema });
