-- (interno) Inserta el registro VeriFactu calculado por el motor nativo first-party
-- (ADR-0009, hub/crates/verifactu). Solo se invoca como INTENCIÓN del handler
-- `create_record`; el runtime inyecta :hub_id/:current_user_id/:now.
-- Atomicidad de la secuencia: el índice único uq_verifactu_record_hub_seq
-- (hub_id, issuer_nif, sequence_number) cierra la ventana TOCTOU — si dos altas
-- compiten con la misma ancla, la segunda viola el índice y su transacción revierte.
INSERT INTO verifactu_record (
    id, hub_id, record_type, sequence_number, invoice_id,
    issuer_nif, issuer_name, invoice_number, invoice_date, invoice_type, description,
    base_amount, tax_rate, tax_breakdown, tax_amount, total_amount,
    previous_hash, record_hash, is_first_record, generation_timestamp,
    status, retry_count, aeat_response_code, aeat_response_message, aeat_csv,
    qr_url, qr_generated, xml_content,
    substitutes_number, substitutes_date, substitutes_nif,
    rectifies_number, rectifies_date, rectifies_nif, rectification_type,
    rectified_base_amount, rectified_tax_amount, rectified_surcharge_amount,
    environment,
    recipient_nif, recipient_name, recipient_country, recipient_id_type,
    is_deleted, created_by, updated_by, created_at, updated_at
) VALUES (
    :record_id, :hub_id, :record_type, :sequence_number, :invoice_id,
    :issuer_nif, :issuer_name, :invoice_number, :invoice_date, :invoice_type, :description,
    :base_amount, :tax_rate,
    -- verifactu#66 — a breakdown that NEVER ARRIVED becomes `'{}'`, the value the column has
    -- carried by DEFAULT since 004 and the one the rules of 013/015 know how to read.
    -- `create_record` reads this field with `str_field`, which answers the EMPTY STRING for a key
    -- the payload does not carry, and `''` is not JSON. In Postgres 18 the context item is cast
    -- text -> json BEFORE the path is evaluated, and that cast is outside what `FALSE ON ERROR`
    -- catches: `JSON_EXISTS('', 'strict $[*]' FALSE ON ERROR)` raises 22P02 instead of answering
    -- FALSE. Both rules open on that call, so an `alta` created through the public command died
    -- for ANY amount and any rate, with a raw Postgres error. `NULLIF` before `COALESCE` so the
    -- binder's NULL (a `:param` the payload omits) lands on the same value — same guardrail, and
    -- the same reason, as the `substitutes_*` below.
    COALESCE(NULLIF(:tax_breakdown, ''), '{}'), :tax_amount, :total_amount,
    :previous_hash, :record_hash, :is_first_record, :generation_timestamp,
    'pending', 0, '', '', '',
    :qr_url, 1, '',
    -- Guardarraíl del binder (mismo patrón que sales/create_payment_method.sql): el binder del
    -- runtime pasa NULL para los opcionales omitidos y NO aplica los DEFAULT de columna, así que
    -- un registro normal (no F3) reventaba con NOT NULL en los substitutes_* de 005_substitution.
    COALESCE(:substitutes_number, ''), COALESCE(:substitutes_date, ''), COALESCE(:substitutes_nif, ''),
    -- R1-R5 → bloque rectificativo (verifactu#55, hub#1023). Mismo snapshot y mismo motivo que
    -- los substitutes_*: un envío DIFERIDO reconstruye el XML desde esta fila, así que lo que no
    -- esté aquí no llega nunca a la AEAT.
    -- Los cuatro identificadores, con el mismo guardarraíl del binder (NOT NULL en la tabla).
    COALESCE(:rectifies_number, ''), COALESCE(:rectifies_date, ''),
    COALESCE(:rectifies_nif, ''), COALESCE(:rectification_type, ''),
    -- Los tres importes van SIN COALESCE a propósito: el NULL es información. En
    -- ImporteRectificacion «no hay importe» y «el importe es cero» son cosas distintas ante
    -- Hacienda (hub#324) — un 0 aquí declararía que se rectifica una base de cero euros.
    :rectified_base_amount, :rectified_tax_amount, :rectified_surcharge_amount,
    -- Environment scoping (ADR-0202 R4): the record joins the chain of the hub's CURRENT config
    -- environment. Until the native engine passes :environment explicitly (hub#313), the binder
    -- passes NULL for the omitted param and the config value wins; 'testing' only if no live
    -- config row exists (same default as verifactu_config.environment).
    COALESCE(:environment,
             (SELECT environment FROM verifactu_config
              WHERE hub_id = :hub_id AND is_deleted = 0),
             'testing'),
    -- Destinatarios (hub#1975): same snapshot, same reason as the substitutes_*/rectifies_*
    -- above, and the same binder guardrail (NOT NULL in the table, NULL for an omitted param).
    COALESCE(:recipient_nif, ''), COALESCE(:recipient_name, ''),
    COALESCE(:recipient_country, ''), COALESCE(:recipient_id_type, ''),
    0, :current_user_id, :current_user_id, :now, :now
);
