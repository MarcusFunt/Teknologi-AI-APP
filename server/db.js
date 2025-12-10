import { newDb } from 'pg-mem';
import { Pool } from 'pg';
import 'dotenv/config';

let pool;

export const isInMemory = !process.env.DATABASE_URL;

if (isInMemory) {
  const db = newDb();
  const { Pool: InMemoryPool } = db.adapters.createPg();
  pool = new InMemoryPool();
  console.warn(
    'DATABASE_URL not set; using an in-memory PostgreSQL instance. Data resets on restart.',
  );
} else {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : undefined,
  });
}

export const query = (text, params) => pool.query(text, params);

export const close = () => pool.end();
