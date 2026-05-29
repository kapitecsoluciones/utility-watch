import type { Pool, RowDataPacket } from "mysql2/promise";

// An obligation is the recurring "thing that accrues a balance": one per
// (provider_id, account_ref). It is auto-upserted from each bill so the
// console can show current balance + history per account, grouped by property.

export interface UpsertObligation {
  providerId: string;
  accountRef: string;
  label?: string | null;
  amountDue: number | null;
  dueDate: string | null; // ISO or null
  runId: number;
}

/** Upsert the obligation for a bill's (provider, account_ref). No-op when account_ref is empty. */
export async function upsertObligationFromBill(pool: Pool, o: UpsertObligation): Promise<void> {
  if (!o.accountRef) return;
  await pool.query(
    `INSERT INTO obligations (provider_id, account_ref, label, current_balance, current_due_date, last_seen_run_id)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       current_balance = VALUES(current_balance),
       current_due_date = VALUES(current_due_date),
       last_seen_run_id = VALUES(last_seen_run_id),
       label = COALESCE(label, VALUES(label))`,
    [o.providerId, o.accountRef, o.label ?? null, o.amountDue, o.dueDate, o.runId],
  );
}

export type ObligationStatus = "paid" | "arrangement" | "cancelled" | "overdue" | "due_soon" | "due" | "unknown";

interface StatusInput {
  current_balance: number | string | null;
  current_due_date: string | null;
  due_day: number | null;
  is_cancelled: number;
  is_payment_arrangement: number;
}

/** Derive a status from balance + due info. `today` is ISO (YYYY-MM-DD). */
export function computeStatus(o: StatusInput, today: string): ObligationStatus {
  if (o.is_cancelled) return "cancelled";
  if (o.is_payment_arrangement) return "arrangement";
  const bal = o.current_balance == null ? null : Number(o.current_balance);
  if (bal == null) return "unknown";
  if (bal <= 0) return "paid";
  // balance owed — overdue if the due date (or due-day this month) is past
  let dueIso: string | null = o.current_due_date ? String(o.current_due_date).slice(0, 10) : null;
  if (!dueIso && o.due_day && o.due_day >= 1 && o.due_day <= 31) {
    dueIso = `${today.slice(0, 7)}-${String(o.due_day).padStart(2, "0")}`;
  }
  if (dueIso && dueIso < today) return "overdue";
  if (dueIso) {
    const days = (Date.parse(dueIso) - Date.parse(today)) / 86400000;
    if (days <= 7) return "due_soon";
  }
  return "due";
}

export interface ObligationRow extends RowDataPacket {
  id: number;
  provider_id: string;
  account_ref: string;
  property_id: number | null;
  property_name: string | null;
  category_id: number | null;
  category_name: string | null;
  label: string | null;
  account_type: string | null;
  due_day: number | null;
  payment_method: string | null;
  is_autopay: number;
  paid_by_tenant: number;
  is_cancelled: number;
  is_payment_arrangement: number;
  currency: string;
  current_balance: string | null;
  current_due_date: string | null;
  last_seen_run_id: number | null;
  last_payment_date: string | null;
  last_payment_amount: string | null;
}

export interface ObligationFilters {
  propertyId?: number;
  categoryId?: number;
  status?: string;
  search?: string;
  sort?: string;
  order?: "ASC" | "DESC";
}

const SORTABLE: Record<string, string> = {
  provider: "o.provider_id",
  balance: "o.current_balance",
  due: "o.current_due_date",
  property: "property_name",
  account: "o.account_ref",
};

export async function listObligations(pool: Pool, f: ObligationFilters, today: string) {
  const where: string[] = [];
  const params: unknown[] = [];
  if (f.propertyId) { where.push("o.property_id = ?"); params.push(f.propertyId); }
  if (f.categoryId) { where.push("o.category_id = ?"); params.push(f.categoryId); }
  if (f.search) {
    const like = `%${f.search}%`;
    where.push("(o.provider_id LIKE ? OR o.account_ref LIKE ? OR o.label LIKE ? OR p.name LIKE ?)");
    params.push(like, like, like, like);
  }
  const sortCol = SORTABLE[f.sort ?? "provider"] ?? "o.provider_id";
  const order = f.order === "DESC" ? "DESC" : "ASC";
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const [rows] = await pool.query<ObligationRow[]>(
    `SELECT o.*, p.name AS property_name, c.name AS category_name, pr.utility_type AS utility_type
     FROM obligations o
     LEFT JOIN properties p ON o.property_id = p.id
     LEFT JOIN categories c ON o.category_id = c.id
     LEFT JOIN providers pr ON o.provider_id = pr.id
     ${whereSql} ORDER BY ${sortCol} ${order}`,
    params,
  );
  let out = rows.map((r) => ({ ...r, status: computeStatus(r, today) }));
  if (f.status) out = out.filter((r) => r.status === f.status);
  return out;
}

export async function getObligation(pool: Pool, id: number, today: string) {
  const [rows] = await pool.query<ObligationRow[]>(
    `SELECT o.*, p.name AS property_name, c.name AS category_name, pr.utility_type AS utility_type
     FROM obligations o
     LEFT JOIN properties p ON o.property_id = p.id
     LEFT JOIN categories c ON o.category_id = c.id
     LEFT JOIN providers pr ON o.provider_id = pr.id
     WHERE o.id = ?`,
    [id],
  );
  const o = rows[0];
  if (!o) return null;
  const [history] = await pool.query<RowDataPacket[]>(
    `SELECT b.id, b.run_id, b.amount_due, b.currency, b.due_date, b.status, b.confidence_score, r.started_at
     FROM bills b JOIN runs r ON b.run_id = r.id
     WHERE b.provider_id = ? AND b.account_ref = ?
     ORDER BY b.run_id DESC LIMIT 100`,
    [o.provider_id, o.account_ref],
  );
  const [payments] = await pool.query<RowDataPacket[]>(
    "SELECT id, payment_date, amount, payment_method, source, notes FROM payments WHERE obligation_id = ? ORDER BY payment_date DESC, id DESC",
    [id],
  );
  return { ...o, status: computeStatus(o, today), history, payments };
}

