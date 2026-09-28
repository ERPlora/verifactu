-- VeriFactu audit log / events. The runtime injects :hub_id.
-- Ported from routes.events_list. The order (newest first) and the search are applied by the list
-- engine from `module.json` (`list.default_sort` / `list.search`), not by this SELECT.
--
-- `type_label`: the name of the type as the screen paints it, in BOTH languages the module ships
-- (`locales/*.json` -> `ui.evtType.*`), so the search finds «Envío aplazado» or «Submission
-- postponed» while the row stores `transmission_deferred` (verifactu#140). The locale catalogue
-- does not exist in SQL, so this is a copy: `ui/lib/event-type-search.test.ts` compares it with the
-- locales code by code. A type the engine adds and this CASE lacks is still found by its code.
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
         ELSE event_type END AS type_label
FROM verifactu_event
WHERE hub_id = :hub_id AND is_deleted = 0
