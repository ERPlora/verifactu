-- Configuración VeriFactu del hub (singleton). Runtime inyecta :hub_id y :has_certificate.
--
-- El certificado fiscal (.p12) es un recurso del NEGOCIO/hub (ADR-0079/0081), NO del módulo: se
-- sube en Ajustes → Negocio. El runtime inyecta :has_certificate (0/1) como system param tras
-- sondear la presencia del cert del core (_hub_certificate) — el módulo NO lee la tabla de sistema
-- directamente; confía en el gate del runtime. Los bytes del `.p12` y la contraseña NUNCA se
-- exponen (el motor Rust firma vía la capability opaca host.certificate_identity(hub_id)).
SELECT vc.id, vc.enabled, vc.mode, vc.environment,
       vc.software_name, vc.software_version, vc.software_id, vc.software_nif,
       vc.issuer_nif, vc.issuer_name,
       :has_certificate AS has_certificate,
       vc.auto_transmit, vc.retry_interval_minutes, vc.max_retries
FROM verifactu_config vc
WHERE vc.hub_id = :hub_id AND vc.is_deleted = 0
LIMIT 1;
