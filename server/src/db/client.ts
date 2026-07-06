/**
 * HAIRVANA — Drizzle ORM database client.
 * Exports a singleton `db` instance and the raw `pool` for advanced use.
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.js';

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://localhost:5432/hairvana';

export const pool = new Pool({ connectionString: DATABASE_URL });

export const db = drizzle(pool, { schema });

export type DB = typeof db;
