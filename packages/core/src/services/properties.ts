import type { Pool, RowDataPacket, ResultSetHeader } from "mysql2/promise";

export interface PropertyRollup extends RowDataPacket {
  id: number;
  name: string;
  address: string | null;
  type: string | null;
  notes: string | null;
  obligation_count: number;
  total_balance: string | null;
}

/** Properties with a rollup of their obligations' current balance. */
export async function listProperties(pool: Pool): Promise<PropertyRollup[]> {
  const [rows] = await pool.query<PropertyRollup[]>(
    `SELECT p.id, p.name, p.address, p.type, p.notes,
            COUNT(o.id) AS obligation_count,
            COALESCE(SUM(o.current_balance), 0) AS total_balance
     FROM properties p
     LEFT JOIN obligations o ON o.property_id = p.id AND o.is_cancelled = 0
     GROUP BY p.id ORDER BY p.name`,
  );
  return rows;
}

export async function createProperty(pool: Pool, p: { name: string; address?: string; type?: string; notes?: string }): Promise<number> {
  const [res] = await pool.query<ResultSetHeader>(
    "INSERT INTO properties (name, address, type, notes) VALUES (?, ?, ?, ?)",
    [p.name, p.address ?? null, p.type ?? null, p.notes ?? null],
  );
  return res.insertId;
}

export async function updateProperty(pool: Pool, id: number, p: { name?: string; address?: string; type?: string; notes?: string }): Promise<void> {
  const cols: string[] = [];
  const params: unknown[] = [];
  for (const k of ["name", "address", "type", "notes"] as const) {
    if (k in p) { cols.push(`${k} = ?`); params.push((p as Record<string, unknown>)[k] ?? null); }
  }
  if (!cols.length) return;
  params.push(id);
  await pool.query(`UPDATE properties SET ${cols.join(", ")} WHERE id = ?`, params);
}

export async function deleteProperty(pool: Pool, id: number): Promise<void> {
  await pool.query("UPDATE obligations SET property_id = NULL WHERE property_id = ?", [id]);
  await pool.query("DELETE FROM properties WHERE id = ?", [id]);
}
