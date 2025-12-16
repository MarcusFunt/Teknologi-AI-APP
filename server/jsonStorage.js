import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const dataDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'data');

const ensureDataDir = () => mkdir(dataDir, { recursive: true });

export const readJsonFile = async (fileName, defaultValue) => {
  await ensureDataDir();
  const filePath = path.join(dataDir, fileName);

  try {
    const content = await readFile(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return defaultValue;
    }
    throw error;
  }
};

export const writeJsonFile = async (fileName, data) => {
  await ensureDataDir();
  const filePath = path.join(dataDir, fileName);
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
};
