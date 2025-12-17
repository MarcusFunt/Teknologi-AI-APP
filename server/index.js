import express from 'express';
import 'dotenv/config';
import {
  ensureSchema,
  getAllEvents,
  getEventsByDate,
  getUpcomingEvents,
  applyEventOperations,
  seedIfEmpty,
} from './eventsRepository.js';
import {
  createUser,
  ensureAuthSchema,
  findUserByEmail,
  getUserById,
} from './authRepository.js';
import { planCalendarEdits } from './ai/chain.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const app = express();
const host = process.env.HOST || '0.0.0.0';
const port = process.env.PORT || 4000;
const jwtSecret = process.env.JWT_SECRET || 'dev-insecure-secret';
const apiBaseUrl = process.env.API_BASE_URL || `http://localhost:${port}`;

app.use(express.json());

const signToken = (user) =>
  jwt.sign(
    {
      sub: user.id,
      email: user.email,
      name: user.name,
    },
    jwtSecret,
    { expiresIn: '7d' },
  );

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const payload = jwt.verify(token, jwtSecret);
    req.userId = payload.sub;
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }

  return next();
};

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email, and password are required.' });
  }

  if (password.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters long.' });
  }

  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    return res.status(409).json({ message: 'An account already exists with that email.' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await createUser({ name, email, passwordHash });
  const token = signToken(user);

  return res.status(201).json({ user, token });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  const user = await findUserByEmail(email);
  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const token = signToken(user);
  return res.json({
    user: { id: user.id, name: user.name, email: user.email },
    token,
  });
});

app.get('/api/auth/me', authenticate, async (req, res) => {
  const user = await getUserById(req.userId);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  return res.json({ user });
});

app.get('/api/events', authenticate, async (req, res) => {
  const { date } = req.query;
  const events = date
    ? await getEventsByDate(req.userId, date)
    : await getAllEvents(req.userId);
  res.json({ events });
});

app.get('/api/events/upcoming', authenticate, async (req, res) => {
  const limit = Number(req.query.limit) || 5;
  const events = await getUpcomingEvents(req.userId, limit);
  res.json({ events });
});

app.patch('/api/events/bulk', authenticate, async (req, res) => {
  const { operations } = req.body;

  if (!Array.isArray(operations)) {
    return res.status(400).json({ message: 'operations must be an array.' });
  }

  const result = await applyEventOperations(req.userId, operations);
  return res.json(result);
});

app.post('/api/ai/edit', authenticate, async (req, res) => {
  const { prompt } = req.body;

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ message: 'prompt is required.' });
  }

  const authHeader = req.headers.authorization;

  const eventsResponse = await fetch(`${apiBaseUrl}/api/events`, {
    headers: { Authorization: authHeader },
  });

  if (!eventsResponse.ok) {
    return res
      .status(500)
      .json({ message: 'Failed to load events before calling the AI assistant.' });
  }

  const { events } = await eventsResponse.json();

  try {
    const plan = await planCalendarEdits({ prompt, events });

    let patchResult = { message: 'No operations returned', events };
    if (plan.operations?.length) {
      const patchResponse = await fetch(`${apiBaseUrl}/api/events/bulk`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify({ operations: plan.operations }),
      });

      patchResult = await patchResponse.json();
    }

    return res.json({ plan, patchResult });
  } catch (error) {
    console.error('AI planner failed', error);
    return res.status(500).json({ message: 'AI planner failed', error: error.message });
  }
});

const start = async () => {
  await ensureAuthSchema();
  await ensureSchema();
  await seedIfEmpty();

  app.listen(port, host, () => {
    console.log(`API server listening on http://${host}:${port}`);
  });
};

start().catch((error) => {
  console.error('Failed to start server', error);
  process.exit(1);
});
