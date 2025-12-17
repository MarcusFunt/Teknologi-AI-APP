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

const normalizeInput = (event) => ({
  id: event.id,
  title: event.title,
  event_date: event.date,
  event_time: event.time,
  event_type: event.type,
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

export const applyEventOperations = async (userId, operations = []) => {
  let events = await loadOrSeedEvents(userId);
  const results = [];

  const nextId = () => events.reduce((max, event) => Math.max(max, event.id), 0) + 1;

  for (const [index, operation] of operations.entries()) {
    const { action } = operation;

    if (!['create', 'update', 'delete'].includes(action)) {
      results.push({
        index,
        status: 'skipped',
        reason: 'Unsupported action',
      });
      continue;
    }

    if (action === 'create') {
      const payload = normalizeInput(operation);
      if (!payload.event_date || !payload.event_time || !payload.title) {
        results.push({
          index,
          status: 'skipped',
          reason: 'Create requires title, date, and time',
        });
        continue;
      }

      const newEvent = {
        ...payload,
        id: nextId(),
        event_type: payload.event_type || 'meeting',
      };
      events.push(newEvent);
      results.push({ index, status: 'created', event: normalizeEvent(newEvent) });
      continue;
    }

    if (!operation.id) {
      results.push({
        index,
        status: 'skipped',
        reason: 'Update/delete operations require an id',
      });
      continue;
    }

    const eventIndex = events.findIndex((entry) => entry.id === operation.id);
    if (eventIndex === -1) {
      results.push({
        index,
        status: 'skipped',
        reason: 'Event not found',
      });
      continue;
    }

    if (action === 'delete') {
      const [removed] = events.splice(eventIndex, 1);
      results.push({ index, status: 'deleted', event: normalizeEvent(removed) });
      continue;
    }

    const updates = normalizeInput(operation);
    events[eventIndex] = {
      ...events[eventIndex],
      ...updates,
      event_type: updates.event_type || events[eventIndex].event_type,
    };
    results.push({ index, status: 'updated', event: normalizeEvent(events[eventIndex]) });
  }

  await saveEvents(userId, events);

  return {
    events: sortEvents(events).map(normalizeEvent),
    results,
  };
};
