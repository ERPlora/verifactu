-- VeriFactu audit log / events. The runtime injects :hub_id.
-- Ported from routes.events_list. The order (newest first) and the search are applied by the list
-- engine from `module.json` (`list.default_sort` / `list.search`), not by this SELECT.
--
-- `type_label`: the name of the type as the screen paints it, in BOTH languages the module ships
-- (`locales/*.json` -> `ui.evtType.*`), so the search finds «Envío aplazado» or «Submission
-- postponed» while the row stores `transmission_deferred` (verifactu#140). The locale catalogue
-- does not exist in SQL, so this is a copy: `ui/lib/event-type-search.test.ts` compares it with the
-- locales code by code. A type the engine adds and this CASE lacks is still found by its code.
--
-- `message_words`: the same for the MESSAGE (verifactu#147). The Message cell is composed from
-- `details.message_key` and the reason codes nested in `details` (`cert_reason`, `why_reason`,
-- `detail_reason`… each a `{"code": …}`) with the catalogue of the reader's language
-- (`ui/lib/event-message.ts`), while `message` stores the engine's Spanish prose — «Registro alta
-- #27 de F-1 creado» under a cell that reads «… sealed for invoice F-1» or «… sellado». So this
-- column spells, in BOTH languages, the sentence of every code the row carries, with the
-- `{placeholders}` left out (their values are in `message` already). Same copy contract as above:
-- `ui/lib/event-message-search.test.ts` compares every row with `locales/*.json` (`ui.evt.*`).
-- A `details` that is not JSON (a row edited by hand) keeps only `message` to be found by.
SELECT id, record_id, event_type, severity, message, details, timestamp,
       CASE event_type
         WHEN 'record_created'          THEN 'Registro creado · Record created'
         WHEN 'invoice_type_downgraded' THEN 'Tipo de factura cambiado · Invoice type changed'
         WHEN 'transmission_deferred'   THEN 'Envío aplazado · Submission postponed'
         WHEN 'transmission_success'    THEN 'Envío aceptado · Submission accepted'
         WHEN 'transmission_warning'    THEN 'Aceptado con avisos · Accepted with warnings'
         WHEN 'transmission_failure'    THEN 'Envío fallido · Submission failed'
         WHEN 'contingency_processed'   THEN 'Cola de contingencia procesada · Contingency queue processed'
         WHEN 'chain_validated'         THEN 'Cadena verificada · Chain verified'
         WHEN 'chain_error'             THEN 'Cadena rota · Chain broken'
         WHEN 'aeat_queried'            THEN 'Consulta a la AEAT · AEAT query'
         WHEN 'chain_recovered'         THEN 'Cadena recuperada · Chain recovered'
         WHEN 'diagnostic'              THEN 'Prueba de conexión · Connection test'
         ELSE event_type END AS type_label,
       COALESCE((
         SELECT regexp_replace(string_agg(w.words, ' · ' ORDER BY w.code), '\{[a-z_]+\}', '', 'g')
         FROM (VALUES
           ('verifactu.record_created',                    'Registro {record_type} #{sequence_number} de la factura {invoice_number} sellado · {record_type} record #{sequence_number} sealed for invoice {invoice_number}'),
           ('verifactu.invoice_type_downgraded',           'La factura {invoice_number} se declaró {declared} y se ha registrado como {effective}: sin NIF de destinatario la AEAT rechaza el tipo declarado (error 1189) · Invoice {invoice_number} was declared {declared} and registered as {effective}: without a recipient tax ID the AEAT rejects the declared type (error 1189)'),
           ('verifactu.xsd_invalid',                       'XML no conforme al esquema de la AEAT; no se ha transmitido: {validation_error} · XML does not conform to the AEAT schema, so it was not transmitted: {validation_error}'),
           ('verifactu.transmission_retry',                'Fallo de transmisión AEAT ({environment}) tras {attempts} intento(s); se reintenta en {backoff_minutes} min · AEAT transmission failed ({environment}) after {attempts} attempt(s); retrying in {backoff_minutes} min'),
           ('verifactu.not_transmitted',                   'No se ha transmitido a la AEAT tras {attempts} intento(s): {error} · Not transmitted to the AEAT after {attempts} attempt(s): {error}'),
           ('verifactu.aeat_verdict',                      'AEAT ({environment}): envío {estado_envio}, registro {estado_registro} · AEAT ({environment}): submission {estado_envio}, record {estado_registro}'),
           ('verifactu.contingency_processed',             'Cola de contingencia procesada: {successful} enviados, {failed} con error · Contingency queue processed: {successful} sent, {failed} failed'),
           ('verifactu.diagnostic_ran',                    'Prueba VeriFactu ejecutada contra {environment} con la factura de muestra {sample_number} · VeriFactu test run against {environment} with sample invoice {sample_number}'),
           ('verifactu.diagnostic_certificate_invalid',    'Prueba VeriFactu contra {environment}: el certificado no es válido — {cert_message} · VeriFactu test against {environment}: the certificate is not valid — {cert_message}'),
           ('verifactu.diagnostic_gateway_unavailable',    'Prueba VeriFactu contra {environment}: ERPlora no puede remitir por ti ahora mismo — {cert_message} · VeriFactu test against {environment}: ERPlora cannot file for you right now — {cert_message}'),
           ('verifactu.diagnostic_issuer_nif_missing',     'Prueba VeriFactu contra {environment}: falta el NIF del obligado tributario — configúralo en Ajustes → Negocio antes de probar la conexión · VeriFactu test against {environment}: the taxpayer (issuer) tax ID is missing — set it in Settings → Business before testing the connection'),
           ('verifactu.diagnostic_sample_record_invalid',  'Prueba VeriFactu contra {environment}: tu configuración no produce un registro de prueba válido — {cert_message} · VeriFactu test against {environment}: your configuration does not produce a valid test record — {cert_message}'),
           ('verifactu.chain_validated',                   'Cadena de huellas íntegra: {total} registro(s) con su encadenado SHA-256 verificado ({issuer_nif}). No se re-auditan los importes · Fingerprint chain intact: {total} record(s) with their SHA-256 chaining verified ({issuer_nif}). Amounts are not re-audited'),
           ('verifactu.chain_broken',                      'Cadena de huellas ROTA en la secuencia {first_invalid_seq} ({issuer_nif}) · Fingerprint chain BROKEN at sequence {first_invalid_seq} ({issuer_nif})'),
           ('verifactu.aeat_queried',                      'Consulta AEAT: {count} registro(s) recuperados para {issuer_nif} · AEAT query: {count} record(s) retrieved for {issuer_nif}'),
           ('verifactu.chain_recovered_from_aeat',         'Cadena recuperada desde la AEAT para {issuer_nif}: continúa en la secuencia {sequence_number} de {found} registro(s) encontrados · Chain recovered from the AEAT for {issuer_nif}: continues at sequence {sequence_number} of {found} record(s) found'),
           ('verifactu.chain_continued_manually',          'Cadena continuada manualmente para {issuer_nif}: continúa en la secuencia {sequence_number} · Chain continued manually for {issuer_nif}: continues at sequence {sequence_number}'),
           ('verifactu.transmission_deferred',             'Aún no se ha enviado a la AEAT: {why} · Not sent to the AEAT yet: {why}'),
           ('certificate_unavailable',                     'el fichero del certificado no se ha podido cargar: comprueba en Ajustes → Negocio que está subido y que su contraseña es la correcta · the certificate file could not be loaded: check in Settings → Business that it is uploaded and that its password is correct'),
           ('no_transmission_route',                       'este hub todavía no tiene por dónde presentar: no tiene certificado propio ni conexión con la pasarela fiscal de ERPlora · this hub has no way to file yet: it has neither a certificate of its own nor a connection to ERPlora''s fiscal gateway'),
           ('gateway_not_ready',                           'la pasarela fiscal de ERPlora no puede presentar ahora mismo ({detail}) · ERPlora''s fiscal gateway cannot file right now ({detail})'),
           ('gateway_not_ready_unspecified',               'la pasarela fiscal de ERPlora no puede presentar ahora mismo y no ha dicho por qué · ERPlora''s fiscal gateway cannot file right now and did not say why'),
           ('gateway_unreachable',                         'no se ha podido contactar con la pasarela fiscal de ERPlora; inténtalo de nuevo en unos minutos · ERPlora''s fiscal gateway could not be reached; try again in a few minutes'),
           ('producer_facts_missing',                      'este hub todavía no ha recibido de ERPlora los datos del productor del software; llegan solos la próxima vez que se sincronice · this hub has not received its software-producer details from ERPlora yet; they arrive on their own the next time it syncs'),
           ('sample_envelope_invalid',                     'el registro de prueba no se ha podido construir con los ajustes de este hub · the test record could not be built from this hub''s settings'),
           ('sample_record_schema_invalid',                'el esquema de la AEAT ha rechazado el registro de prueba: {detail} · the AEAT schema refused the test record: {detail}'),
           ('certificate_loaded',                          'el certificado se ha cargado correctamente · the certificate loaded correctly'),
           ('gateway_ready',                               'la pasarela fiscal de ERPlora está disponible y presenta por ti · ERPlora''s fiscal gateway is available and files on your behalf'),
           ('issuer_nif_missing',                          'configura el NIF del obligado tributario (emisor) en Ajustes → Negocio antes de probar la conexión · set the taxpayer (issuer) tax ID in Settings → Business before testing the connection'),
           ('aeat_tls_rejected',                           'la AEAT no ha aceptado el certificado al abrir el canal seguro; comprueba que no esté caducado ni revocado · the AEAT did not accept the certificate when opening the secure channel; check that it has not expired and has not been revoked'),
           ('aeat_unreachable',                            'no se ha podido contactar con la AEAT; inténtalo de nuevo en unos minutos · the AEAT could not be reached; try again in a few minutes'),
           ('earlier_records_pending',                     'antes tiene que salir un registro anterior de la misma cadena, porque a la AEAT se envían en orden · an earlier record of the same chain has to go first, because records reach the AEAT in order'),
           ('schema_envelope_empty',                       'el registro a presentar ha salido vacío; no es XML válido · the record to be filed came out empty; it is not valid XML'),
           ('schema_envelope_not_regfactu',                'el sobre no es una presentación VeriFactu (RegFactuSistemaFacturacion) · the envelope is not a VeriFactu filing (RegFactuSistemaFacturacion)'),
           ('schema_record_missing',                       'el sobre no lleva ningún registro de factura · the envelope carries no invoice record at all'),
           ('schema_header_issuer_missing',                'la presentación no lleva obligado tributario: configura los datos fiscales del negocio en Ajustes → Negocio · the filing carries no taxpayer: set your business tax details in Settings → Business'),
           ('schema_issuer_identity_incomplete',           'los datos fiscales del negocio están incompletos: {element} es obligatorio y viene vacío · your business tax details are incomplete: {element} is required and came in empty'),
           ('schema_representative_incomplete',            'los datos del representante están incompletos: {element} es obligatorio · the filing agent''s details are incomplete: {element} is required'),
           ('schema_element_out_of_order',                 '{element} va fuera de orden; el esquema de la AEAT espera {sequence} · {element} is filed out of order; the AEAT schema expects {sequence}'),
           ('schema_element_missing',                      '{element} es obligatorio y no está en el registro · {element} is required and is not in the record'),
           ('schema_element_missing_or_empty',             '{element} es obligatorio y falta o viene vacío · {element} is required and is either missing or empty'),
           ('schema_element_empty',                        '{element} es obligatorio y viene vacío · {element} is required and came in empty'),
           ('schema_value_not_in_enum',                    '{element} vale «{value}», que el esquema de la AEAT no admite; solo acepta {allowed} · {element} is «{value}», which the AEAT schema does not admit; it only takes {allowed}'),
           ('schema_value_too_long',                       '{element} vale «{value}», más largo que los {max} caracteres que admite la AEAT · {element} is «{value}», longer than the {max} characters the AEAT admits'),
           ('schema_recipient_block_required',             'una factura {invoice_type} tiene que identificar al cliente; una venta sin NIF de cliente es un tique simplificado F2 · a {invoice_type} invoice has to identify the customer; a sale with no customer tax ID is a simplified F2 receipt'),
           ('schema_hash_type_unsupported',                'el tipo de huella «{value}» no está soportado; la AEAT solo admite 01 (SHA-256) · the hash type «{value}» is not supported; the AEAT only takes 01 (SHA-256)'),
           ('schema_hash_malformed',                       'la huella del registro no es un SHA-256 válido (64 caracteres hexadecimales) · the record hash is not a valid SHA-256 (64 hexadecimal characters)'),
           ('schema_rectification_field_on_plain_invoice', 'una factura {invoice_type} no rectifica nada, así que no puede informar {element}; la AEAT solo lo admite con tipo de factura {allowed} · a {invoice_type} invoice rectifies nothing, so it cannot carry {element}; the AEAT only admits it with invoice type {allowed}'),
           ('schema_rectification_type_missing',           'una rectificativa {invoice_type} exige TipoRectificativa ({allowed}); sin él la AEAT rechaza el registro, que ya ha gastado su número de cadena · a {invoice_type} corrective invoice requires TipoRectificativa ({allowed}); without it the AEAT refuses the record, which has already spent its chain number'),
           ('schema_rectification_amount_required',        'una rectificativa por sustitución (TipoRectificativa=S) exige ImporteRectificacion con la base y la cuota rectificadas · a corrective invoice by substitution (TipoRectificativa=S) requires ImporteRectificacion with the corrected base and tax'),
           ('schema_rectification_amount_not_allowed',     'una rectificativa por diferencias (TipoRectificativa=I) ya declara el delta en sus propios importes; ImporteRectificacion solo se informa con TipoRectificativa=S · a corrective invoice by difference (TipoRectificativa=I) already declares the delta in its own amounts; ImporteRectificacion is only filed with TipoRectificativa=S'),
           ('schema_breakdown_empty',                      'el desglose no lleva ninguna línea DetalleDesglose: la AEAT no admite un desglose vacío · the breakdown carries no DetalleDesglose line: the AEAT does not admit an empty breakdown'),
           ('schema_breakdown_too_many_lines',             'el desglose lleva {count} líneas y el esquema admite {max} · the breakdown carries {count} lines and the schema admits {max}'),
           ('schema_breakdown_value_not_in_enum',          'línea {line} del desglose: {element} vale «{value}», que no está en la enumeración; solo acepta {allowed} · breakdown line {line}: {element} is «{value}», which is not in the enumeration; it only takes {allowed}'),
           ('schema_breakdown_regime_not_in_enum',         'línea {line} del desglose: ClaveRegimen «{value}» no está en las listas L8A/L8B de la AEAT · breakdown line {line}: ClaveRegimen «{value}» is not in the AEAT L8A/L8B lists'),
           ('schema_breakdown_regime_not_allowed',         'línea {line} del desglose: ClaveRegimen solo se admite con impuesto {allowed}, y esta línea declara {tax} · breakdown line {line}: ClaveRegimen is only admitted with tax {allowed}, and this line declares {tax}'),
           ('schema_breakdown_regime_required',            'línea {line} del desglose: ClaveRegimen es obligatoria con impuesto {tax}; sin ella la AEAT responde el error 1245 · breakdown line {line}: ClaveRegimen is required with tax {tax}; without it the AEAT answers error 1245'),
           ('schema_breakdown_regime_requires_n2',         'línea {line} del desglose: ClaveRegimen {regime} exige CalificacionOperacion N2 y lleva «{qualification}» · breakdown line {line}: ClaveRegimen {regime} requires CalificacionOperacion N2 and carries «{qualification}»'),
           ('schema_breakdown_qualification_conflict',     'línea {line} del desglose: CalificacionOperacion y OperacionExenta son un choice del esquema — va una o la otra, nunca las dos · breakdown line {line}: CalificacionOperacion and OperacionExenta are a schema choice — one or the other, never both'),
           ('schema_breakdown_qualification_missing',      'línea {line} del desglose: falta CalificacionOperacion u OperacionExenta; el esquema exige una de las dos · breakdown line {line}: CalificacionOperacion or OperacionExenta is missing; the schema requires one of the two'),
           ('schema_breakdown_exemption_igic_only',        'línea {line} del desglose: OperacionExenta «{value}» solo existe con impuesto 03 (IGIC); con IVA la lista es E1–E6 · breakdown line {line}: OperacionExenta «{value}» only exists with tax 03 (IGIC); under VAT the list is E1–E6'),
           ('schema_breakdown_base_missing',               'línea {line} del desglose: {element} es obligatorio · breakdown line {line}: {element} is required'),
           ('schema_breakdown_exempt_amount_not_allowed',  'línea {line} del desglose: una línea con OperacionExenta no puede informar {element} · breakdown line {line}: a line with OperacionExenta cannot carry {element}'),
           ('schema_breakdown_untaxed_amount_not_allowed', 'línea {line} del desglose: con CalificacionOperacion «{qualification}» la línea no puede informar {element}; es el error 1237 de la AEAT · breakdown line {line}: with CalificacionOperacion «{qualification}» the line cannot carry {element}; it is the AEAT''s error 1237'),
           ('schema_breakdown_reverse_charge_not_zero',    'línea {line} del desglose: con inversión del sujeto pasivo (S2) {element} tiene que ser 0 y vale {value} · breakdown line {line}: under reverse charge (S2) {element} has to be 0 and is {value}'),
           ('schema_breakdown_reverse_charge_missing',     'línea {line} del desglose: con inversión del sujeto pasivo (S2) {element} es obligatorio y va a 0 — no se omite · breakdown line {line}: under reverse charge (S2) {element} is required and goes to 0 — it is not left out'),
           ('schema_breakdown_vat_rate_not_allowed',       'línea {line} del desglose: TipoImpositivo {value} no es un tipo de IVA; la AEAT solo admite 0, 2, 4, 5, 7,5, 10 y 21 · breakdown line {line}: TipoImpositivo {value} is not a VAT rate; the AEAT only admits 0, 2, 4, 5, 7.5, 10 and 21'),
           ('schema_breakdown_surcharge_rate_not_allowed', 'línea {line} del desglose: TipoRecargoEquivalencia {value} no es un tipo de recargo de equivalencia; la AEAT admite 0, 0,26, 0,5, 0,62, 1, 1,4, 1,75 y 5,2 · breakdown line {line}: TipoRecargoEquivalencia {value} is not an equivalence surcharge rate; the AEAT admits 0, 0.26, 0.5, 0.62, 1, 1.4, 1.75 and 5.2'),
           ('schema_simplified_over_ceiling',              'una factura simplificada F2 no puede pasar de {ceiling} (más {tolerance} de tolerancia) sumando base y cuota de todas las líneas, y esta suma {total}; con este importe hay que emitir factura completa identificando al destinatario · a simplified F2 invoice cannot go over {ceiling} (plus {tolerance} of tolerance) adding base and tax of every line, and this one adds {total}; at this amount a full invoice identifying the customer is required')
         ) AS w(code, words)
         WHERE to_jsonb(w.code) IN (
                 SELECT parsed.d -> 'message_key'
                 UNION ALL
                 SELECT jsonb_path_query(parsed.d, 'lax $.**.code'))
       ), '') AS message_words
FROM verifactu_event,
     LATERAL (SELECT CASE WHEN pg_input_is_valid(details, 'jsonb')
                          THEN CAST(details AS jsonb) END AS d) AS parsed
WHERE hub_id = :hub_id AND is_deleted = 0