/** Set the editable metadata on an obligation (property/category/type/flags/notes). */
export async function setObligationMeta(pool: Pool, id: number, meta: Record<string, unknown>): Promise<void> {
  const cols: string[] = [];
  const params: unknown[] = [];
  const allow: Record<string, (v: unknown) => unknown> = {
    property_id: (v) => (v == null ? null : Number(v)),
    category_id: (v) => (v == null ? null : Number(v)),
    label: (v) => (v == null ? null : String(v)),
    account_type: (v) => (v == null ? null : String(v)),
    due_day: (v) => (v == null ? null : Number(v)),
    payment_method: (v) => (v == null ? null : String(v)),
    is_autopay: (v) => (v ? 1 : 0),
    paid_by_tenant: (v) => (v ? 1 : 0),
    is_cancelled: (v) => (v ? 1 : 0),
    is_payment_arrangement: (v) => (v ? 1 : 0),
    notes: (v) => (v == null ? null : String(v)),
  };
  for (const [k, fn] of Object.entries(allow)) {
    if (k in meta) { cols.push(`${k} = ?`); params.push(fn(meta[k])); }
  }
  if (!cols.length) return;
  params.push(id);
  await pool.query(`UPDATE obligations SET ${cols.join(", ")} WHERE id = ?`, params);
}

/** At-a-glance financial KPIs for the Overview. */
export async function financialKpis(pool: Pool, today: string) {
  const obs = await listObligations(pool, {}, today);
  const active = obs.filter((o) => !o.is_cancelled);
  const sum = (rows: typeof active) => rows.reduce((s, o) => s + Number(o.current_balance || 0), 0);
  const overdue = active.filter((o) => o.status === "overdue");
  const due = active.filter((o) => o.status === "due");
  const monthStart = today.slice(0, 8) + "01";
  const [pm] = await pool.query<RowDataPacket[]>(
    "SELECT COALESCE(SUM(amount),0) paid, COUNT(*) cnt FROM payments WHERE payment_date >= ?",
    [monthStart],
  );
  return {
    totalOwed: sum(active),
    overdueTotal: sum(overdue),
    overdueCount: overdue.length,
    dueCount: due.length,
    accountCount: active.length,
    paidThisMonth: Number(pm[0]?.paid ?? 0),
    paymentCount: Number(pm[0]?.cnt ?? 0),
  };
}

/** Trend data: payments by month + currently-owed by category. */
export async function trends(pool: Pool) {
  const [pm] = await pool.query<RowDataPacket[]>(
    "SELECT DATE_FORMAT(payment_date,'%Y-%m') ym, ROUND(SUM(amount),2) total FROM payments GROUP BY ym ORDER BY ym DESC LIMIT 12",
  );
  const paymentsByMonth = pm.map((r) => ({ ym: r.ym, total: Number(r.total) })).reverse();
  const [oc] = await pool.query<RowDataPacket[]>(
    `SELECT COALESCE(pr.utility_type,'other') cat, ROUND(SUM(o.current_balance),2) total
     FROM obligations o LEFT JOIN providers pr ON o.provider_id = pr.id
     WHERE o.is_cancelled = 0 AND o.current_balance > 0 GROUP BY cat ORDER BY total DESC`,
  );
  const owedByCategory = oc.map((r) => ({ category: r.cat, total: Number(r.total) }));
  return { paymentsByMonth, owedByCategory };
}

/** Per-provider scraper health: last run, last success, failures, latest status, accounts. */
export async function providerHealth(pool: Pool) {
  const [agg] = await pool.query<RowDataPacket[]>(
    `SELECT provider_id, MAX(started_at) AS last_run,
            MAX(CASE WHEN status <> 'failed' THEN started_at END) AS last_success,
            SUM(status = 'failed') AS failed, COUNT(*) AS total
     FROM runs GROUP BY provider_id ORDER BY provider_id`,
  );
  const [latest] = await pool.query<RowDataPacket[]>(
    `SELECT r.provider_id, r.status FROM runs r
     JOIN (SELECT provider_id, MAX(id) mid FROM runs GROUP BY provider_id) m ON r.id = m.mid`,
  );
  const lastStatus: Record<string, string> = {};
  for (const r of latest) lastStatus[r.provider_id] = r.status;
  const [acc] = await pool.query<RowDataPacket[]>("SELECT provider_id, COUNT(*) n FROM accounts GROUP BY provider_id");
  const accCount: Record<string, number> = {};
  for (const r of acc) accCount[r.provider_id] = Number(r.n);
  return agg.map((r) => ({
    provider_id: r.provider_id,
    last_run: r.last_run,
    last_success: r.last_success,
    failed: Number(r.failed),
    total: Number(r.total),
    accounts: accCount[r.provider_id] ?? 0,
    last_status: lastStatus[r.provider_id] ?? "?",
    healthy: (lastStatus[r.provider_id] ?? "") !== "failed",
  }));
}
