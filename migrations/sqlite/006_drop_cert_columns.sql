-- ADR-0081 (corte limpio): el certificado fiscal (.p12) es un recurso del NEGOCIO/hub, gestionado
-- en Ajustes → Negocio (tabla _hub_certificate del core). Estas columnas de verifactu_config ya no
-- se usan: la UI ya no las puebla, config_get.sql lee _hub_certificate, y el motor Rust firma vía
-- la capability opaca host.certificate_identity(hub_id). Se eliminan para evitar confusión y
-- secretos duplicados. SQLite ≥3.35 soporta ALTER TABLE DROP COLUMN.
ALTER TABLE verifactu_config DROP COLUMN certificate_pkcs12;
ALTER TABLE verifactu_config DROP COLUMN certificate_password;
ALTER TABLE verifactu_config DROP COLUMN certificate_path;
ALTER TABLE verifactu_config DROP COLUMN certificate_expiry;
