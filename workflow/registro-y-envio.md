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
3. Decide el tipo: el de la factura (F1, F2, F3). Una factura completa sin NIF de cliente se registra como tique simplificado F2 (la AEAT la rechazaría) y queda el evento «Tipo de factura cambiado»; un tique simplificado F2 que pase de 3.000 € (más 10 € de tolerancia) se niega.
4. Sella el registro de alta: le da el siguiente número de su cadena (por hub, NIF del emisor y entorno), calcula su huella con la del anterior y fija el enlace del QR al entorno en que nace (sede de pruebas o sede real). Queda el evento «Registro creado».
5. En el mismo instante intenta enviarlo a la AEAT (VERIFACTU-F15). El registro aparece en **Registros**.
Entra: la factura emitida, de Facturación (invoice.created); el entorno, la vía y los datos del productor, del núcleo del hub.
Sale: el registro de alta sellado (avisa: verifactu.record.created) y su envío.
Si falla: no deja nada a medias: si la cuota de una línea no cuadra con su tipo, si una factura ordinaria suma en negativo o si falta el NIF del emisor, no se escribe ningún registro ni se gasta número, y el aviso de Facturación se reintenta hasta acabar en la cola de fallos de Automatizaciones. Una factura que ya tiene registro no se duplica: la segunda entrega choca con el registro existente y también acaba en esa cola (es lo que describe verifactu#110). Si la factura no existe, no hace nada.
Implicados: pendiente
Pendiente de enlazar: invoice — emitir una factura o tique y avisar de su emisión
Pendiente de enlazar: hub — motor fiscal: secuencia, huella, QR y XML del registro de alta
Pendiente de enlazar: REC_FISCAL — de la venta al registro aceptado por la AEAT
QA: L-04, BD-09, R-09, B-06, qa-hub §7

### VERIFACTU-F14 Registrar una factura rectificativa
Estado: parcial — verifactu#110 (P0, abierta): una rectificativa emitida a mano se quedó sin registro porque la ingesta chocó con «ya existe»; sin confirmar si sigue ocurriendo en `origin/main`
Vertical: comun
Actor: sistema
Pantalla: ninguna
Pasos:
1. Facturación emite una rectificativa (R1–R5, importes negativos) por una devolución o una corrección, y avisa de que ha rectificado.
2. VeriFactu la registra igual que una factura (VERIFACTU-F13): como registro de **alta**, nunca de anulación, con su tipo R y lo que rectifica (número, fecha y NIF de la original, tipo de rectificación y, si es por sustitución, los importes rectificados).
3. Una rectificativa R1–R4 sin NIF de cliente se registra como R5 y queda el evento «Tipo de factura cambiado».
4. Se envía en el momento (VERIFACTU-F15) y aparece en **Registros** con su tipo R.
Entra: la rectificativa emitida, de Facturación (invoice.rectified), y la factura que rectifica.
Sale: el registro de alta de la rectificativa (avisa: verifactu.record.created) y su envío.
Si falla: como VERIFACTU-F13. Si la AEAT la rechaza por falta del tipo de rectificación, el número de cadena ya está gastado (lo dice el propio motivo del rechazo) y hay que actuar como en VERIFACTU-F24.
Implicados: pendiente
Pendiente de enlazar: invoice — rectificar una factura (devolución o corrección) y avisar
Pendiente de enlazar: sales — devolver una venta, que genera la rectificativa
QA: L-03, R-11, B-08, BD-09

### VERIFACTU-F15 Enviar el registro a la AEAT y recoger su respuesta
Estado: hecho
Vertical: comun
Actor: sistema
Pantalla: ninguna
Pasos:
1. Recién sellado el registro (VERIFACTU-F13, F14), el sistema mira si puede salir ya: si el hub no tiene ninguna vía, o hay un registro anterior de la misma cadena esperando, lo deja «Pendiente» con el evento «Envío aplazado» y su motivo, y saldrá después en orden (VERIFACTU-F20).
2. Si puede salir: guarda primero el XML exacto que va a viajar (si no se puede guardar, no se envía nada), lo comprueba contra el esquema de la AEAT y lo envía al entorno del propio registro, no al que esté configurado ahora: con certificado propio, directo a la AEAT; si no, a través de la celda fiscal de ERPlora, que lo presenta en nombre del negocio.
3. Respuesta de la AEAT:
   - correcta: «Aceptado» con su CSV; evento «Envío aceptado»;
   - aceptado con errores: también «Aceptado» (está registrado y no se reenvía); evento «Aceptado con avisos»;
   - rechazado: «Rechazado» con el código y el mensaje de la AEAT; evento «Envío fallido»; no se reintenta solo (VERIFACTU-F24). Si el rechazo es por la cadena, el sistema consulta a la AEAT, se reengancha a su último registro y lo reenvía una vez solo.
4. Si no hay respuesta (red, AEAT o celda caídas): «Error», entra en la cola de contingencia y sale solo después (VERIFACTU-F20).
5. Un XML que no pasa el esquema no se envía: queda «Rechazado» sin salir del hub.
Entra: el registro sellado; la vía, el certificado o la conexión segura, del núcleo del hub.
Sale: el estado y la respuesta de la AEAT en el registro. Avisa: verifactu.record.rejected cuando no ha llegado (rechazo de la AEAT, fallo de red, esquema inválido, entorno desconocido o sobre imposible de construir) y verifactu.record.accepted_with_errors cuando se aceptó con errores; los dos llevan solo el id del registro, el número de factura, el estado, el motivo, el código y el mensaje, y el entorno, nunca el NIF ni los importes. Una aceptación limpia no avisa a nadie.
Si falla: lo que no sale nunca se pierde: queda Pendiente o en la cola, con el motivo en Eventos y en el detalle del registro (VERIFACTU-F17). Un registro que no sabe su entorno no se envía a ninguno.
Implicados: pendiente
Pendiente de enlazar: hub — motor fiscal: envío, clasificación de la respuesta y reenganche de la cadena
Pendiente de enlazar: verifactu-gateway — presentar el registro en nombre del negocio y devolver la respuesta de la AEAT
Pendiente de enlazar: REC_FISCAL — de la venta al registro aceptado por la AEAT
QA: L-04, R-09, B-06, BD-09, qa-hub §7, qa-hub-restaurant §7.11

### VERIFACTU-F16 Consultar los registros y su estado
Estado: parcial — la lista mezcla los envíos de prueba y los reales sin distinguirlos (verifactu#103); el buscador dice «NIF» pero no busca por NIF; los estados «Transmitido» y «Reintento» se ofrecen en el filtro pero el motor no los escribe nunca
Vertical: comun
Actor: empleado, responsable, administrador
Pantalla: Registros
Pasos:
1. Abre **VeriFactu → Registros**.
2. Busca por número de factura, número de secuencia o nombre del emisor, o filtra por fecha, tipo, total, estado y demás columnas. El filtro del total se escribe en euros.
3. Cada fila enseña su estado con color: verde «Aceptado», rojo «Rechazado» o «Error», ámbar «Pendiente».
4. La lista se refresca sola cuando nace o se envía un registro.
5. Si el negocio ya ha emitido facturas y no hay ningún registro, el aviso «La cadena no está sellando» lleva a «Revisar permisos» (Ajustes → Permisos) y «Ver eventos caídos» (Sistema → Eventos del hub).
Entra: los registros del módulo; el número de facturas emitidas, de Facturación (solo para comparar).
Sale: nada; es consulta.
Si falla: el mensaje de error con reintento; sin permiso para ver Facturación, el aviso «No hay registros y no se ha podido leer cuántas facturas se han emitido…».
Implicados: pendiente
Pendiente de enlazar: invoice — contar las facturas emitidas para detectar una cadena que no sella
QA: L-14, qa-hub §7

### VERIFACTU-F17 Ver el detalle de un registro y por qué espera
Estado: hecho
Vertical: comun
Actor: empleado, responsable, administrador
Pantalla: Registros
Pasos:
1. En **VeriFactu → Registros**, pulsa una fila. Mientras carga sale «Cargando…» encima de la lista.
2. Se abre «Registro {número}» con su estado, los datos de la factura, «Generado el» y «Transmitido el», la «Cadena de huellas», la «Huella de la entrega» y la «Respuesta de la AEAT» (CSV, código, mensaje, reintentos, próximo reintento).
3. Si el registro está Pendiente, Error o Reintento, arriba sale «Aún no está en la AEAT» con el porqué (el motivo del último aplazamiento o fallo, en palabras: por ejemplo «este hub todavía no tiene por dónde presentar…» o «antes tiene que salir un registro anterior de la misma cadena…») y el cuándo: «Está en la cola de contingencia y sale solo en su próximo intento, {fecha}, en orden y declarado a la AEAT como envío tardío. No tienes que hacer nada.» o «Sale solo en el próximo envío automático —cada 5 minutos, en cuanto este hub pueda enviar—…».
4. «Volver» regresa a la lista.
Entra: el registro, sus eventos y su entrada en la cola.
Sale: nada; es consulta.
Si falla: «Registro no encontrado» o el error encima de la lista; si no se pudo leer el motivo, «No se ha podido cargar el motivo.»; sin motivo guardado, «No salió al crearse.».
Implicados: ninguno
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
Implicados: pendiente
Pendiente de enlazar: REC_FISCAL — el cliente coteja su tique en la sede de la AEAT
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
Si falla: sin registro o sin permiso de consulta, Venta y Facturación lo tratan como «sin QR».
Implicados: pendiente
Pendiente de enlazar: sales — pintar el documento de la venta con el QR de VeriFactu
Pendiente de enlazar: invoice — enseñar el QR y el estado fiscal de una factura
Pendiente de enlazar: printing — imprimir el tique con su QR o avisar de reimprimirlo
QA: L-04, L-05, R-09, B-06
