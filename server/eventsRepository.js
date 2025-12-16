import { readJsonFile, writeJsonFile } from './jsonStorage.js';
import { sampleEvents } from './sampleEvents.js';

const EVENTS_FILE = 'events';

const getEventsFileName = (userId) => `${EVENTS_FILE}-${userId}.json`;

const loadEvents = (userId) => readJsonFile(getEventsFileName(userId), []);
const saveEvents = (userId, events) => writeJsonFile(getEventsFileName(userId), events);

const normalizeEvent = (event) => ({
  id: event.id,
  date: event.event_date,
  title: event.title,
  time: event.event_time,
  type: event.event_type,
});

const sortEvents = (events) =>
  [...events].sort((a, b) => {
    if (a.event_date === b.event_date) {
      return a.event_time.localeCompare(b.event_time);
    }
    return a.event_date.localeCompare(b.event_date);
  });

const seedUserEvents = async (userId) => {
  const seeded = sampleEvents.map((event, index) => ({
    id: index + 1,
    title: event.title,
    event_date: event.date,
    event_time: event.time,
    event_type: event.type,
  }));

  await saveEvents(userId, seeded);
  return seeded;
};

const loadOrSeedEvents = async (userId, startDate = null) => {
  let events = await loadEvents(userId);
  if (events.length === 0) {
    events = await seedUserEvents(userId);
  }

  if (startDate) {
    return events.filter((event) => new Date(event.event_date) >= startDate);
  }
  return events;
};

export const ensureSchema = async () => {
  // Data directory is created lazily by jsonStorage helpers.
};

export const seedIfEmpty = async () => {
  // Seeding now happens per user when they first access their calendar.
};

export const getAllEvents = async (userId) => {
  const events = await loadOrSeedEvents(userId);
  return sortEvents(events).map(normalizeEvent);
};

export const getEventsByDate = async (userId, date) => {
  const events = await loadOrSeedEvents(userId);
  const filtered = events.filter((event) => event.event_date === date);
  return sortEvents(filtered).map(normalizeEvent);
};

export const getUpcomingEvents = async (userId, limit = 5) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const events = await loadOrSeedEvents(userId, today);
  return sortEvents(events).slice(0, limit).map(normalizeEvent);
};
