# WORKFLOW — VeriFactu · La cadena: verificar, recuperar, migrar y anular

Prefijo: VERIFACTU

## Flujos

### VERIFACTU-F26 Verificar la cadena de huellas
Estado: parcial — si la configuración del módulo nunca se guardó y el hub no tiene certificado propio, verifica la cadena de pruebas aunque el hub esté en producción
Vertical: comun
Actor: empleado, responsable, administrador
Pantalla: Recuperación
Pasos:
1. Abre **VeriFactu → Recuperación**. «Integridad de la cadena» enseña el último veredicto, o «Sin validar todavía».
2. Comprueba el «NIF del emisor» (viene relleno con el del negocio).
3. Pulsa «Validar cadena» («Validando…»).
4. Sale «Operación completada.» y el veredicto: «Cadena de huellas íntegra ✓» con «Cadena de huellas íntegra: {total} registro(s) con su encadenado SHA-256 verificado ({issuer_nif}). No se re-auditan los importes», o «Cadena de huellas ROTA ✗» con la secuencia donde se rompe.
Entra: los registros de la cadena de ese emisor.
Sale: el veredicto como evento «Cadena verificada» o «Cadena rota» (avisa: verifactu.chain.validated). Solo lee: no repara nada y no vuelve a auditar los importes.
Si falla: «No se pudo validar la cadena» o el mensaje del servidor. Sin NIF los botones están apagados. Sin el permiso «Certificado del negocio (firma fiscal)» se niega, aunque solo lea.
Implicados: HUB_VERIFACTU-F12
QA: L-14, qa-hub §7

### VERIFACTU-F27 Consultar lo que tiene la AEAT
Estado: hecho
Vertical: comun
Actor: responsable, administrador
Pantalla: Recuperación
Pasos:
1. En **VeriFactu → Recuperación**, con el «NIF del emisor» puesto, pulsa «Consultar AEAT» («Consultando…»).
2. El sistema pregunta a la AEAT, por la vía del hub, por los registros de ese emisor del mes en curso (no de meses anteriores).
3. La tabla «Últimos registros en la AEAT» se llena (Factura, Fecha, Huella, Estado, CSV, Cuándo) y sale «Operación completada.».
Entra: el NIF del emisor; la respuesta de la AEAT.
Sale: la foto de lo que tiene la AEAT, que sustituye a la anterior, y el evento «Consulta a la AEAT» (avisa: verifactu.aeat.queried). No toca la cadena.
Si falla: «No se pudo consultar a la AEAT» o el mensaje del servidor. Un empleado recibe la petición del PIN de un responsable.
Implicados: HUB_VERIFACTU-F13, VFGW-F07
QA: qa-hub §7

### VERIFACTU-F28 Recuperar la cadena desde la AEAT tras restaurar una copia
Estado: hecho
Vertical: comun
Actor: administrador
Pantalla: Recuperación
Pasos:
1. Tras restaurar una copia de la base de datos (la AEAT tiene registros que la copia no), deja de emitir y abre **VeriFactu → Recuperación**.
2. Comprueba el «NIF del emisor» y pulsa «Recuperar cadena desde la AEAT».
3. Confirma en «Recuperar la cadena desde la AEAT» («Se reconstruirá la continuidad local desde el último registro disponible en la AEAT. Verifica el NIF del emisor antes de continuar.») con «Confirmar recuperación»; «Cancelar» no hace nada.
4. Sale «Operación completada.»; en Eventos queda «Cadena recuperada desde la AEAT para {issuer_nif}: continúa en la secuencia {sequence_number} de {found} registro(s) encontrados». El siguiente registro se encadena sobre el último (por fecha de generación) que la AEAT tiene de este emisor en el mes en curso, en la cadena del entorno actual del hub.
5. Valida la cadena (VERIFACTU-F26) y vuelve a emitir.
Entra: el NIF del emisor y el último registro del mes en curso que tiene la AEAT. Si ese último es la muestra de una prueba en vivo con certificado propio (VERIFACTU-F10), la cadena se ancla sobre ella.
Sale: un ancla nueva en la cadena del entorno actual (avisa: verifactu.chain.recovered) y la foto de la AEAT actualizada.
Si falla: si la AEAT no tiene ningún registro de ese emisor en el mes en curso (por ejemplo, al restaurar una copia a primeros de mes), no se ancla nada y sale el mensaje del servidor, que dice en español que la AEAT no devolvió registros para ese periodo y no hay nada que recuperar. Solo el administrador puede hacerlo; a los demás se les niega, sin PIN.
Implicados: HUB_VERIFACTU-F14, VFGW-F07
QA: qa-hub §7

