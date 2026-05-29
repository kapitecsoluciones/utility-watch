import type { Pool, RowDataPacket } from "mysql2/promise";

export interface AuditEntry {
  actor?: string | null;
  actorKind?: "operator" | "agent" | "system";
  action: string;
  targetType?: string | null;
  targetId?: string | number | null;
  outcome?: "ok" | "deny" | "fail";
  ip?: string | null;
  detail?: unknown;
}

/**
 * Append an audit record. Never throws: auditing must not break the action it
 * records. A failed insert is written to stderr and swallowed.
 */
export async function logAudit(pool: Pool, e: AuditEntry): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO audit_log (actor, actor_kind, action, target_type, target_id, outcome, ip, detail)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        e.actor ?? null,
        e.actorKind ?? "operator",
        e.action,
        e.targetType ?? null,
        e.targetId == null ? null : String(e.targetId),
        e.outcome ?? "ok",
        e.ip ?? null,
        e.detail === undefined ? null : JSON.stringify(e.detail),
      ],
    );
  } catch (err) {
    process.stderr.write(`[audit] failed to record ${e.action}: ${(err as Error).message}\n`);
  }
}

export interface AuditRow {
  id: number;
  ts: string;
  actor: string | null;
  actor_kind: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  outcome: string;
  ip: string | null;
  detail: unknown;
}

export async function listAudit(pool: Pool, limit = 200): Promise<AuditRow[]> {
  const lim = Number.isInteger(limit) && limit > 0 && limit <= 1000 ? limit : 200;
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, ts, actor, actor_kind, action, target_type, target_id, outcome, ip, detail
     FROM audit_log ORDER BY id DESC LIMIT ?`,
    [lim],
  );
  return rows as AuditRow[];
}
