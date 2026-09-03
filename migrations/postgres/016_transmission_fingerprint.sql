-- Huella de la entrega, estampada en el momento de transmitir y nunca recalculada.
--
-- `xml_sha256` — digest de los bytes que viajaron. Hoy se calcula al vuelo sobre el sobre que
-- sale y se tira, así que si `xml_content` o el objeto archivado en `xml_storage_path` cambian
-- después, nada lo nota: un reenvío recalcula el digest sobre lo que haya y transmite otros
-- bytes creyendo que son los mismos. Guardado aquí, el original queda comparable para siempre.
--
-- `transmission_id` — identificador con el que se presentó la entrega, que es la
-- `Idempotency-Key` por la que indexa la celda fiscal. NO siempre es el id del registro: el
-- re-anclado automático presenta el MISMO registro bajo `{id}-rechain-{ancla}`, y esa es la
-- clave que lleva la línea de log de la celda.
--
-- Los dos son NOT NULL DEFAULT '' — "nadie estampó nada" es la cadena vacía, no un NULL que el
-- motor tendría que tratar aparte al reconstruir el sobre desde la fila.
ALTER TABLE verifactu_record ADD COLUMN IF NOT EXISTS xml_sha256 TEXT NOT NULL DEFAULT '';
ALTER TABLE verifactu_record ADD COLUMN IF NOT EXISTS transmission_id TEXT NOT NULL DEFAULT '';
