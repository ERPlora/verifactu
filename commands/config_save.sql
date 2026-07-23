-- Guardar/crear la configuración VeriFactu del hub (UPSERT por hub_id).
-- Runtime inyecta :new_id, :hub_id, :current_user_id, :now.
--
-- El certificado fiscal (.p12) YA NO se gestiona aquí: es un recurso del NEGOCIO/hub (ADR-0079/0081)
-- y se sube en Ajustes → Negocio (tabla _hub_certificate). Esta config guarda solo los datos
-- operativos: modo, entorno, obligado tributario (emisor) y preferencias de transmisión.
INSERT INTO verifactu_config
  (id, hub_id, enabled, mode, environment,
   software_name, software_version, software_id, software_nif,
   issuer_nif, issuer_name,
   auto_transmit, retry_interval_minutes, max_retries,
   is_deleted, created_by, updated_by, created_at, updated_at)
VALUES
  (:new_id, :hub_id, :enabled, :mode, :environment,
   :software_name, :software_version, :software_id, :software_nif,
   :issuer_nif, :issuer_name,
   :auto_transmit, :retry_interval_minutes, :max_retries,
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
   auto_transmit          = excluded.auto_transmit,
   retry_interval_minutes = excluded.retry_interval_minutes,
   max_retries            = excluded.max_retries,
   updated_by             = :current_user_id,
   updated_at             = :now;
