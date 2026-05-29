-- Audit log: append-only record of operator/agent actions for accountability.
CREATE TABLE IF NOT EXISTS audit_log (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  ts          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actor       VARCHAR(255) NULL,                       -- operator email, 'agent', or 'anonymous'
  actor_kind  VARCHAR(16)  NOT NULL DEFAULT 'operator',-- operator | agent | system
  action      VARCHAR(64)  NOT NULL,                   -- e.g. login.success, provider.register, bill.export
  target_type VARCHAR(32)  NULL,                       -- provider | account | bill | user | session
  target_id   VARCHAR(255) NULL,
  outcome     VARCHAR(16)  NOT NULL DEFAULT 'ok',       -- ok | deny | fail
  ip          VARCHAR(64)  NULL,
  detail      JSON         NULL,
  PRIMARY KEY (id),
  KEY idx_ts (ts),
  KEY idx_action (action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
