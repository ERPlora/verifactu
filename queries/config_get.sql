-- Configuración VeriFactu del hub (singleton). Runtime inyecta :hub_id.
-- Portado de VerifactuService.get_config / settings_view.
-- NUNCA expone el secreto: ni certificate_password ni los bytes certificate_pkcs12.
-- En su lugar devuelve flags has_certificate / has_password para que la UI muestre estado.
-- Obligado tributario (emisor): la fuente única es la identidad fiscal GLOBAL del hub
-- (`:business_tax_id`/`:business_legal_name`, hub_settings — ADR-0061). La UI lo muestra en
-- SOLO-LECTURA (se gestiona en Ajustes → Negocio). El runtime inyecta `business_*` en commands Y en
-- queries (queries.rs enriquece el ctx igual que commands::execute) → este COALESCE refleja la
-- identidad global EN VIVO; el fallback a la columna almacenada solo aplica si la global no se ha
-- configurado todavía.
SELECT id, enabled, mode, environment,
       software_name, software_version, software_id, software_nif,
       COALESCE(NULLIF(:business_tax_id, ''), issuer_nif) AS issuer_nif,
       COALESCE(NULLIF(:business_legal_name, ''), issuer_name) AS issuer_name,
       certificate_path, certificate_expiry,
       -- Presencia del certificado: FUENTE = core `_hub_certificate` (ADR-0081), expuesta por el runtime
       -- como `:has_certificate` (0/1) sin que el módulo lea la tabla de sistema. Fallback a las columnas
       -- propias (legacy, antes de mover el cert al core).
       CASE WHEN :has_certificate = 1 THEN 1
            WHEN certificate_pkcs12 <> '' OR certificate_path <> '' THEN 1 ELSE 0 END AS has_certificate,
       CASE WHEN certificate_password <> '' THEN 1 ELSE 0 END AS has_password,
       auto_transmit, retry_interval_minutes, max_retries
FROM verifactu_config
WHERE hub_id = :hub_id AND is_deleted = 0
LIMIT 1;
