-- ADR-0081 (corte limpio): el certificado fiscal (.p12) es un recurso del NEGOCIO/hub, gestionado
-- en Ajustes → Negocio (tabla _hub_certificate del core). Estas columnas de verifactu_config ya no
-- se usan. Equivalente postgres de sqlite/006_drop_cert_columns.sql.
ALTER TABLE verifactu_config DROP COLUMN IF EXISTS certificate_pkcs12;
ALTER TABLE verifactu_config DROP COLUMN IF EXISTS certificate_password;
ALTER TABLE verifactu_config DROP COLUMN IF EXISTS certificate_path;
ALTER TABLE verifactu_config DROP COLUMN IF EXISTS certificate_expiry;
