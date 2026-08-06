-- Assert for the go-live guard (verifactu#25, R1): the save is only valid if the guarded UPSERT
-- actually applied (this hub's config carries `updated_at = :now`, which pins THIS command run).
-- A refused production→testing flip leaves the previous row untouched, so EXISTS=0, the CHECK
-- (ok = 1) of verifactu__gate is violated and the whole transaction rolls back — the
-- `verifactu.config.changed` outbox event included.
INSERT INTO verifactu__gate (gate, ok)
SELECT 'config_save_go_live_is_one_way',
       CASE WHEN EXISTS (SELECT 1 FROM verifactu_config
               WHERE hub_id = :hub_id AND is_deleted = 0
                 AND updated_at = :now) THEN 1 ELSE 0 END;
