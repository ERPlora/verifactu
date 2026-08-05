-- Save/create the hub's VeriFactu configuration (UPSERT by hub_id).
-- Runtime injects :new_id, :hub_id, :current_user_id, :now.
--
-- The fiscal certificate (.p12) is NOT managed here: it is a BUSINESS/hub resource
-- (ADR-0079/0081) uploaded in Settings → Business (`_hub_certificate`). This config keeps only
-- operational data: mode, environment, issuer and retry preferences.
--
-- ADR-0202 phase 1, guard R3 (verifactu#26): `auto_transmit` is GONE — active module = the
-- record is always transmitted; migration 009 drops the column. Pending guard R1
-- (verifactu#25): this blind UPSERT must refuse the production→testing flip once a
-- production record is accepted, instead of overwriting it.
INSERT INTO verifactu_config
  (id, hub_id, enabled, mode, environment,
   software_name, software_version, software_id, software_nif,
   issuer_nif, issuer_name,
   retry_interval_minutes, max_retries,
   is_deleted, created_by, updated_by, created_at, updated_at)
VALUES
  (:new_id, :hub_id, :enabled, :mode, :environment,
   :software_name, :software_version, :software_id, :software_nif,
   :issuer_nif, :issuer_name,
   :retry_interval_minutes, :max_retries,
   0, :current_user_id, :current_user_id, :now, :now)
ON CONFLICT(hub_id) DO UPDATE SET
   enabled                = excluded.enabled,
   mode                   = excluded.mode,
   environment            = excluded.environment,
   software_name          = excluded.software_name,
   software_version       = excluded.software_version,
   software_id            = excluded.software_id,
   software_nif           = excluded.software_nif,
   issuer_nif             = excluded.issuer_nif,
   issuer_name            = excluded.issuer_name,
   retry_interval_minutes = excluded.retry_interval_minutes,
   max_retries            = excluded.max_retries,
   updated_by             = :current_user_id,
   updated_at             = :now;
