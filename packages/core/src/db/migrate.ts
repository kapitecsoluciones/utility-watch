import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Pool, RowDataPacket } from "mysql2/promise";

/** Pure: list .sql migration files in lexical order. Testable without a database. */
export async function listMigrationFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir);
  return entries.filter((f) => f.endsWith(".sql")).sort();
}

async function ensureMigrationsTable(pool: Pool): Promise<void> {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS _migrations (
       name VARCHAR(255) NOT NULL PRIMARY KEY,
       applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
     ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  );
}

export async function appliedMigrations(pool: Pool): Promise<Set<string>> {
  await ensureMigrationsTable(pool);
  const [rows] = await pool.query<RowDataPacket[]>("SELECT name FROM _migrations");
  return new Set(rows.map((r) => r.name as string));
}

export async function pendingMigrations(pool: Pool, dir: string): Promise<string[]> {
  const all = await listMigrationFiles(dir);
  const done = await appliedMigrations(pool);
  return all.filter((f) => !done.has(f));
}

/**
 * Apply pending migrations in order. The pool MUST be created with
 * `multipleStatements: true` because each .sql file holds several statements.
 * MySQL DDL auto-commits, so a partial failure cannot be rolled back — keep
 * each migration file independently runnable.
 */
export async function runMigrations(pool: Pool, dir: string): Promise<{ applied: string[] }> {
  const pending = await pendingMigrations(pool, dir);
  const applied: string[] = [];
  for (const file of pending) {
    const sql = await readFile(join(dir, file), "utf8");
    await pool.query(sql);
    await pool.query("INSERT INTO _migrations (name) VALUES (?)", [file]);
    applied.push(file);
  }
  return { applied };
}
