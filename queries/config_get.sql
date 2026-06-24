-- Configuración VeriFactu del hub (singleton). Runtime inyecta :hub_id.
-- Portado de VerifactuService.get_config / settings_view.
-- NUNCA expone el secreto: ni certificate_password ni los bytes certificate_pkcs12.
-- En su lugar devuelve flags has_certificate / has_password para que la UI muestre estado.
SELECT id, enabled, mode, environment,
       software_name, software_version, software_id, software_nif,
       issuer_nif, issuer_name,
       certificate_path, certificate_expiry,
       CASE WHEN certificate_pkcs12 <> '' OR certificate_path <> '' THEN 1 ELSE 0 END AS has_certificate,
       CASE WHEN certificate_password <> '' THEN 1 ELSE 0 END AS has_password,
       auto_transmit, retry_interval_minutes, max_retries
FROM verifactu_config
WHERE hub_id = :hub_id AND is_deleted = 0
LIMIT 1;
