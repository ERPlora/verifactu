# WORKFLOW — VeriFactu · Vigilancia, retención, cese y renovación

Prefijo: VERIFACTU

## Flujos

### VERIFACTU-F31 Vigilar los envíos desde el panel y los eventos
Estado: parcial — «Pendientes VeriFactu» y «Registros por estado» cuentan también los envíos de prueba cuando el negocio ya factura de verdad (verifactu#105); «Pendientes VeriFactu» no se refresca cuando la cola envía registros; la pantalla Eventos no se refresca sola
Vertical: comun
Actor: empleado, responsable, administrador
Pantalla: Eventos
Pasos:
1. En el panel de inicio, «Pendientes VeriFactu» enseña cuántos registros no están aceptados (pendientes, con error, en reintento o rechazados); «Cola de contingencia», cuántos esperan en la cola; «Registros por estado», el reparto por estado; «Eventos AEAT recientes», lo último que pasó. «Pendientes VeriFactu» se refresca al nacer un registro o al enviarlo a mano, no cuando la cola se procesa; «Registros por estado», también tras cada pasada de la cola; «Cola de contingencia», al reintentar, descartar o procesar la cola; «Eventos AEAT recientes», al nacer o enviarse a mano un registro y tras cada pasada. Solo «Pendientes VeriFactu» sale de fábrica; las otras se añaden al panel.
2. Para el detalle, abre **VeriFactu → Eventos**: lo más reciente primero, con su severidad, su tipo y su mensaje en el idioma de quien mira.
3. Busca por palabras («aplazado», «sellado», el número de una factura) o filtra por tipo, severidad o fecha.
4. El mensaje de un evento dice qué pasó: por ejemplo «Aún no se ha enviado a la AEAT: {why}» con el motivo «este hub todavía no tiene por dónde presentar: no tiene certificado propio ni conexión con la pasarela fiscal de ERPlora», que se arregla en Configuración (VERIFACTU-F02, F05, F07). El evento no lleva enlace.
Entra: los registros, la cola y los eventos del módulo.
Sale: nada; es consulta.
Si falla: en la pantalla, el error con reintento; en la tarjeta de eventos, «No se han podido cargar los últimos eventos de la AEAT.».
Implicados: HUB-F34, HUB_SHELL-F33, HUB_SHELL-F35, REC_ALTA-F19
QA: qa-hub §7

### VERIFACTU-F32 Impedir apagar o desinstalar con registros sin enviar
Estado: parcial — la negativa sale en inglés en la pantalla española y en un aviso que desaparece a los 2,5 segundos; en producción, desinstalar Facturación forzando deja el TPV cobrando sin factura ni registro
Vertical: comun
Actor: sistema
Pantalla: Hub: Apps
Pasos:
1. Alguien intenta desactivar VeriFactu, o desactivar otro módulo que lo arrastra (por ejemplo, apagar Facturación apaga también VeriFactu), o desinstalar VeriFactu, también de forma forzada. Desinstalar Facturación no arrastra a VeriFactu: se niega porque VeriFactu depende de ella, y la forzada solo quita Facturación. En producción eso deja el TPV cobrando sin factura ni registro: la guarda fiscal de la desinstalación solo mira el módulo que se quita (no el conjunto, como al desactivar), y Facturación no declara régimen fiscal.
2. Si el hub ya está en producción, el núcleo niega antes que se quede sin ningún módulo que cumpla su régimen fiscal, aunque la cola esté vacía.
3. Después, el hub pregunta a VeriFactu cuántos registros no están aceptados (pendientes, con error, en reintento o rechazados).
4. Si queda alguno, lo niega diciendo cuántos; si no, sigue.
Entra: la petición de desactivar o desinstalar, del hub.
Sale: nada si se niega: no se desactiva ni se desinstala ninguno del conjunto, y VeriFactu sigue activo y enviando.
Si falla: la pantalla del hub enseña la frase del motor tal cual, en inglés y en un aviso que desaparece a los 2,5 segundos: {n} VeriFactu record(s) have not reached the AEAT yet: send them before disabling or removing the module. Ojo: un registro rechazado cuenta como no enviado y no se puede descartar, así que mientras exista impide desactivar y desinstalar.
Implicados: REC_FISCAL-F06, HUB-F28, HUB-F29, HUB-F316, HUB_SHELL-F122, HUB_SHELL-F124, HUB_SHELL-F125
QA: L-14, qa-hub §7

### VERIFACTU-F33 Cesar la actividad
Estado: no hecho — el núcleo del hub sabe cerrar un negocio (después no vuelve a emitir ni a pasar a producción) pero no hay pantalla ni puerta que lo haga; el módulo solo sabe decir «Este hub cesó su actividad y ya no emite facturas.»
Vertical: comun
Actor: administrador
Pantalla: ninguna
Pasos:
1. El cese ante Hacienda es la baja censal del negocio (modelo 036/037), que hace el propio negocio o su gestoría fuera de ERPlora: el software no tiene que enviar nada.
2. En el hub no hay hoy ninguna acción para cerrar el negocio.
3. Si un hub estuviera cerrado, «Pasar a producción» lo negaría con «Este hub cesó su actividad y ya no emite facturas.» y el hub no dejaría emitir facturas nuevas.
Entra: nada.
Sale: nada.
Si falla: no aplica.
Implicados: HUB-F309, REC_ALTA-F24
QA: ninguno

### VERIFACTU-F34 Renovar el certificado propio
Estado: parcial — el módulo no enseña cuándo caduca el certificado ni avisa antes; caducado en producción, el hub deja de cobrar hasta que se renueve o se pase a la vía de ERPlora
Vertical: comun
Actor: administrador
Pantalla: Configuración
Pasos:
1. Con el certificado nuevo en la mano, abre **VeriFactu → Configuración**, pestaña «Mi certificado».
2. Sube el fichero nuevo con su contraseña y pulsa «Subir certificado», como en VERIFACTU-F02: sustituye al anterior.
3. La cadena no cambia: los registros siguientes se encadenan igual y salen con el certificado nuevo.
4. Alternativa: apaga «Usar mi propio certificado» en Ajustes y deja que remita ERPlora (VERIFACTU-F04), si la autorización y la conexión segura están listas.
Entra: el certificado nuevo y su contraseña.
Sale: el certificado sustituido en el núcleo del hub.
Si falla: como VERIFACTU-F02. Con el certificado caducado y el hub en producción, el cobro se niega con el motivo de certificado caducado, y «Pasar a producción» con «Tu certificado propio ha caducado y la AEAT no lo acepta…».
Implicados: REC_FISCAL-F01, HUB-F302, HUB-F313, REC_ALTA-F12
QA: qa-hub-restaurant §7.11
