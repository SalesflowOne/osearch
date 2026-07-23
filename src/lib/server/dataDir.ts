import fs from 'fs';
import path from 'path';

export const getDataDir = () => process.env.DATA_DIR || process.cwd();

export const ensureDataDir = (dataDir = getDataDir()) => {
  fs.mkdirSync(path.join(dataDir, 'data'), { recursive: true });
  return dataDir;
};
