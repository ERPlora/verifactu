# WORKFLOW — VeriFactu · Registro y envío de cada factura

Prefijo: VERIFACTU

## Flujos

### VERIFACTU-F13 Registrar una factura emitida
Estado: hecho
Vertical: comun
Actor: sistema
Pantalla: ninguna
Pasos:
1. Facturación emite una factura o un tique (al cobrar en el TPV, a mano o la factura de prueba) y lo avisa.
2. VeriFactu lee esa factura: número oficial, fecha, emisor, cliente, importes y su desglose por tipo de IVA, y la simplificada que sustituye si es una F3.
3. Decide el tipo: el de la factura (F1, F2, F3). Una factura completa sin NIF de cliente se registra como tique simplificado F2 (la AEAT la rechazaría) y queda el evento «Tipo de factura cambiado»; si esa F2 degradada pasa de 3.010 €, se niega sin gastar número. Una F2 que ya llega como F2 por encima de ese techo se sella (gasta número) y después queda «Rechazado» sin salir del hub: Facturación no la frena (INVOICE-F01) y solo la pantalla de Venta impide cobrar un tique por encima del límite (SALES-F04); por el asistente o la API llega aquí (REC_FISCAL-F03).
4. Sella el registro de alta: le da el siguiente número de su cadena (por hub, NIF del emisor y entorno), calcula su huella con la del anterior y fija el enlace del QR al entorno en que nace (sede de pruebas o sede real). Queda el evento «Registro creado».
5. En el mismo instante intenta enviarlo a la AEAT (VERIFACTU-F15). El registro aparece en **Registros**.
Entra: la factura emitida, de Facturación (invoice.created); el entorno, la vía y los datos del productor, del núcleo del hub.
Sale: el registro de alta sellado (avisa: verifactu.record.created) y su envío.
Si falla: no deja nada a medias: si la cuota de una línea no cuadra con su tipo, si una factura ordinaria suma en negativo o si falta el NIF del emisor, no se escribe ningún registro ni se gasta número, y el aviso de Facturación se reintenta hasta acabar en la cola de fallos de Automatizaciones. Sin el permiso «Certificado del negocio (firma fiscal)» no se registra ninguna factura: los avisos acaban en esa cola y se reprocesan solos al conceder el permiso; mientras tanto, en producción, la venta no se bloquea. Una factura que ya tiene registro no se duplica: la segunda entrega choca con el registro existente y también acaba en esa cola (es lo que describe verifactu#110). Si la factura no existe, no hace nada.
Implicados: INVOICE-F01, INVOICE-F02, INVOICE-F03, INVOICE-F04, INVOICE-F05, INVOICE-F11, REC_FISCAL-F03, REC_FISCAL-F04, REC_FISCAL-F10
Pendiente de enlazar: hub — motor fiscal: secuencia, huella, QR y XML del registro de alta
QA: L-04, BD-09, R-09, B-06, qa-hub §7

### VERIFACTU-F14 Registrar una factura rectificativa
Estado: parcial — verifactu#110 (P0, abierta): una rectificativa emitida a mano se quedó sin registro porque la ingesta chocó con un registro que ya existía; sin confirmar si sigue ocurriendo en `origin/main`. La rectificativa por sustitución solo se puede registrar con el asistente o la API
Vertical: comun
Actor: sistema
Pantalla: ninguna
Pasos:
1. Facturación emite una rectificativa (R1–R5, importes negativos) por una devolución o una corrección, y avisa de que ha rectificado.
2. VeriFactu la registra igual que una factura (VERIFACTU-F13): como registro de **alta**, nunca de anulación, con su tipo R, la factura que rectifica (número, fecha y NIF) y siempre como rectificativa **por diferencias**: sus propios importes son la diferencia. La rectificativa por sustitución, con los importes rectificados, solo entra con el asistente o la API.
3. Una rectificativa R1–R4 sin NIF de cliente se registra como R5 y queda el evento «Tipo de factura cambiado».
4. Se envía en el momento (VERIFACTU-F15) y aparece en **Registros** con su tipo R.
Entra: la rectificativa emitida, de Facturación (invoice.rectified), y la factura que rectifica.
Sale: el registro de alta de la rectificativa (avisa: verifactu.record.created) y su envío.
Si falla: como VERIFACTU-F13.
Implicados: INVOICE-F07, INVOICE-F08, INVOICE-F09, INVOICE-F10, REC_FISCAL-F11, REC_FISCAL-F12, REC_FISCAL-F13
QA: L-03, R-11, B-08, BD-09

### VERIFACTU-F15 Enviar el registro a la AEAT y recoger su respuesta
Estado: parcial — una respuesta de la AEAT que no es ni aceptación ni rechazo deja el registro en «Error» sin entrada en la cola, y nadie lo vuelve a enviar solo
Vertical: comun
Actor: sistema
Pantalla: ninguna
Pasos:
1. Recién sellado el registro (VERIFACTU-F13, F14), el sistema mira si puede salir ya: si el hub no tiene ninguna vía, o hay un registro anterior de la misma cadena al que le toca salir en ese momento, lo deja «Pendiente» con el evento «Envío aplazado» y su motivo, y saldrá después en orden (VERIFACTU-F20). Un registro anterior que está esperando su próximo reintento no frena a los nuevos: esos pueden llegar antes que él a la AEAT.
2. Si puede salir: comprueba el XML contra el esquema de la AEAT, guarda el XML exacto que va a viajar (si no se puede guardar, no se envía nada) y lo envía al entorno del propio registro, no al que esté configurado ahora: con certificado propio, directo a la AEAT; si no, a través de la celda fiscal de ERPlora, que lo presenta en nombre del negocio.
3. Respuesta de la AEAT:
   - correcta: «Aceptado» con su CSV; evento «Envío aceptado»;
   - aceptado con errores: también «Aceptado» (está registrado y no se reenvía); evento «Aceptado con avisos». El mismo evento sale con una aceptación limpia de un registro que ha ido a un entorno distinto del actual del hub (por ejemplo, uno de pruebas que sale después de pasar a producción);
   - rechazado: «Rechazado» con el código y el mensaje de la AEAT; evento «Envío fallido»; no se reintenta solo (VERIFACTU-F24). Si el rechazo es por la cadena, el sistema consulta a la AEAT, se reengancha a su último registro y lo reenvía una vez solo;
   - una respuesta que no es ninguna de las anteriores: «Error», sin entrada en la cola.
4. Si no hay respuesta (red, AEAT o celda caídas, o un fallo de la AEAT que se puede reintentar): «Error», entra en la cola de contingencia y sale solo después (VERIFACTU-F20).
5. Un XML que no pasa el esquema no se envía ni se guarda en el archivo: queda «Rechazado» sin salir del hub.
Entra: el registro sellado; la vía, el certificado o la conexión segura, del núcleo del hub.
Sale: el estado y la respuesta de la AEAT en el registro, y el XML guardado en el archivo de ficheros del módulo. Avisa: verifactu.record.rejected cuando no ha llegado (rechazo de la AEAT, fallo de red, esquema inválido, entorno desconocido o sobre imposible de construir) y verifactu.record.accepted_with_errors cuando se aceptó con errores; los dos llevan solo el id del registro, el número de factura, el estado, el motivo, el código y el mensaje, y el entorno, nunca el NIF ni los importes. Una aceptación limpia no avisa a nadie.
Si falla: lo que falla por la red o por la vía queda en la cola con su motivo en Eventos y en el detalle (VERIFACTU-F17); lo que nace sin vía queda Pendiente y lo recoge la pasada. Dos casos no se recuperan solos: el «Error» de una respuesta no reconocida, que no tiene entrada en la cola; y un registro que venía de la cola y no pasa el esquema, que conserva su entrada y se vuelve a comprobar, sin éxito, en cada pasada. Un registro que no sabe su entorno no se envía a ninguno.
Implicados: FLOWS-F04, REC_FISCAL-F05
Pendiente de enlazar: hub — motor fiscal: envío, clasificación de la respuesta y reenganche de la cadena
Pendiente de enlazar: verifactu-gateway — presentar el registro en nombre del negocio y devolver la respuesta de la AEAT
QA: L-04, R-09, B-06, BD-09, qa-hub §7, qa-hub-restaurant §7.11

### VERIFACTU-F16 Consultar los registros y su estado
Estado: parcial — la lista mezcla los envíos de prueba y los reales sin distinguirlos (verifactu#103); el buscador dice «NIF» pero no busca por NIF; los estados «Transmitido» y «Reintento» se ofrecen en el filtro pero el motor no los escribe nunca; la lista no se refresca cuando la cola envía registros
Vertical: comun
Actor: empleado, responsable, administrador
Pantalla: Registros
Pasos:
1. Abre **VeriFactu → Registros**.
2. Busca por número de factura, número de secuencia o nombre del emisor, o filtra por fecha, tipo, total, estado y demás columnas. El filtro del total se escribe en euros.
3. Cada fila enseña su estado con color: verde «Aceptado», rojo «Rechazado» o «Error», ámbar «Pendiente».
4. La lista se refresca sola cuando nace un registro o cuando se envía uno a mano (VERIFACTU-F25); lo que envía la pasada de la cola no aparece hasta recargar.
5. Si el negocio ya ha emitido facturas y no hay ningún registro, el aviso «La cadena no está sellando» lleva a «Revisar permisos» (Ajustes → Permisos) y «Ver eventos caídos» (Sistema → Eventos del hub).
Entra: los registros del módulo; el número de facturas emitidas, de Facturación (solo para comparar).
Sale: nada; es consulta.
Si falla: el mensaje de error con reintento; sin permiso para ver Facturación, el aviso «No hay registros y no se ha podido leer cuántas facturas se han emitido, así que no se puede saber si la cadena está sellando. Pídele a un administrador que lo compruebe.».
Implicados: INVOICE-F16
QA: L-14, qa-hub §7

### VERIFACTU-F17 Ver el detalle de un registro y por qué espera
Estado: hecho
Vertical: comun
Actor: empleado, responsable, administrador
Pantalla: Registros
Pasos:
1. En **VeriFactu → Registros**, pulsa una fila. Mientras carga sale «Cargando…» encima de la lista.
2. Se abre «Registro {number}» con su estado, los datos de la factura, «Generado el» y «Transmitido el», la «Cadena de huellas», la «Huella de la entrega» y la «Respuesta de la AEAT» (CSV, código, mensaje, reintentos, próximo reintento).
3. Si el registro está Pendiente, Error o Reintento, arriba sale «Aún no está en la AEAT» con el porqué (el motivo del último aplazamiento o fallo, en palabras: por ejemplo «este hub todavía no tiene por dónde presentar…» o «antes tiene que salir un registro anterior de la misma cadena…») y el cuándo: «Está en la cola de contingencia y sale solo en su próximo intento, {at}, en orden y declarado a la AEAT como envío tardío. No tienes que hacer nada.» o «Sale solo en el próximo envío automático —cada 5 minutos, en cuanto este hub pueda enviar—, en orden y declarado a la AEAT como envío tardío. No tienes que hacer nada.». Ese segundo texto también sale para un «Error» sin entrada en la cola, que en realidad no saldrá solo (VERIFACTU-F15).
4. «Volver» regresa a la lista.
Entra: el registro, sus eventos y su entrada en la cola.
Sale: nada; es consulta.
Si falla: «Registro no encontrado» o el error encima de la lista; si no se pudo leer el motivo, «No se ha podido cargar el motivo.»; sin motivo guardado, «No salió al crearse.».
Implicados: REC_FISCAL-F06
QA: qa-hub §7

### VERIFACTU-F18 Cotejar el QR en la sede de la AEAT
Estado: parcial — para cotejar un envío hay que abrir su detalle, y el enlace dice «Abrir QR» en vez de decir que lleva a la AEAT (verifactu#104)
Vertical: comun
Actor: empleado, responsable, administrador, cliente
Pantalla: Registros
Pasos:
1. En **VeriFactu → Registros**, abre el registro (VERIFACTU-F17).
2. En «Respuesta de la AEAT», pulsa «Abrir QR»: abre en otra pestaña la página de cotejo de la AEAT con el NIF del emisor, el número, la fecha y el importe del registro.
3. La AEAT dice si lo tiene. Un registro nacido en pruebas lleva a la sede de pruebas; uno nacido en producción, a la sede real.
4. El cliente hace lo mismo escaneando el QR impreso en su tique o en su factura (VERIFACTU-F19).
Entra: el enlace del QR guardado en el registro al sellarlo.
Sale: nada en el hub; la comprobación ocurre en la sede de la AEAT.
Si falla: un registro que aún no ha llegado (Pendiente, Error) se ve en la AEAT como no encontrado hasta que salga (VERIFACTU-F20). Uno rechazado no se encontrará nunca.
Implicados: REC_FISCAL-F08
QA: L-04, qa-hub §7, qa-hub-restaurant §7.11

### VERIFACTU-F19 Dar el QR y el estado fiscal al tique y a la factura
Estado: hecho
Vertical: comun
Actor: sistema
Pantalla: ninguna
Pasos:
1. Cuando Venta pinta el documento de una venta, o Facturación una factura, preguntan a VeriFactu por el registro de esa factura.
2. VeriFactu devuelve el más reciente: su QR, su CSV, su estado, su tipo y su huella.
3. Venta y Facturación pintan el QR con él; si VeriFactu no está instalado o la factura aún no tiene registro, no hay QR (Venta reintenta, y el tique impreso antes de tener QR avisa de que hay que reimprimirlo).
Entra: el id de la factura, de Venta o de Facturación.
Sale: el registro de esa factura (QR, CSV, estado), por la consulta pública de VeriFactu.
Si falla: sin registro o sin permiso de consulta, Venta y Facturación lo tratan como una factura sin QR.
Implicados: INVOICE-F17, PRINTING-F07, SALES-F29, REC_FISCAL-F07, REC_FISCAL-F08
QA: L-04, L-05, R-09, B-06
