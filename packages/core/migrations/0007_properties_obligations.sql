-- Property-centric organization layer: properties, categories, obligations
-- (one per provider+account_ref, the recurring thing that accrues a balance),
-- and payments. Built on top of the existing bills/runs retrieval engine.

CREATE TABLE IF NOT EXISTS properties (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(255) NOT NULL,
  address     VARCHAR(512) NULL,
  type        VARCHAR(64)  NULL,
  notes       TEXT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS categories (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(128) NOT NULL,
  description VARCHAR(512) NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS obligations (
  id                     INT UNSIGNED NOT NULL AUTO_INCREMENT,
  provider_id            VARCHAR(64)  NOT NULL,
  account_ref            VARCHAR(255) NOT NULL,
  property_id            INT UNSIGNED NULL,
  category_id            INT UNSIGNED NULL,
  label                  VARCHAR(255) NULL,
  account_type           VARCHAR(64)  NULL,
  due_day                TINYINT UNSIGNED NULL,
  payment_method         VARCHAR(64)  NULL,
  is_autopay             TINYINT(1) NOT NULL DEFAULT 0,
  paid_by_tenant         TINYINT(1) NOT NULL DEFAULT 0,
  is_cancelled           TINYINT(1) NOT NULL DEFAULT 0,
  is_payment_arrangement TINYINT(1) NOT NULL DEFAULT 0,
  currency               VARCHAR(8)  NOT NULL DEFAULT 'USD',
  notes                  TEXT NULL,
  current_balance        DECIMAL(12,2) NULL,
  current_due_date       DATE NULL,
  last_seen_run_id       BIGINT UNSIGNED NULL,
  last_payment_date      DATE NULL,
  last_payment_amount    DECIMAL(12,2) NULL,
  created_at             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_obligation (provider_id, account_ref),
  KEY idx_obl_property (property_id),
  KEY idx_obl_category (category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS payments (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  obligation_id  INT UNSIGNED NOT NULL,
  payment_date   DATE NOT NULL,
  amount         DECIMAL(12,2) NOT NULL,
  payment_method VARCHAR(64) NULL,
  source         VARCHAR(16) NOT NULL DEFAULT 'manual',
  notes          TEXT NULL,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_pay_obligation (obligation_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
