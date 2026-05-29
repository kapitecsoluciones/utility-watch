import type { Pool, RowDataPacket, ResultSetHeader } from "mysql2/promise";

// Payments against an obligation. Adding a payment decrements the obligation's
// current_balance and updates its last_payment_* fields (matches the prior
// dashboard behavior). source is 'manual' for operator entries.

export async function listPayments(pool: Pool, obligationId: number): Promise<RowDataPacket[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT id, payment_date, amount, payment_method, source, notes, created_at FROM payments WHERE obligation_id = ? ORDER BY payment_date DESC, id DESC",
    [obligationId],
  );
  return rows;
}

export interface NewPayment {
  obligationId: number;
  paymentDate: string; // ISO
  amount: number;
  paymentMethod?: string;
  notes?: string;
  source?: "manual" | "scraped";
}

/** Record a payment and decrement the obligation balance. Returns the new balance. */
export async function addPayment(pool: Pool, p: NewPayment): Promise<{ id: number; newBalance: number }> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [obRows] = await conn.query<RowDataPacket[]>("SELECT current_balance FROM obligations WHERE id = ? FOR UPDATE", [p.obligationId]);
    if (!obRows[0]) throw new Error("obligation not found");
    const [res] = await conn.query<ResultSetHeader>(
      "INSERT INTO payments (obligation_id, payment_date, amount, payment_method, source, notes) VALUES (?, ?, ?, ?, ?, ?)",
      [p.obligationId, p.paymentDate, p.amount, p.paymentMethod ?? null, p.source ?? "manual", p.notes ?? null],
    );
    const cur = obRows[0].current_balance == null ? 0 : Number(obRows[0].current_balance);
    const newBalance = Math.max(0, cur - p.amount);
    await conn.query(
      "UPDATE obligations SET current_balance = ?, last_payment_date = ?, last_payment_amount = ? WHERE id = ?",
      [newBalance, p.paymentDate, p.amount, p.obligationId],
    );
    await conn.commit();
    return { id: res.insertId, newBalance };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

export async function deletePayment(pool: Pool, id: number): Promise<void> {
  await pool.query("DELETE FROM payments WHERE id = ?", [id]);
}
