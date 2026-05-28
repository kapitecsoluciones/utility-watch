-- Utility Watch schema v0 (see PLAN.md §11 Data Model).
-- MySQL 8, InnoDB, utf8mb4. Single-tenant local install.

CREATE TABLE installations (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  site_name       VARCHAR(255) NOT NULL,
  base_url        VARCHAR(512) NULL,
  install_type    VARCHAR(32) NOT NULL DEFAULT 'local-demo',
  timezone        VARCHAR(64) NOT NULL DEFAULT 'UTC',
  default_currency CHAR(3) NOT NULL DEFAULT 'USD',
  setup_completed_at DATETIME NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE users (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name            VARCHAR(255) NOT NULL,
  email           VARCHAR(255) NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,
  status          VARCHAR(32) NOT NULL DEFAULT 'active',
  last_login_at   DATETIME NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE roles (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code            VARCHAR(64) NOT NULL,
  name            VARCHAR(255) NOT NULL,
  description     VARCHAR(512) NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_roles_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE user_roles (
  user_id         BIGINT UNSIGNED NOT NULL,
  role_id         BIGINT UNSIGNED NOT NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, role_id),
  CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE role_capabilities (
  role_id         BIGINT UNSIGNED NOT NULL,
  capability      VARCHAR(64) NOT NULL,
  PRIMARY KEY (role_id, capability),
  CONSTRAINT fk_role_caps_role FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE settings (
  `key`           VARCHAR(128) NOT NULL,
  value_json      JSON NOT NULL,
  sensitivity     VARCHAR(32) NOT NULL DEFAULT 'normal',
  updated_by      BIGINT UNSIGNED NULL,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE providers (
  id              VARCHAR(64) NOT NULL,
  name            VARCHAR(255) NOT NULL,
  country         CHAR(2) NOT NULL,
  utility_type    VARCHAR(32) NOT NULL,
  registry_status VARCHAR(32) NOT NULL DEFAULT 'draft',
  current_version VARCHAR(32) NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE provider_versions (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  provider_id     VARCHAR(64) NOT NULL,
  version         VARCHAR(32) NOT NULL,
  manifest_json   JSON NOT NULL,
  verification_level VARCHAR(32) NOT NULL DEFAULT 'draft',
  checksum        CHAR(64) NULL,
  released_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_provider_version (provider_id, version),
  CONSTRAINT fk_pv_provider FOREIGN KEY (provider_id) REFERENCES providers (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE accounts (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  provider_id     VARCHAR(64) NOT NULL,
  display_name    VARCHAR(255) NOT NULL,
  external_account_ref VARCHAR(255) NULL,
  country         CHAR(2) NULL,
  utility_type    VARCHAR(32) NULL,
  secret_handle   VARCHAR(255) NULL,
  brightdata_allowed TINYINT(1) NOT NULL DEFAULT 0,
  status          VARCHAR(32) NOT NULL DEFAULT 'active',
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_accounts_provider (provider_id),
  CONSTRAINT fk_accounts_provider FOREIGN KEY (provider_id) REFERENCES providers (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE jobs (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  account_id      BIGINT UNSIGNED NOT NULL,
  schedule_kind   VARCHAR(32) NOT NULL DEFAULT 'manual',
  schedule_config_json JSON NULL,
  enabled         TINYINT(1) NOT NULL DEFAULT 1,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_jobs_account (account_id),
  CONSTRAINT fk_jobs_account FOREIGN KEY (account_id) REFERENCES accounts (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE runs (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  job_id          BIGINT UNSIGNED NULL,
  account_id      BIGINT UNSIGNED NOT NULL,
  provider_id     VARCHAR(64) NOT NULL,
  provider_version VARCHAR(32) NULL,
  adapter         VARCHAR(64) NOT NULL,
  adapter_reason  VARCHAR(512) NULL,
  status          VARCHAR(32) NOT NULL DEFAULT 'queued',
  started_at      DATETIME NULL,
  finished_at     DATETIME NULL,
  error_code      VARCHAR(64) NULL,
  error_message   VARCHAR(1024) NULL,
  cost_estimate_usd DECIMAL(10,4) NULL,
  cost_actual_usd DECIMAL(10,4) NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_runs_account (account_id),
  KEY idx_runs_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE run_logs (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  run_id          BIGINT UNSIGNED NOT NULL,
  level           VARCHAR(16) NOT NULL DEFAULT 'info',
  event           VARCHAR(128) NULL,
  message         VARCHAR(2048) NULL,
  metadata_json   JSON NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_run_logs_run (run_id),
  CONSTRAINT fk_run_logs_run FOREIGN KEY (run_id) REFERENCES runs (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE artifacts (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  run_id          BIGINT UNSIGNED NOT NULL,
  type            VARCHAR(32) NOT NULL,
  path            VARCHAR(1024) NOT NULL,
  mime_type       VARCHAR(128) NULL,
  sha256          CHAR(64) NULL,
  redaction_status VARCHAR(32) NOT NULL DEFAULT 'pending',
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_artifacts_run (run_id),
  CONSTRAINT fk_artifacts_run FOREIGN KEY (run_id) REFERENCES runs (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE bills (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  run_id          BIGINT UNSIGNED NOT NULL,
  account_id      BIGINT UNSIGNED NOT NULL,
  provider_id     VARCHAR(64) NOT NULL,
  statement_date  DATE NULL,
  period_start    DATE NULL,
  period_end      DATE NULL,
  due_date        DATE NULL,
  amount_due      DECIMAL(12,2) NULL,
  currency        CHAR(3) NULL,
  normalized_json JSON NOT NULL,
  confidence_score DECIMAL(4,3) NULL,
  source_url      VARCHAR(1024) NULL,
  primary_artifact_id BIGINT UNSIGNED NULL,
  status          VARCHAR(32) NOT NULL DEFAULT 'needs_review',
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_bills_run (run_id),
  KEY idx_bills_account (account_id),
  CONSTRAINT fk_bills_run FOREIGN KEY (run_id) REFERENCES runs (id) ON DELETE CASCADE,
  CONSTRAINT fk_bills_artifact FOREIGN KEY (primary_artifact_id) REFERENCES artifacts (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE reviews (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  bill_id         BIGINT UNSIGNED NOT NULL,
  status          VARCHAR(32) NOT NULL DEFAULT 'pending',
  reviewer        VARCHAR(255) NULL,
  notes           VARCHAR(2048) NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_reviews_bill (bill_id),
  CONSTRAINT fk_reviews_bill FOREIGN KEY (bill_id) REFERENCES bills (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE exports (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  bill_id         BIGINT UNSIGNED NOT NULL,
  format          VARCHAR(32) NOT NULL DEFAULT 'json',
  payload_json    JSON NOT NULL,
  destination     VARCHAR(1024) NULL,
  status          VARCHAR(32) NOT NULL DEFAULT 'created',
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_exports_bill (bill_id),
  CONSTRAINT fk_exports_bill FOREIGN KEY (bill_id) REFERENCES bills (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
