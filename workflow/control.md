# WORKFLOW — VeriFactu · Vigilancia, retención, cese y renovación

Prefijo: VERIFACTU

## Flujos

### VERIFACTU-F31 Vigilar los envíos desde el panel y los eventos
Estado: parcial — «Pendientes VeriFactu» y «Registros por estado» cuentan también los envíos de prueba cuando el negocio ya factura de verdad (verifactu#105); la pantalla Eventos no se refresca sola
Vertical: comun
Actor: empleado, responsable, administrador
Pantalla: Eventos
Pasos:
1. En el panel de inicio, «Pendientes VeriFactu» enseña cuántos registros no están aceptados (pendientes, con error, en reintento o rechazados); «Cola de contingencia», cuántos esperan en la cola; «Registros por estado», el reparto por estado; «Eventos AEAT recientes», lo último que pasó. Las tarjetas se refrescan cuando nace o se envía un registro o se mueve la cola. Solo «Pendientes VeriFactu» sale de fábrica; las otras se añaden al panel.
2. Para el detalle, abre **VeriFactu → Eventos**: lo más reciente primero, con su severidad, su tipo y su mensaje en el idioma de quien mira.
3. Busca por palabras («aplazado», «sellado», el número de una factura) o filtra por tipo, severidad o fecha.
4. Desde el mensaje de un evento se sabe qué hacer: por ejemplo «Aún no se ha enviado a la AEAT: este hub todavía no tiene por dónde presentar…» lleva a Configuración (VERIFACTU-F04, F05, F07).
Entra: los registros, la cola y los eventos del módulo.
Sale: nada; es consulta.
Si falla: en la pantalla, el error con reintento; en la tarjeta de eventos, «No se han podido cargar los últimos eventos de la AEAT.».
Implicados: pendiente
Pendiente de enlazar: hub — panel de inicio que pinta las tarjetas de los módulos
QA: qa-hub §7

### VERIFACTU-F32 Impedir apagar o desinstalar con registros sin enviar
Estado: hecho
Vertical: comun
Actor: sistema
Pantalla: Hub: Apps
Pasos:
1. Alguien intenta desactivar o desinstalar VeriFactu (también cuando lo arrastra la desinstalación de otro módulo, o una desinstalación forzada).
2. El hub pregunta antes a VeriFactu cuántos registros no están aceptados (pendientes, con error, en reintento o rechazados).
3. Si queda alguno, lo niega diciendo cuántos (`verifactu.unsent_records`); si no, sigue.
Entra: la petición de desactivar o desinstalar, del hub.
Sale: nada si se niega; el módulo sigue activo y enviando.
Si falla: la negativa sale en la pantalla del hub que lo pidió (texto exacto sin confirmar). Ojo: un registro rechazado cuenta como no enviado y no se puede descartar, así que mientras exista impide desinstalar.
Implicados: pendiente
Pendiente de enlazar: hub — desactivar y desinstalar módulos, preguntando antes al módulo si puede irse
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
Implicados: pendiente
Pendiente de enlazar: hub — cerrar el perfil fiscal de un negocio que cesa
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
Implicados: pendiente
Pendiente de enlazar: hub — sustituir el certificado del negocio sin romper la cadena
Pendiente de enlazar: sales — negar el cobro en producción cuando la vía no existe o el certificado caducó
QA: qa-hub-restaurant §7.11
