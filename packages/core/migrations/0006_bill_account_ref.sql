-- A single provider account (one portal login) can cover many sub-accounts
-- (e.g. several properties). Tag each bill with the sub-account it belongs to.
ALTER TABLE bills ADD COLUMN account_ref VARCHAR(255) NULL AFTER provider_id;
ALTER TABLE bills ADD KEY idx_bills_account_ref (account_ref);
