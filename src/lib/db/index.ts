/**
 * The SQLite connection, opened lazily.
 *
 * Opening at import time meant *importing* any route module opened
 * (and, if missing, silently created) `reps.db` — including during
 * `next build`, where route modules are evaluated to collect page data.
 * An empty file created there then fails every query with the unhelpful
 * "no such table". Now nothing touches the disk until the first query,
 * and a missing database is a clear error telling you to seed.
 *
 * The handle is cached on `globalThis` so dev-mode hot reloads reuse one
 * connection instead of leaking a new one per edit.
 */
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";

type Db = BetterSQLite3Database<typeof schema>;

/** `REPS_DB_PATH` overrides the location (scripts, tests, alternate profiles). */
export function databasePath(): string {
  return process.env.REPS_DB_PATH || path.join(process.cwd(), "reps.db");
}

const cache = globalThis as unknown as { __repsDb?: { db: Db; sqlite: Database.Database } };

function open(): { db: Db; sqlite: Database.Database } {
  if (cache.__repsDb) return cache.__repsDb;

  const file = databasePath();
  let sqlite: Database.Database;
  try {
    sqlite = new Database(file, { fileMustExist: true });
  } catch (error) {
    throw new Error(
      `Could not open the Reps database at ${file}. Run \`npm run db:seed\` first.`,
      { cause: error }
    );
  }

  // WAL for concurrent reads while a write is in flight; FKs so deleting
  // content cascades to the cards and attempts that reference it.
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");

  cache.__repsDb = { db: drizzle(sqlite, { schema }), sqlite };
  return cache.__repsDb;
}

/** The raw better-sqlite3 handle, for the rare statement Drizzle can't express. */
export function getSqlite(): Database.Database {
  return open().sqlite;
}

/**
 * The Drizzle client. A proxy so `import { db }` stays exactly as before
 * while the connection itself opens on first use.
 */
export const db: Db = new Proxy({} as Db, {
  get(_target, prop) {
    const real = open().db;
    const value = Reflect.get(real, prop, real);
    return typeof value === "function" ? value.bind(real) : value;
  },
});

export { schema };
