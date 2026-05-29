import type { Pool, RowDataPacket } from "mysql2/promise";

export interface UserRow {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  status: string;
}

export async function getUserByEmail(pool: Pool, email: string): Promise<UserRow | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT id, name, email, password_hash, status FROM users WHERE email = ? LIMIT 1",
    [email],
  );
  return (rows[0] as UserRow) ?? null;
}

export async function getUserById(pool: Pool, id: number): Promise<UserRow | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT id, name, email, password_hash, status FROM users WHERE id = ? LIMIT 1",
    [id],
  );
  return (rows[0] as UserRow) ?? null;
}

/** Effective capabilities for a user (union across assigned roles). */
export async function getCapabilities(pool: Pool, userId: number): Promise<Set<string>> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT DISTINCT rc.capability
       FROM user_roles ur
       JOIN role_capabilities rc ON rc.role_id = ur.role_id
      WHERE ur.user_id = ?`,
    [userId],
  );
  return new Set(rows.map((r) => r.capability as string));
}
