import express from 'express';
import 'dotenv/config';
import {
  ensureSchema,
  getAllEvents,
  getEventsByDate,
  getUpcomingEvents,
  seedIfEmpty,
} from './eventsRepository.js';

const app = express();
const port = process.env.PORT || 4000;

app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/events', async (req, res) => {
  const { date } = req.query;
  const events = date ? await getEventsByDate(date) : await getAllEvents();
  res.json({ events });
});

app.get('/api/events/upcoming', async (req, res) => {
  const limit = Number(req.query.limit) || 5;
  const events = await getUpcomingEvents(limit);
  res.json({ events });
});

const start = async () => {
  await ensureSchema();
  await seedIfEmpty();

  app.listen(port, () => {
    console.log(`API server listening on http://localhost:${port}`);
  });
};

start().catch((error) => {
  console.error('Failed to start server', error);
  process.exit(1);
});
