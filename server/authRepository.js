import { readJsonFile, writeJsonFile } from './jsonStorage.js';

const USERS_FILE = 'users.json';

const loadUsers = () => readJsonFile(USERS_FILE, []);
const saveUsers = (users) => writeJsonFile(USERS_FILE, users);

export const ensureAuthSchema = async () => {
  const users = await loadUsers();
  await saveUsers(users);
};

export const createUser = async ({ name, email, passwordHash }) => {
  const normalizedEmail = email.toLowerCase();
  const users = await loadUsers();
  const nextId = users.reduce((max, user) => Math.max(max, user.id), 0) + 1;

  const user = {
    id: nextId,
    name,
    email: normalizedEmail,
    password_hash: passwordHash,
  };

  users.push(user);
  await saveUsers(users);

  return { id: user.id, name: user.name, email: user.email };
};

export const findUserByEmail = async (email) => {
  const normalizedEmail = email.toLowerCase();
  const users = await loadUsers();
  return users.find((user) => user.email === normalizedEmail);
};

export const getUserById = async (id) => {
  const users = await loadUsers();
  const user = users.find((entry) => entry.id === id);
  return user ? { id: user.id, name: user.name, email: user.email } : undefined;
};
