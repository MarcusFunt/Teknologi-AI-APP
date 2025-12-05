const formatDate = (date) => date.toLocaleDateString('en-CA');

const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const today = new Date();

const createEvent = (offsetDays, title, time, type) => ({
  date: formatDate(addDays(today, offsetDays)),
  title,
  time,
  type,
});

export const sampleEvents = [
  createEvent(2, 'Design critique', '09:30', 'meeting'),
  createEvent(4, 'Engineering sync', '11:00', 'meeting'),
  createEvent(6, 'Launch prep', '15:00', 'milestone'),
  createEvent(8, 'Team offsite', '10:00', 'social'),
  createEvent(10, 'Sprint planning', '14:00', 'planning'),
  createEvent(13, 'Customer demo', '16:00', 'demo'),
  createEvent(16, 'Wellness hour', '12:30', 'wellness'),
  createEvent(20, 'Hackathon', '09:00', 'social'),
  createEvent(24, 'Roadmap review', '13:30', 'planning'),
  createEvent(28, 'Birthday celebration', '17:00', 'social'),
];
