import { query } from './db.js';
import { sampleEvents } from './sampleEvents.js';

const rowToEvent = (row) => ({
  id: row.id,
  date: row.event_date,
  title: row.title,
  time: row.event_time,
  type: row.event_type,
});

export const ensureSchema = async () => {
  await query(`
    CREATE TABLE IF NOT EXISTS calendar_events (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      event_date DATE NOT NULL,
      event_time TIME NOT NULL,
      event_type TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await query(
    'CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON calendar_events (event_date);',
  );
};

export const seedIfEmpty = async () => {
  const existing = await query('SELECT COUNT(*) AS count FROM calendar_events;');
  const count = Number(existing.rows[0].count);
  if (count > 0) return;

  const values = sampleEvents.map((event) => [
    event.title,
    event.date,
    event.time,
    event.type,
  ]);

  const placeholders = values
    .map((_, index) => {
      const offset = index * 4;
      return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4})`;
    })
    .join(', ');

  await query(
    `INSERT INTO calendar_events (title, event_date, event_time, event_type) VALUES ${placeholders};`,
    values.flat(),
  );
};

export const getAllEvents = async () => {
  const { rows } = await query(
    'SELECT id, title, event_date, event_time, event_type FROM calendar_events ORDER BY event_date, event_time;',
  );
  return rows.map(rowToEvent);
};

export const getEventsByDate = async (date) => {
  const { rows } = await query(
    `SELECT id, title, event_date, event_time, event_type FROM calendar_events
     WHERE event_date = $1
     ORDER BY event_time;`,
    [date],
  );
  return rows.map(rowToEvent);
};

export const getUpcomingEvents = async (limit = 5) => {
  const { rows } = await query(
    `SELECT id, title, event_date, event_time, event_type FROM calendar_events
     WHERE event_date >= CURRENT_DATE
     ORDER BY event_date, event_time
     LIMIT $1;`,
    [limit],
  );
  return rows.map(rowToEvent);
};
