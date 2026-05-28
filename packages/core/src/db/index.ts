import mysql from "mysql2/promise";
import type { Pool } from "mysql2/promise";
import type { DbConfig } from "../config/index.ts";

export function createPool(db: DbConfig, opts: { multipleStatements?: boolean } = {}): Pool {
  return mysql.createPool({
    host: db.host,
    port: db.port,
    user: db.user,
    password: db.password,
    database: db.database,
    waitForConnections: true,
    connectionLimit: 5,
    multipleStatements: opts.multipleStatements ?? false,
    dateStrings: true,
  });
}

export async function ping(pool: Pool): Promise<void> {
  const conn = await pool.getConnection();
  try {
    await conn.ping();
  } finally {
    conn.release();
  }
}
