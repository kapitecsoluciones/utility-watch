import type { Pool, RowDataPacket } from "mysql2/promise";
import { pendingMigrations } from "../db/migrate.ts";

export interface SetupState {
  dbReachable: boolean;
  pendingMigrations: number;
  adminExists: boolean;
  setupCompleted: boolean;
}

/** Idempotent, read-only snapshot of where the install is in its lifecycle. */
export async function getSetupState(pool: Pool, migrationsDir: string): Promise<SetupState> {
  const state: SetupState = {
    dbReachable: false,
    pendingMigrations: -1,
    adminExists: false,
    setupCompleted: false,
  };
  try {
    await pool.query("SELECT 1");
    state.dbReachable = true;
    const pending = await pendingMigrations(pool, migrationsDir);
    state.pendingMigrations = pending.length;
    if (pending.length === 0) {
      const [users] = await pool.query<RowDataPacket[]>("SELECT COUNT(*) AS c FROM users");
      state.adminExists = Number(users[0]?.c ?? 0) > 0;
      const [install] = await pool.query<RowDataPacket[]>(
        "SELECT setup_completed_at FROM installations ORDER BY id LIMIT 1",
      );
      state.setupCompleted = Boolean(install[0]?.setup_completed_at);
    }
  } catch {
    // DB unreachable or schema not yet migrated — leave defaults.
  }
  return state;
}
