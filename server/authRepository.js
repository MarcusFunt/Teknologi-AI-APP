import { isInMemory, query } from './db.js';

export const ensureAuthSchema = async () => {
  if (!isInMemory) {
    await query('CREATE EXTENSION IF NOT EXISTS citext;');
  }
  await query(`
    CREATE TABLE IF NOT EXISTS auth_users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email ${isInMemory ? 'TEXT' : 'CITEXT'} UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await query('CREATE INDEX IF NOT EXISTS idx_auth_users_email ON auth_users (email);');
};

export const createUser = async ({ name, email, passwordHash }) => {
  const normalizedEmail = email.toLowerCase();
  const { rows } = await query(
    `INSERT INTO auth_users (name, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, name, email;`,
    [name, normalizedEmail, passwordHash],
  );
  return rows[0];
};

export const findUserByEmail = async (email) => {
  const normalizedEmail = email.toLowerCase();
  const { rows } = await query(
    'SELECT id, name, email, password_hash FROM auth_users WHERE email = $1;',
    [normalizedEmail],
  );
  return rows[0];
};

export const getUserById = async (id) => {
  const { rows } = await query('SELECT id, name, email FROM auth_users WHERE id = $1;', [id]);
  return rows[0];
};
