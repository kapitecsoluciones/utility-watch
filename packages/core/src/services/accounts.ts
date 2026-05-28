import type { Pool, RowDataPacket, ResultSetHeader } from "mysql2/promise";

export interface NewAccount {
  providerId: string;
  displayName: string;
  externalRef?: string;
  secretHandle?: string;
  brightdataAllowed?: boolean;
}

export interface AccountRow {
  id: number;
  provider_id: string;
  display_name: string;
  external_account_ref: string | null;
  secret_handle: string | null;
  brightdata_allowed: number;
  status: string;
}

export async function createAccount(pool: Pool, input: NewAccount): Promise<number> {
  const [prov] = await pool.query<RowDataPacket[]>(
    "SELECT id, country, utility_type FROM providers WHERE id = ?",
    [input.providerId],
  );
  const provider = prov[0];
  if (!provider) {
    throw new Error(`provider '${input.providerId}' is not installed; run providers:install first`);
  }
  const [res] = await pool.query<ResultSetHeader>(
    `INSERT INTO accounts (provider_id, display_name, external_account_ref, country, utility_type, secret_handle, brightdata_allowed)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      input.providerId,
      input.displayName,
      input.externalRef ?? null,
      provider.country,
      provider.utility_type,
      input.secretHandle ?? null,
      input.brightdataAllowed ? 1 : 0,
    ],
  );
  return res.insertId;
}

export async function getAccount(pool: Pool, id: number): Promise<AccountRow | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT id, provider_id, display_name, external_account_ref, secret_handle, brightdata_allowed, status FROM accounts WHERE id = ?",
    [id],
  );
  return (rows[0] as AccountRow) ?? null;
}

export async function listAccounts(pool: Pool): Promise<AccountRow[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT id, provider_id, display_name, external_account_ref, secret_handle, brightdata_allowed, status FROM accounts ORDER BY id",
  );
  return rows as AccountRow[];
}
