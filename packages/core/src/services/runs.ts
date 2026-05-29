import type { Pool, RowDataPacket } from "mysql2/promise";

export async function getRun(pool: Pool, id: number): Promise<RowDataPacket | null> {
  const [rows] = await pool.query<RowDataPacket[]>("SELECT * FROM runs WHERE id = ?", [id]);
  return rows[0] ?? null;
}

export async function listRuns(pool: Pool, limit = 50): Promise<RowDataPacket[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT r.id, r.account_id, r.provider_id, r.adapter, r.status, r.error_code,
            r.started_at, r.finished_at, a.display_name AS account
       FROM runs r LEFT JOIN accounts a ON a.id = r.account_id
      ORDER BY r.id DESC LIMIT ?`,
    [limit],
  );
  return rows;
}

export interface RunDetail {
  run: RowDataPacket;
  artifacts: RowDataPacket[];
  logs: RowDataPacket[];
}

/** A run plus its artifacts and audit log. Used by the CLI and the MCP get_run tool. */
export async function getRunDetail(pool: Pool, id: number): Promise<RunDetail | null> {
  const run = await getRun(pool, id);
  if (!run) return null;
  const [artifacts, logs] = await Promise.all([
    pool
      .query<RowDataPacket[]>("SELECT id, type, path, sha256, redaction_status FROM artifacts WHERE run_id = ?", [id])
      .then((r) => r[0]),
    pool
      .query<RowDataPacket[]>("SELECT level, event, message FROM run_logs WHERE run_id = ? ORDER BY id", [id])
      .then((r) => r[0]),
  ]);
  return { run, artifacts, logs };
}
