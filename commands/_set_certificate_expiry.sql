-- (interno) Persiste la caducidad del certificado (notAfter) extraída por el motor nativo
-- first-party (handler `inspect_certificate`). Runtime inyecta :hub_id, :now, :current_user_id.
UPDATE verifactu_config SET
    certificate_expiry = :certificate_expiry,
    updated_by         = :current_user_id,
    updated_at         = :now
WHERE hub_id = :hub_id AND is_deleted = 0;
