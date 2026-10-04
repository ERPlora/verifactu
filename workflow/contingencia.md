# WORKFLOW — VeriFactu · Contingencia, reintentos y rechazos

Prefijo: VERIFACTU

## Flujos

### VERIFACTU-F20 Enviar después lo que no pudo salir (contingencia automática)
Estado: parcial — en pruebas, un hub sin ninguna vía deja sus tiques con QR pendientes sin límite de tiempo: la cola no hace nada hasta que el hub tenga vía, así que «todo tique con QR llega a la AEAT» no lo garantiza el código en ese caso
Vertical: comun
Actor: sistema
Pantalla: Contingencia
Pasos:
1. Mientras se vende, nada se para: si la AEAT, la celda de ERPlora o la red están caídas, o el hub aún no tiene vía, el cobro sigue (en producción, solo una vía que no existe impide cobrar: lo decide el núcleo del hub) y el registro queda Pendiente o en la cola con estado Error.
2. Cada 5 minutos el sistema repasa: las entradas de la cola a las que les toca, los registros pendientes que nunca salieron y los rechazados porque les faltaba el cliente (los recompone con el cliente de la factura).
3. Los envía en el orden de su cadena (entorno, emisor y número de secuencia), cada uno al entorno en que nació, reutilizando el XML guardado y declarados a la AEAT como envío tardío por incidencia. Si uno falla, los demás siguen.
4. Cada entrada que vuelve a fallar espera más: 5, 10, 20, 40 y 60 minutos, y después cada 60 minutos, sin límite de intentos. El aceptado sale de la cola; el rechazado por la AEAT pasa a `failed` y ya no se reintenta (VERIFACTU-F24).
5. Queda el evento «Cola de contingencia procesada: {n} enviados, {m} con error» y la pantalla **Contingencia** se refresca sola.
Entra: los registros pendientes y la cola; la vía del núcleo del hub.
Sale: los registros enviados y su respuesta, como en VERIFACTU-F15 (avisa: verifactu.contingency.processed). Si se había perdido una pasada (hub apagado), al volver se hace una sola.
Si falla: sin vía, la pasada no envía nada y los registros siguen esperando con su motivo en el detalle (VERIFACTU-F17). Un registro que no sabe su entorno o cuyo sobre no se puede construir se queda en la cola con su motivo en Eventos.
Implicados: pendiente
Pendiente de enlazar: hub — tarea programada que drena la cola y regla de no cobrar sin vía en producción
Pendiente de enlazar: verifactu-gateway — presentar los envíos tardíos marcados como incidencia
Pendiente de enlazar: REC_FISCAL — cobrar sin conexión y que el registro llegue después a la AEAT
QA: L-04, BD-09, qa-hub §7, qa-hub-restaurant §7.11

### VERIFACTU-F21 Procesar la cola a mano
Estado: hecho
Vertical: comun
Actor: responsable, administrador
Pantalla: Contingencia
Pasos:
1. Abre **VeriFactu → Contingencia**.
2. Pulsa «Procesar cola» («Procesando…»).
3. El sistema hace en ese momento la misma pasada que cada 5 minutos (VERIFACTU-F20), hasta 100 registros.
4. La tabla se recarga: lo que salió desaparece de la cola y lo que no, sigue con su «Último error» y su «Próximo intento».
Entra: la cola y los registros pendientes.
Sale: los mismos envíos que la pasada automática (avisa: verifactu.contingency.processed).
Si falla: «No se pudo procesar la cola» o el mensaje del servidor encima de la tabla. Sin vía no se envía nada.
Implicados: pendiente
Pendiente de enlazar: hub — drenar la cola a petición con los permisos de quien la pide
QA: qa-hub §7

### VERIFACTU-F22 Reintentar una entrada de la cola
Estado: parcial — «Reintentar» no envía: reprograma la entrada para la próxima pasada; además acepta cualquier entrada, también una ya descartada o una rechazada por la AEAT, y responde bien aunque la entrada no exista
Vertical: comun
Actor: responsable, administrador
Pantalla: Contingencia
Pasos:
1. En **VeriFactu → Contingencia**, elige la entrada.
2. Pulsa «Reintentar» en su fila.
3. La entrada vuelve a «pending», con los intentos a cero y el próximo intento ahora mismo.
4. Sale en la siguiente pasada automática (como mucho 5 minutos) o al pulsar «Procesar cola» (VERIFACTU-F21).
Entra: la entrada elegida.
Sale: la entrada reprogramada (avisa: verifactu.contingency.retried).
Si falla: «No se pudo reencolar» o el mensaje del servidor. Reintentar una entrada rechazada por la AEAT vuelve a enviar el mismo XML, que la AEAT volverá a rechazar si nada ha cambiado (sin confirmar qué hace la pasada con una entrada descartada cuyo registro ya está aceptado).
Implicados: ninguno
QA: qa-hub §7

