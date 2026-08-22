-- Save/create the hub's VeriFactu configuration (UPSERT by hub_id).
-- Runtime injects :new_id, :hub_id, :current_user_id, :now.
--
-- The fiscal certificate (.p12) is NOT managed here: it is a BUSINESS/hub resource
-- (ADR-0079/0081) uploaded in Settings → Business (`_hub_certificate`). This config keeps only
-- operational data: mode, environment, issuer and retry preferences.
--
-- OBLIGADO TRIBUTARIO (verifactu#49): the issuer is NOT owned here either. The business fiscal
-- identity is the hub's (`hub_settings`, ADR-0061), injected as :business_tax_id /
-- :business_legal_name. The module keeps the column because the ENGINE reads it — `resolve_nif`
-- in hub `crates/verifactu` anchors `chain.validate`, `recovery.*` and `diagnostics.run` on it —
-- so the save PERSISTS the effective issuer instead of whatever the form sent. That is what stops
-- the two drifting apart, and it is why an empty payload no longer means an empty taxpayer: it
-- means "take the hub's". Only a hub with NO fiscal identity at all ends up empty, and
-- `_config_save_issuer_assert.sql` refuses to leave VeriFactu enabled in that state.
--
-- ADR-0202 phase 1, guard R3 (verifactu#26): `auto_transmit` is GONE — active module = the
-- record is always transmitted; migration 009 drops the column.
--
-- GUARD R1 (verifactu#25): going live is ONE WAY. Once this hub has ≥1 record ACCEPTED in
-- `production` (ADR-0189: `accepted` covers AceptadoConErrores), `environment` cannot go back
-- to `testing`. The damage is not the past records but the NEXT sales: they are real invoices
-- whose records would go to preproduction, so for the AEAT they never existed — the
-- generated-but-never-remitted orphan FAQ §5 forbids, with a QR pointing at `prewww2` that the
-- customer cannot check. The legitimate way to try things out after go-live is ANOTHER hub
-- (a free one, or the demo with its environment pinned). When the flip is illegal this INSERT
-- matches no row and `_config_save_assert.sql` (next in the chain) violates the verifactu__gate
-- CHECK, rolling the whole transaction back — outbox event included.
INSERT INTO verifactu_config
  (id, hub_id, enabled, mode, environment,
   software_name, software_version, software_id, software_nif,
   issuer_nif, issuer_name,
   retry_interval_minutes, max_retries,
   is_deleted, created_by, updated_by, created_at, updated_at)
SELECT
   :new_id, :hub_id, :enabled, :mode, :environment,
   :software_name, :software_version, :software_id, :software_nif,
   COALESCE(NULLIF(:issuer_nif, ''), :business_tax_id),
   COALESCE(NULLIF(:issuer_name, ''), :business_legal_name),
   :retry_interval_minutes, :max_retries,
   0, :current_user_id, :current_user_id, :now, :now
WHERE NOT (
   :environment = 'testing'
   AND EXISTS (SELECT 1 FROM verifactu_record r
                 WHERE r.hub_id = :hub_id
                   AND r.is_deleted = 0
                   AND r.environment = 'production'
                   AND r.status = 'accepted')
)
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
