-- Ruta relativa a `media/` del XML fiscal archivado por el host.
-- El contenido sigue también en `xml_content` para reintentos exactos y compatibilidad.
ALTER TABLE verifactu_record
ADD COLUMN xml_storage_path TEXT NOT NULL DEFAULT '';