### VERIFACTU-F23 Descartar una entrada de la cola
Estado: parcial — el botón «Cancelar» sale en todas las filas aunque casi nunca se puede usar: solo vale con el registro ya aceptado, y al aceptarse la entrada ya sale sola de la cola
Vertical: comun
Actor: responsable, administrador
Pantalla: Contingencia
Pasos:
1. En **VeriFactu → Contingencia**, elige la entrada.
2. Pulsa «Cancelar» en su fila; no pide confirmación.
3. Si su registro ya está aceptado por la AEAT, la entrada pasa a «cancelled» y deja de reintentarse.
4. En cualquier otro caso no cambia nada y sale «No se puede descartar: el registro aún no está registrado en la AEAT. Reintenta la transmisión.».
Entra: la entrada elegida y el estado de su registro.
Sale: la entrada descartada (avisa: verifactu.contingency.cancelled) solo si su registro estaba aceptado; si no, se deshace todo, aviso incluido.
Si falla: «No se pudo cancelar» o el mensaje del servidor.
Implicados: ninguno
QA: L-04, qa-hub §7

### VERIFACTU-F24 Actuar ante un registro rechazado por la AEAT
Estado: parcial — la pantalla enseña el código y el mensaje de la AEAT, pero no dice qué hacer; reenviar manda el mismo XML congelado, y corregir (subsanar o rectificar) no tiene camino guiado
Vertical: comun
Actor: responsable, administrador
Pantalla: Registros
Pasos:
1. El registro sale en rojo «Rechazado» en **VeriFactu → Registros** y cuenta en «Pendientes VeriFactu» del panel; en **Eventos** queda «Envío fallido» con el motivo.
2. Abre su detalle (VERIFACTU-F17): «Código de respuesta» y «Mensaje de respuesta» son los de la AEAT, literales.
3. Si fue un rechazo por la cadena, el sistema ya se reenganchó y lo reenvió solo (VERIFACTU-F15). Para cualquier otro, la pantalla no dice cómo corregirlo: si corresponde subsanar el registro o emitir una rectificativa en Facturación (VERIFACTU-F14) es una duda abierta.
4. Para volver a enviar el mismo registro: «Reintentar» en Contingencia (VERIFACTU-F22) o pedirlo al asistente (VERIFACTU-F25). La AEAT lo volverá a rechazar si lo que viaja no ha cambiado.
Entra: el registro rechazado y la respuesta de la AEAT.
Sale: según lo que haga la persona: un reenvío del mismo registro o, si emite una rectificativa, un registro nuevo.
Si falla: un registro rechazado no se puede descartar ni borrar, e impide desactivar o desinstalar VeriFactu (VERIFACTU-F32).
Implicados: pendiente
Pendiente de enlazar: invoice — rectificar una factura para corregir lo que la AEAT rechazó
QA: L-03, L-04, qa-hub §7

### VERIFACTU-F25 Reenviar un registro concreto
Estado: parcial — solo con el asistente o por la API: en Registros no hay botón de enviar
Vertical: comun
Actor: responsable, administrador, asistente
Pantalla: asistente
Pasos:
1. Pide al asistente que envíe a la AEAT el registro de una factura concreta.
2. Se envía en el momento por la vía del hub, declarado como envío tardío por incidencia, con el XML guardado.
3. El registro queda con la respuesta de la AEAT, como en VERIFACTU-F15, y se ve en **Registros**.
Entra: el registro elegido.
Sale: el envío y su respuesta (avisa: verifactu.record.transmitted).
Si falla: un registro ya aceptado no se reenvía (la AEAT lo daría por duplicado); sin vía en el hub, se niega. Un fallo de red lo deja en la cola (VERIFACTU-F20).
Implicados: pendiente
Pendiente de enlazar: hub — motor fiscal: envío manual de un registro concreto
QA: qa-hub §7
