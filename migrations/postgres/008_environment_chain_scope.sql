-- ADR-0202 phase 1 (guard R4): scope the VeriFactu chain per AEAT environment.
--
-- `verifactu_record` had no `environment` column, so flipping the config toggle chained the
-- first production record onto the fingerprint of a testing one. From now on `production`
-- and `testing` are two PARALLEL, INDEPENDENT chains: sequence numbers and the
-- (invoice_number, invoice_date, record_type) key are unique per
-- (hub_id, issuer_nif, environment). The crate anchor is scoped in lockstep (hub#313).
--
-- Backfill: the existing rows form ONE hash chain (`previous_hash` links every row), so they
-- are stamped wholesale with the hub's current config environment — splitting them by
-- inference would break the chain linkage. Hubs without a live config row keep the column
-- default ('testing', same default as `verifactu_config.environment`).
ALTER TABLE verifactu_record
ADD COLUMN IF NOT EXISTS environment TEXT NOT NULL DEFAULT 'testing';  -- production | testing

UPDATE verifactu_record
SET environment = c.environment
FROM verifactu_config c
WHERE c.hub_id = verifactu_record.hub_id AND c.is_deleted = 0;

-- Re-scope the unique indexes. `CREATE UNIQUE INDEX IF NOT EXISTS` alone would silently keep
-- the published unscoped definition, so the old indexes are dropped first (001 stays
-- untouched: migrations are append-only).
DROP INDEX IF EXISTS uq_verifactu_record_hub_seq;
DROP INDEX IF EXISTS uq_verifactu_record;
CREATE UNIQUE INDEX IF NOT EXISTS uq_verifactu_record_hub_seq
    ON verifactu_record (hub_id, issuer_nif, environment, sequence_number);
CREATE UNIQUE INDEX IF NOT EXISTS uq_verifactu_record
    ON verifactu_record (hub_id, issuer_nif, environment, invoice_number, invoice_date, record_type);
