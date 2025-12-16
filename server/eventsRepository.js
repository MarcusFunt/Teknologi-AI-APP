import { readJsonFile, writeJsonFile } from './jsonStorage.js';
import { sampleEvents } from './sampleEvents.js';

const EVENTS_FILE = 'events.json';

const loadEvents = () => readJsonFile(EVENTS_FILE, []);
const saveEvents = (events) => writeJsonFile(EVENTS_FILE, events);

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

export const ensureSchema = async () => {
  const events = await loadEvents();
  await saveEvents(events);
};

export const seedIfEmpty = async () => {
  const events = await loadEvents();
  if (events.length > 0) return;

  const seeded = sampleEvents.map((event, index) => ({
    id: index + 1,
    title: event.title,
    event_date: event.date,
    event_time: event.time,
    event_type: event.type,
  }));

  await saveEvents(seeded);
};

export const getAllEvents = async () => {
  const events = await loadEvents();
  return sortEvents(events).map(normalizeEvent);
};

export const getEventsByDate = async (date) => {
  const events = await loadEvents();
  const filtered = events.filter((event) => event.event_date === date);
  return sortEvents(filtered).map(normalizeEvent);
};

export const getUpcomingEvents = async (limit = 5) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const events = await loadEvents();
  const filtered = events.filter((event) => new Date(event.event_date) >= today);
  return sortEvents(filtered)
    .slice(0, limit)
    .map(normalizeEvent);
};
