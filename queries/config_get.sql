-- Configuración VeriFactu del hub (singleton). Runtime inyecta :hub_id.
-- Portado de VerifactuService.get_config / settings_view.
-- NUNCA expone el secreto: ni certificate_password ni los bytes certificate_pkcs12.
-- En su lugar devuelve flags has_certificate / has_password para que la UI muestre estado.
-- Obligado tributario (emisor): la fuente única es la identidad fiscal GLOBAL del hub
-- (`:business_tax_id`/`:business_legal_name`, hub_settings — ADR-0061). La UI lo muestra en
-- SOLO-LECTURA (se gestiona en Ajustes → Negocio). NOTA: hoy `:business_tax_id` solo se inyecta en
-- COMMANDS (system_params), no en queries → aquí el COALESCE cae al valor ALMACENADO, que `config_save`
-- mantiene sincronizado con la identidad global en cada guardado. Cuando el runtime inyecte
-- business_* también en queries, este COALESCE pasará a reflejar la identidad global EN VIVO.
SELECT id, enabled, mode, environment,
       software_name, software_version, software_id, software_nif,
       COALESCE(NULLIF(:business_tax_id, ''), issuer_nif) AS issuer_nif,
       COALESCE(NULLIF(:business_legal_name, ''), issuer_name) AS issuer_name,
       certificate_path, certificate_expiry,
       CASE WHEN certificate_pkcs12 <> '' OR certificate_path <> '' THEN 1 ELSE 0 END AS has_certificate,
       CASE WHEN certificate_password <> '' THEN 1 ELSE 0 END AS has_password,
       auto_transmit, retry_interval_minutes, max_retries
FROM verifactu_config
WHERE hub_id = :hub_id AND is_deleted = 0
LIMIT 1;
