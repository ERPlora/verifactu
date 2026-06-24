-- VeriFactu · migración 003 (Postgres). Equivalente a sqlite/003_obligado.sql.
-- Identidad del OBLIGADO TRIBUTARIO (emisor) del hub: NIF + nombre que la AEAT valida y que
-- representa el certificado. Distinto del PRODUCTOR del software (software_*, = ERPlora, fijo).
ALTER TABLE verifactu_config ADD COLUMN IF NOT EXISTS issuer_nif  TEXT NOT NULL DEFAULT '';
ALTER TABLE verifactu_config ADD COLUMN IF NOT EXISTS issuer_name TEXT NOT NULL DEFAULT '';
