import type { Pool, RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { hashPassword } from "../auth/password.ts";

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

export interface UserListRow {
  id: number;
  name: string;
  email: string;
  status: string;
  roles: string | null;
  last_login_at: string | null;
}

export async function listUsers(pool: Pool): Promise<UserListRow[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT u.id, u.name, u.email, u.status, u.last_login_at,
            GROUP_CONCAT(r.code ORDER BY r.code SEPARATOR ', ') AS roles
       FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       LEFT JOIN roles r ON r.id = ur.role_id
      GROUP BY u.id ORDER BY u.id`,
  );
  return rows as UserListRow[];
}

export interface NewUser {
  name: string;
  email: string;
  password: string;
  roleCode: string;
}

/** Create a user and assign one role. Throws on duplicate email or unknown role. */
export async function createUser(pool: Pool, input: NewUser): Promise<number> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [roleRows] = await conn.query<RowDataPacket[]>("SELECT id FROM roles WHERE code = ? LIMIT 1", [input.roleCode]);
    const roleId = roleRows[0]?.id as number | undefined;
    if (!roleId) throw new Error(`unknown role '${input.roleCode}'`);
    const [res] = await conn.query<ResultSetHeader>(
      "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
      [input.name, input.email, hashPassword(input.password)],
    );
    await conn.query("INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)", [res.insertId, roleId]);
    await conn.commit();
    return res.insertId;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
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
