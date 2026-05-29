-- Encrypted secret store: provider credentials referenced by handle, never
-- stored in code or the registry. Values are AES-256-GCM encrypted with a key
-- held only in the environment (SECRETS_KEY); the DB holds ciphertext + iv + tag.
CREATE TABLE IF NOT EXISTS secrets (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(128)    NOT NULL,
  iv          VARBINARY(16)   NOT NULL,
  auth_tag    VARBINARY(16)   NOT NULL,
  ciphertext  VARBINARY(4096) NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_secret_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
