-- Assert for the taxpayer guard (verifactu#49): VeriFactu cannot be left ENABLED with no obligado
-- tributario.
--
-- Before this, `config.get` could answer `{"enabled":1,"issuer_nif":"","issuer_name":""}` and
-- nothing anywhere complained. That is not a cosmetic hole: the engine anchors the hash chain,
-- `chain.validate`, `recovery.*` and `diagnostics.run` on `verifactu_config.issuer_nif`
-- (`resolve_nif`, hub `crates/verifactu`), so an enabled module with an empty issuer is a module
-- that believes it is compliant and cannot walk its own chain.
--
-- It reads the PERSISTED row, not the payload, and runs AFTER `config_save.sql`: the upsert has
-- already resolved the effective issuer (payload → hub identity), so what is checked here is the
-- state the hub is actually left in. Empty at this point means the hub itself has no fiscal
-- identity configured in Settings → Business — the one case where enabling must fail, and the
-- one the operator can act on.
--
-- ok = 0 violates the `CHECK (ok = 1)` of `verifactu__gate` and rolls the whole command
-- transaction back, the `verifactu.config.changed` outbox event included. Saving with VeriFactu
-- DISABLED stays legal: that is how a hub is configured before it has an identity.
INSERT INTO verifactu__gate (gate, ok)
SELECT 'config_save_requires_issuer',
       CASE WHEN EXISTS (
           SELECT 1 FROM verifactu_config
            WHERE hub_id = :hub_id
              AND is_deleted = 0
              AND enabled <> 0
              AND TRIM(COALESCE(issuer_nif, '')) = ''
       ) THEN 0 ELSE 1 END;
