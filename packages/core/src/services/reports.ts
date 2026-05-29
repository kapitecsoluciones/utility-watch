import type { Pool, RowDataPacket } from "mysql2/promise";

export interface ReportSummary {
  totals: {
    providers: number;
    accounts: number;
    bills: number;
    runs: number;
    users: number;
    total_due: number;
  };
  byStatus: { status: string; count: number; total: number }[];
  byProvider: { provider_id: string; count: number; total: number }[];
}

export async function reportSummary(pool: Pool): Promise<ReportSummary> {
  const [totalsRows] = await pool.query<RowDataPacket[]>(
    `SELECT
       (SELECT COUNT(*) FROM providers) AS providers,
       (SELECT COUNT(*) FROM accounts) AS accounts,
       (SELECT COUNT(*) FROM bills) AS bills,
       (SELECT COUNT(*) FROM runs) AS runs,
       (SELECT COUNT(*) FROM users) AS users,
       COALESCE((SELECT SUM(amount_due) FROM bills), 0) AS total_due`,
  );
  const [byStatus] = await pool.query<RowDataPacket[]>(
    "SELECT status, COUNT(*) AS count, COALESCE(SUM(amount_due),0) AS total FROM bills GROUP BY status ORDER BY count DESC",
  );
  const [byProvider] = await pool.query<RowDataPacket[]>(
    "SELECT provider_id, COUNT(*) AS count, COALESCE(SUM(amount_due),0) AS total FROM bills GROUP BY provider_id ORDER BY total DESC",
  );
  const t: RowDataPacket = totalsRows[0] ?? ({} as RowDataPacket);
  return {
    totals: {
      providers: Number(t.providers ?? 0),
      accounts: Number(t.accounts ?? 0),
      bills: Number(t.bills ?? 0),
      runs: Number(t.runs ?? 0),
      users: Number(t.users ?? 0),
      total_due: Number(t.total_due ?? 0),
    },
    byStatus: byStatus as ReportSummary["byStatus"],
    byProvider: byProvider as ReportSummary["byProvider"],
  };
}
