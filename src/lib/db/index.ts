import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';
import path from 'path';
import { ensureDataDir } from '../server/dataDir';

const DATA_DIR = ensureDataDir();
const sqlite = new Database(path.join(DATA_DIR, 'data', 'db.sqlite'));
const db = drizzle(sqlite, {
  schema: schema,
});

export default db;
