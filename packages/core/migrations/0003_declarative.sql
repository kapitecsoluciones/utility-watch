-- Declarative providers + URL-fetch ingest (dashboard refinement F1).

ALTER TABLE providers ADD COLUMN kind VARCHAR(16) NOT NULL DEFAULT 'code';
ALTER TABLE accounts ADD COLUMN fetch_url VARCHAR(1024) NULL;
