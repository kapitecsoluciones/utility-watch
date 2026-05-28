import type { Pool, RowDataPacket } from "mysql2/promise";

export interface BillSummary {
  id: number;
  run_id: number;
  account_id: number;
  provider_id: string;
  due_date: string | null;
  amount_due: string | null;
  currency: string | null;
  confidence_score: string | null;
  status: string;
}

export interface BillFilter {
  status?: string;
  accountId?: number;
  dueBefore?: string;
}

export async function listBills(pool: Pool, filter: BillFilter = {}): Promise<BillSummary[]> {
  const where: string[] = [];
  const params: unknown[] = [];
  if (filter.status) {
    where.push("status = ?");
    params.push(filter.status);
  }
  if (filter.accountId) {
    where.push("account_id = ?");
    params.push(filter.accountId);
  }
  if (filter.dueBefore) {
    where.push("due_date <= ?");
    params.push(filter.dueBefore);
  }
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, run_id, account_id, provider_id, due_date, amount_due, currency, confidence_score, status
     FROM bills ${clause} ORDER BY id DESC`,
    params,
  );
  return rows as BillSummary[];
}

export async function getBill(pool: Pool, id: number): Promise<RowDataPacket | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT b.*, r.status AS review_status
     FROM bills b
     LEFT JOIN reviews r ON r.bill_id = b.id
     WHERE b.id = ?
     ORDER BY r.id DESC LIMIT 1`,
    [id],
  );
  return rows[0] ?? null;
}