### VERIFACTU-F29 Continuar la cadena de otra aplicación (migración)
Estado: parcial — si la configuración del módulo nunca se guardó y el hub no tiene certificado propio, el ancla manual va a la cadena de pruebas aunque el hub ya esté en producción
Vertical: comun
Actor: administrador
Pantalla: Recuperación
Pasos:
1. En **VeriFactu → Recuperación**, bloque «Continuar cadena manualmente (migración)»: «Pega la última huella (64 hex) de tu aplicación anterior para continuar la misma concatenación.».
2. Escribe «Última huella (64 hex)» y, si quieres, «Nº de factura (opcional)» y «Fecha (YYYY-MM-DD, opcional)».
3. Pulsa «Continuar desde esta huella» y confirma en «Continuar la cadena desde una huella externa» («La huella indicada será el antecedente del próximo registro fiscal. Usa esta opción únicamente durante una migración…») con «Confirmar recuperación».
4. Sale «Operación completada.»; en Eventos queda «Cadena continuada manualmente para {issuer_nif}: continúa en la secuencia {sequence_number}». La próxima factura se encadena sobre esa huella.
Entra: la última huella de la aplicación anterior, que escribe la persona; sin número ni fecha, el sistema pone un número de recuperación y la fecha de hoy.
Sale: un ancla nueva en la cadena (avisa: verifactu.chain.recovered).
Si falla: una huella que no tiene 64 caracteres hexadecimales: «La huella debe tener 64 caracteres hexadecimales» y no se pide confirmación. Otro fallo: «No se pudo recuperar la cadena» o el mensaje del servidor. Solo el administrador puede hacerlo.
Implicados: HUB_VERIFACTU-F15
QA: qa-hub §7

### VERIFACTU-F30 Anular un registro enviado por error
Estado: parcial — solo con el asistente o por la API: ninguna pantalla crea un registro de anulación (ni Recuperación, donde lo sitúa el documento técnico)
Vertical: comun
Actor: responsable, administrador, asistente
Pantalla: asistente
Pasos:
1. Solo para un registro que se envió a la AEAT **por error** (una factura que nunca debió declararse). Una devolución o una corrección no se anula: es una rectificativa (VERIFACTU-F14). Anular una venta en Venta no crea ningún registro de anulación: Facturación no escucha la anulación y el tique sigue declarado (INVOICE-F07, REC_FISCAL-F13).
2. Pide al asistente un registro de anulación de esa factura, con el emisor, el número, la fecha y el tipo.
3. El sistema sella un registro de anulación encadenado (su propia huella) y lo envía como cualquier otro (VERIFACTU-F15).
4. Aparece en **Registros** con tipo «Anulación».
Entra: los datos de la factura que se anula, que da la persona.
Sale: el registro de anulación sellado y enviado (avisa: verifactu.record.created). La factura sigue existiendo en Facturación: anular el registro no la borra.
Si falla: como VERIFACTU-F15.
Implicados: INVOICE-F07, REC_FISCAL-F13, HUB_VERIFACTU-F03
QA: L-04 (discrepa), qa-hub §7 (discrepa)
