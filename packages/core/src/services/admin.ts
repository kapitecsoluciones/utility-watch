import type { Pool, RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { hashPassword } from "../auth/password.ts";

export async function adminExists(pool: Pool): Promise<boolean> {
  const [rows] = await pool.query<RowDataPacket[]>("SELECT COUNT(*) AS c FROM users");
  return Number(rows[0]?.c ?? 0) > 0;
}

export interface FirstAdminInput {
  name: string;
  email: string;
  password: string;
}

/**
 * Create the first administrator. Refuses if any user already exists, so the
 * bootstrap cannot be used to mint a second owner (recovery is a separate,
 * local-shell-only command).
 */
export async function createFirstAdmin(pool: Pool, input: FirstAdminInput): Promise<number> {
  if (await adminExists(pool)) {
    throw new Error("An administrator already exists; refusing to create another. Use the recovery command.");
  }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [res] = await conn.query<ResultSetHeader>(
      "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
      [input.name, input.email, hashPassword(input.password)],
    );
    const userId = res.insertId;
    const [roleRows] = await conn.query<RowDataPacket[]>("SELECT id FROM roles WHERE code = 'owner' LIMIT 1");
    const ownerRoleId = roleRows[0]?.id as number | undefined;
    if (!ownerRoleId) {
      throw new Error("Owner role is missing. Run migrations first: utility-watch db:migrate");
    }
    await conn.query("INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)", [userId, ownerRoleId]);
    await conn.commit();
    return userId;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}
