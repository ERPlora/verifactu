-- Guardar/crear la configuración VeriFactu del hub (UPSERT por hub_id).
-- Runtime inyecta :new_id, :hub_id, :current_user_id, :now.
-- Portado de routes.settings_view (POST).
-- ON CONFLICT(hub_id) hace UPDATE: el índice único ix_verifactu_config_hub lo garantiza.
--
-- SECRETOS (cert + contraseña): un valor entrante VACÍO significa "no lo cambies", para
-- que un guardado normal de ajustes (que no re-sube el .p12) NO borre lo ya almacenado.
-- Solo se sobrescriben si llegan con contenido. (Antes se machacaban a '' en cada save.)
-- certificate_pkcs12 = bytes del .p12 en base64 (cert en BD; ver migración 002).
INSERT INTO verifactu_config
  (id, hub_id, enabled, mode, environment,
   software_name, software_version, software_id, software_nif,
   issuer_nif, issuer_name,
   certificate_path, certificate_password, certificate_pkcs12, certificate_expiry,
   auto_transmit, retry_interval_minutes, max_retries,
   is_deleted, created_by, updated_by, created_at, updated_at)
VALUES
  (:new_id, :hub_id, :enabled, :mode, :environment,
   :software_name, :software_version, :software_id, :software_nif,
   :issuer_nif, :issuer_name,
   :certificate_path, :certificate_password, :certificate_pkcs12, :certificate_expiry,
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
   certificate_path       = excluded.certificate_path,
   certificate_password   = CASE WHEN excluded.certificate_password = ''
                                 THEN verifactu_config.certificate_password
                                 ELSE excluded.certificate_password END,
   certificate_pkcs12     = CASE WHEN excluded.certificate_pkcs12 = ''
                                 THEN verifactu_config.certificate_pkcs12
                                 ELSE excluded.certificate_pkcs12 END,
   -- La caducidad la calcula el motor nativo (inspect_certificate) tras subir un .p12 nuevo.
   -- Un guardado normal de ajustes NO re-sube el cert (certificate_pkcs12 = '') → preservamos la
   -- caducidad ya almacenada en vez de machacarla a NULL.
   certificate_expiry     = CASE WHEN excluded.certificate_pkcs12 = ''
                                 THEN verifactu_config.certificate_expiry
                                 ELSE excluded.certificate_expiry END,
   auto_transmit          = excluded.auto_transmit,
   retry_interval_minutes = excluded.retry_interval_minutes,
   max_retries            = excluded.max_retries,
   updated_by             = :current_user_id,
   updated_at             = :now;
