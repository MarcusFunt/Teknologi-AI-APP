const MAX_LOGS = 500;

const logs = [];
let nextId = 1;

const safeStringify = (value) => {
  if (typeof value === 'string') {
    return value;
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch (error) {
    return `Unserializable value: ${error.message}`;
  }
};

export const addLog = ({ source, level = 'info', message, detail }) => {
  const entry = {
    id: nextId++,
    timestamp: new Date().toISOString(),
    source,
    level,
    message,
    detail: detail ? safeStringify(detail) : '',
  };

  logs.push(entry);

  if (logs.length > MAX_LOGS) {
    logs.shift();
  }

  return entry;
};

export const getLogs = ({ sinceId = 0 } = {}) => logs.filter((log) => log.id > sinceId);
