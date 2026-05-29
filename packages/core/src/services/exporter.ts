import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { Pool, RowDataPacket } from "mysql2/promise";

export interface ExportResult {
  billId: number;
  path: string;
  payload: unknown;
}

/**
 * Export an approved bill as deterministic JSON. Fails closed: a bill must be
 * approved first. Writes <exportsDir>/bill-<id>.json, records an exports row,
 * and marks the bill exported.
 */
export async function exportBill(pool: Pool, billId: number, exportsDir: string): Promise<ExportResult> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT id, status, normalized_json FROM bills WHERE id = ?",
    [billId],
  );
  const bill = rows[0];
  if (!bill) throw new Error(`bill ${billId} not found`);
  if (bill.status !== "approved") {
    throw new Error(`bill ${billId} is '${bill.status}'; only approved bills can be exported`);
  }

  const payload = typeof bill.normalized_json === "string" ? JSON.parse(bill.normalized_json) : bill.normalized_json;
  const json = JSON.stringify(payload, null, 2);

  await mkdir(exportsDir, { recursive: true });
  const path = join(exportsDir, `bill-${billId}.json`);
  await writeFile(path, json, "utf8");

  await pool.query(
    "INSERT INTO exports (bill_id, format, payload_json, destination, status) VALUES (?, 'json', ?, ?, 'created')",
    [billId, json, path],
  );
  await pool.query("UPDATE bills SET status = 'exported' WHERE id = ?", [billId]);

  return { billId, path, payload };
}
