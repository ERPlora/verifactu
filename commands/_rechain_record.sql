-- (interno) Re-ancla un registro RECHAZADO sobre el último eslabón que la AEAT sí tiene.
--
-- Lo usa la recuperación automática del motor nativo (hub#287): cuando la AEAT rechaza por
-- encadenamiento (código 2007 y familia — el caso real es haber restaurado un backup), el
-- registro se recompone sobre la huella del último registro remitido y se reintenta UNA vez.
--
-- Reescribir el registro localmente es legítimo *precisamente* porque la AEAT lo rechazó: nunca
-- entró en la cadena oficial, así que su huella vieja no existe para Hacienda. Por eso el WHERE
-- exige `status = 'rejected'`: un registro aceptado o en vuelo NO puede re-encadenarse, y esa
-- guarda vive aquí (en la propia sentencia) y no solo en el motor.
--
-- `xml_content` se limpia: el XML archivado corresponde al eslabón viejo y un reintento posterior
-- debe regenerarlo, no reenviar el que ya rechazaron.
UPDATE verifactu_record SET
    sequence_number = :sequence_number,
    previous_hash   = :previous_hash,
    record_hash     = :record_hash,
    is_first_record = 0,
    xml_content     = '',
    updated_by      = :current_user_id,
    updated_at      = :now
WHERE id = :record_id AND hub_id = :hub_id AND is_deleted = 0 AND status = 'rejected';
