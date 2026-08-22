-- Configuración VeriFactu del hub (singleton). Runtime inyecta :hub_id y :has_certificate.
--
-- El certificado fiscal (.p12) es un recurso del NEGOCIO/hub (ADR-0079/0081), NO del módulo: se
-- sube en Ajustes → Negocio. El runtime inyecta :has_certificate (0/1) como system param tras
-- sondear la presencia del cert del core (_hub_certificate) — el módulo NO lee la tabla de sistema
-- directamente; confía en el gate del runtime. Los bytes del `.p12` y la contraseña NUNCA se
-- exponen (el motor Rust firma vía la capability opaca host.certificate_identity(hub_id)).
-- OBLIGADO TRIBUTARIO (issuer): ONE source, the hub (verifactu#49). The business fiscal identity
-- lives in Settings → Business (`hub_settings`) and the runtime injects it into every query as
-- :business_tax_id / :business_legal_name (ADR-0061). This screen used to ask for it AGAIN and
-- render it EMPTY behind a placeholder that read like a real value — an invitation to type a tax
-- ID different from the hub's, which means issuing on behalf of one taxpayer and DECLARING on
-- behalf of another. The module keeps its own column because the engine reads it (`resolve_nif`
-- anchors the chain, recovery and diagnostics on it), so this is a FALLBACK and not an override:
-- a column with a value still wins, an empty one resolves to the hub's single source.
SELECT vc.id, vc.enabled, vc.mode, vc.environment,
       vc.software_name, vc.software_version, vc.software_id, vc.software_nif,
       COALESCE(NULLIF(vc.issuer_nif, ''), :business_tax_id)     AS issuer_nif,
       COALESCE(NULLIF(vc.issuer_name, ''), :business_legal_name) AS issuer_name,
       :has_certificate AS has_certificate,
       vc.retry_interval_minutes, vc.max_retries
FROM verifactu_config vc
WHERE vc.hub_id = :hub_id AND vc.is_deleted = 0
LIMIT 1;
