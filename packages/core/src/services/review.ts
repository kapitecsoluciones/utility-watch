import type { Pool, RowDataPacket, ResultSetHeader } from "mysql2/promise";

export type ReviewDecision = "approve" | "reject";

export interface ReviewOptions {
  reviewer?: string;
  notes?: string;
}

export interface ReviewOutcome {
  billId: number;
  decision: ReviewDecision;
  status: string;
}

/**
 * Human (or policy-granted) decision on a bill. Approving makes the bill
 * exportable; rejecting blocks it. Updates the pending review row and the bill
 * status atomically.
 */
export async function reviewBill(
  pool: Pool,
  billId: number,
  decision: ReviewDecision,
  opts: ReviewOptions = {},
): Promise<ReviewOutcome> {
  const [bills] = await pool.query<RowDataPacket[]>("SELECT id FROM bills WHERE id = ?", [billId]);
  if (!bills[0]) throw new Error(`bill ${billId} not found`);

  const status = decision === "approve" ? "approved" : "rejected";
  const reviewer = opts.reviewer ?? "cli";
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [upd] = await conn.query<ResultSetHeader>(
      "UPDATE reviews SET status = ?, reviewer = ?, notes = ? WHERE bill_id = ? AND status = 'pending'",
      [status, reviewer, opts.notes ?? null, billId],
    );
    if (upd.affectedRows === 0) {
      await conn.query("INSERT INTO reviews (bill_id, status, reviewer, notes) VALUES (?, ?, ?, ?)", [
        billId,
        status,
        reviewer,
        opts.notes ?? null,
      ]);
    }
    await conn.query("UPDATE bills SET status = ? WHERE id = ?", [status, billId]);
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
  return { billId, decision, status };
}
