# WORKFLOW — VeriFactu · Puesta en marcha y configuración

Prefijo: VERIFACTU

## Flujos

### VERIFACTU-F01 Activar VeriFactu
Estado: parcial — el interruptor solo cuenta para la lista de puesta en marcha del hub: con él apagado el módulo instalado registra y envía igual cada factura, porque el motor fiscal no lo lee
Vertical: comun
Actor: administrador
Pantalla: Ajustes
Pasos:
1. Abre **VeriFactu → Ajustes**.
2. Enciende «Activar VeriFactu».
3. Pulsa «Guardar configuración».
4. Sale «Configuración guardada correctamente.» y, debajo, el aviso «Permiso: Certificado del negocio (firma fiscal)» con «Ir a Permisos», que recuerda conceder ese permiso en Ajustes → Permisos. El emisor (NIF y razón social) se toma de Ajustes → Negocio; no se escribe aquí.
5. En la lista de puesta en marcha del hub, «Configura VeriFactu» se da por hecho cuando VeriFactu está activado y el hub tiene por dónde enviar.
Entra: la identidad fiscal del negocio (Ajustes → Negocio, núcleo del hub); el entorno en que remite el hub, del núcleo.
Sale: la configuración del módulo guardada con el emisor efectivo y el entorno del núcleo (avisa: verifactu.config.changed). Cada guardado vuelve a copiar el NIF y la razón social de Ajustes → Negocio.
Si falla: sin NIF en Ajustes → Negocio: «No se puede activar VeriFactu sin obligado tributario: configura antes el NIF y la razón social en Ajustes → Negocio.» y no se guarda nada. En un hub de demostración con un intento de cambiar su identidad o su entorno sale el aviso de demostración correspondiente. Cualquier otro fallo: «No se pudo guardar la configuración» o el mensaje del servidor.
Implicados: pendiente
Pendiente de enlazar: hub — identidad fiscal del negocio en Ajustes → Negocio y lista de puesta en marcha del hub
QA: BD-02, qa-hub §7

### VERIFACTU-F02 Subir el certificado propio del negocio
Estado: parcial — no se comprueba la contraseña ni se enseña la caducidad del certificado al subirlo; un certificado caducado solo se descubre al pasar a producción o al cobrar en producción
Vertical: comun
Actor: administrador
Pantalla: Configuración
Pasos:
1. Abre **VeriFactu → Configuración**, pestaña «Mi certificado» (o desde Ajustes, «Usar mi propio certificado» cuando no hay ninguno subido).
2. Arrastra o elige el fichero `.p12` o `.pfx` (hasta 1 MB) y escribe la «Contraseña del certificado».
3. Pulsa «Subir certificado» («Subiendo…»).
4. Sale «Certificado subido»; la pastilla pasa a «Cargado» con el Titular y «Subido el». El fichero y la contraseña se quedan en el hub y no vuelven a la pantalla.
Entra: el fichero y su contraseña, que escribe la persona.
Sale: el certificado guardado en el núcleo del hub; a partir de ahí la vía de envío la decide el interruptor de VERIFACTU-F04. El núcleo avisa al SaaS de la vía nueva.
Si falla: sin fichero: «Elige antes un fichero .p12 o .pfx.». Un fichero de otro tipo o de más de 1 MB lo rechaza la propia zona («… no es de un tipo admitido.», «… pesa más de …»). Sin permiso del módulo: «Esta app no tiene permiso para usar el certificado del negocio. Concédelo en Ajustes → Permisos.». Cualquier otro rechazo: «No se ha podido guardar el certificado. Revisa el fichero y la contraseña.». En un hub de demostración no se puede tener certificado propio (aviso de demostración).
Implicados: pendiente
Pendiente de enlazar: hub — guardar el certificado del negocio y publicar la vía de envío
QA: qa-hub §7, qa-hub-restaurant §7.11

### VERIFACTU-F03 Quitar el certificado propio
Estado: parcial — «Quitarlo» borra el certificado al primer toque, sin la confirmación cuyos textos ya existen («Esto quita tu certificado»)
Vertical: comun
Actor: administrador
Pantalla: Configuración
Pasos:
1. En **VeriFactu → Configuración**, pestaña «Mi certificado», con un certificado «Cargado».
2. Pulsa «Quitarlo».
3. Sale «Certificado quitado. ERPlora vuelve a remitir en tu nombre.» y la pastilla pasa a «Sin cargar».
Entra: nada más que la orden.
Sale: el certificado borrado del núcleo; el hub vuelve a la vía de ERPlora.
Si falla: «No se ha podido guardar el certificado. Revisa el fichero y la contraseña.» (el mismo texto que la subida) y el certificado sigue ahí.
Implicados: pendiente
Pendiente de enlazar: hub — borrar el certificado del negocio y pasar a la vía delegada
QA: qa-hub §7

### VERIFACTU-F04 Elegir quién remite: mi certificado o ERPlora
Estado: hecho
Vertical: comun
Actor: administrador
Pantalla: Ajustes
Pasos:
1. Abre **VeriFactu → Ajustes**. El interruptor «Usar mi propio certificado» enseña la vía actual según el núcleo, con su explicación («Envías tú directamente a Hacienda…» o «ERPlora remite tus registros de facturación a Hacienda en tu nombre…»).
2. Cámbialo. Si lo enciendes sin certificado subido, la pantalla te lleva a Configuración, pestaña «Mi certificado» (VERIFACTU-F02), sin cambiar nada.
3. Sale «Listo: a partir de ahora envías con tu propio certificado.» o «Listo: a partir de ahora remite ERPlora en tu nombre. Tu certificado sigue guardado.», y el interruptor se relee del núcleo.
4. «Abrir Configuración» lleva a la pestaña de la vía actual.
Entra: la vía actual y si hay certificado subido, del núcleo del hub.
Sale: la vía de envío cambiada en el núcleo; los registros siguientes salen por ella (VERIFACTU-F15).
Si falla: el interruptor vuelve a la vía real y dice por qué: en producción sin autorización aprobada, «Para que ERPlora remita en producción falta que aprobemos tu otorgamiento de representación…»; sin conexión segura firmada, «Para que ERPlora remita falta que firmemos la conexión segura de este hub…»; sin certificado, «No hay ningún certificado subido…»; otro, «No se ha podido cambiar la vía de envío. No ha cambiado nada; inténtalo de nuevo.».
Implicados: pendiente
Pendiente de enlazar: hub — cambiar la vía de envío (certificado propio o delegada) y sus negativas
QA: qa-hub §7

### VERIFACTU-F05 Firmar y subir la autorización para que remita ERPlora
Estado: hecho
Vertical: comun
Actor: administrador
Pantalla: Configuración
Pasos:
1. Abre **VeriFactu → Configuración**, pestaña «Lo remite ERPlora». El estado dice «Sin firmar. Tu negocio no puede pasar a producción hasta que lo firmes.».
2. Si faltan datos del negocio sale «Faltan datos de tu negocio» con «Completar datos del negocio», que lleva a Ajustes → Negocio (NIF, razón social, municipio y vía).
3. Paso «1 · Consigue el modelo oficial»: si el negocio es una sociedad, rellena el «Representante legal» (nombre, NIF/NIE, municipio, vía, número); un autónomo firma él mismo. Pulsa «Descargar el modelo»: sale «Modelo descargado. Fírmalo y súbelo aquí abajo.». Fírmalo a mano (escaneado a PDF) o con AutoFirma.
4. Paso «2 · Sube el modelo firmado»: adjunta el modelo firmado en PDF, elige el «Documento de identidad» (DNI o NIE) y adjunta su copia; con NIE, además una muestra de firma; si es sociedad, el justificante de representación. Cada fichero, menos de 10 MB. Antes de subir se ve la información básica de protección de datos.
5. Pulsa «Enviar a revisión». El estado pasa a «Subido el {fecha}. Lo estamos revisando y te avisamos por email en 24-72 horas.» y aparece «Lo que has enviado» con los documentos recibidos.
6. Una persona de ERPlora lo revisa en el SaaS; al volver a abrir la pantalla se ve «Aprobado el {fecha}. ERPlora puede remitir en tu nombre.» o «Devuelto el {fecha}…» con el motivo que escribió quien lo revisó.
Entra: los datos del negocio de Ajustes → Negocio y lo que adjunta la persona.
Sale: la autorización enviada al SaaS para su revisión; su estado lo publica el núcleo del hub y es condición para pasar a producción por la vía de ERPlora (VERIFACTU-F08) y para cobrar en producción por esa vía.
Si falla: el botón «Enviar a revisión» no se activa hasta tener lo obligatorio. Un rechazo del servidor sale con su frase («Adjunta el modelo firmado.», «El modelo firmado tiene que ser un PDF…», «Cada fichero tiene que ocupar menos de 10 MB.», «Este hub todavía no está conectado con ERPlora.»…) o «No ha funcionado. Vuelve a intentarlo.», con el código HTTP entre paréntesis. Sin respuesta del SaaS al abrir: «No hemos podido contactar con ERPlora, así que no podemos decirte cómo va.».
Implicados: pendiente
Pendiente de enlazar: hub — puerta de la autorización de representación y su estado en el perfil fiscal
Pendiente de enlazar: saas — revisar y aprobar o devolver la autorización (Anexo I)
QA: qa-hub §7

### VERIFACTU-F06 Volver a enviar la autorización
Estado: hecho
Vertical: comun
Actor: administrador
Pantalla: Configuración
Pasos:
1. En **VeriFactu → Configuración**, pestaña «Lo remite ERPlora», con la autorización en revisión o aprobada, pulsa «Volver a enviar».
2. Sale la explicación: en revisión, «Si algo salió mal, envíalo de nuevo: el envío nuevo sustituye al que está en revisión.»; aprobada, «Mientras revisamos el envío nuevo, sigues remitiendo con el actual.». «Cancelar» lo cierra sin cambios.
3. Repite los pasos de VERIFACTU-F05 y pulsa «Enviar a revisión».
4. «Historial de envíos» enseña cada envío con su resultado («En revisión», «Aceptado: vigente», «Rechazado», «Revocado», «Sustituido por un envío nuevo»). Con la autorización devuelta o revocada, el formulario sale directamente, sin pulsar nada.
Entra: los mismos datos que VERIFACTU-F05.
Sale: un envío nuevo en el SaaS que sustituye al que estaba en revisión; uno aprobado sigue en vigor mientras se revisa el nuevo.
Si falla: como VERIFACTU-F05.
Implicados: pendiente
Pendiente de enlazar: saas — revisar el envío nuevo de la autorización sin tocar el vigente
QA: qa-hub §7

### VERIFACTU-F07 Solicitar o renovar la conexión segura con ERPlora
Estado: hecho
Vertical: comun
Actor: administrador
Pantalla: Configuración
Pasos:
1. En **VeriFactu → Configuración**, pestaña «Lo remite ERPlora», bloque «Conexión segura con ERPlora» (no aparece si el hub remite con certificado propio).
2. Según el estado sale un único botón: «sin solicitar» → «Solicitar la conexión»; «pendiente de firma» → «Comprobar el estado»; «caduca pronto» (menos de 30 días) o «caducada» → «Renovar la conexión». «activa» y «no disponible» no tienen botón.
3. Pulsa el botón («Trabajando…»).
4. Sale el resultado: «Solicitada. Una persona de ERPlora la revisa y la firma, normalmente en 24-72 horas.», «Ya estaba solicitada y sigue en revisión…», «Conexión activa. ERPlora ya puede remitir en tu nombre.», «ERPlora ha devuelto la solicitud.» con el motivo, o «Demasiadas comprobaciones en una hora…». El bloque enseña el «Identificador de este hub» y «Válida hasta».
Entra: el estado de la identidad de máquina del hub, del núcleo.
Sale: la solicitud enviada a ERPlora (la clave privada nace en el hub y no sale); cuando una persona la firma, el hub la instala y la vía de ERPlora queda lista para producción.
Si falla: sin ser administrador, «Solo un administrador del hub puede solicitar esta conexión.»; un rechazo con nombre sale traducido con su código al lado; sin respuesta del hub, «El hub no ha respondido a la solicitud. Vuelve a intentarlo en un momento.». Mientras la conexión está caducada, ERPlora no puede remitir en producción y los registros esperan en la cola (VERIFACTU-F20).
Implicados: pendiente
Pendiente de enlazar: hub — identidad de máquina del hub y su solicitud de firma
Pendiente de enlazar: verifactu-gateway — aceptar la conexión del hub con su identidad de máquina
QA: qa-hub §7

### VERIFACTU-F08 Pasar a producción
Estado: hecho
Vertical: comun
Actor: administrador
Pantalla: Ajustes
Pasos:
1. En **VeriFactu → Ajustes**, «Entorno AEAT» enseña «Pruebas (AEAT Test)» y la explicación «Tus facturas van al entorno de pruebas de la AEAT…».
2. Pulsa «Pasar a producción».
3. Confirma en «¿Enviar tus facturas a la AEAT de verdad?» («A partir de ahora cada factura se remite a la AEAT real. Solo podrás volver a pruebas hasta que se remita la primera.») con «Pasar a producción»; «Cancelar» no cambia nada.
4. Sale «Tu hub está en producción: las facturas ya se remiten a la AEAT real.» y la pastilla pasa a «Producción».
Entra: el perfil fiscal del hub (núcleo): identidad, vía, autorización, conexión, caducidad del certificado.
Sale: el hub remite en producción a partir de ese momento; el NIF del negocio queda congelado. Los registros nuevos nacen en la cadena de producción, con el QR de la sede real; los que nacieron en pruebas siguen yendo a pruebas.
Si falla: el núcleo dice qué falta: «Para pasar a producción, ERPlora necesita tu autorización firmada…» (vía de ERPlora sin autorización aprobada), «Tu hub aún no está listo para producción: faltan tus datos fiscales o una vía para remitir…», «Tu certificado propio ha caducado y la AEAT no lo acepta…», «Este hub cesó su actividad y ya no emite facturas.», «Este es un hub de demostración y no puede pasar a producción…», o «No se ha podido pasar a producción. Inténtalo de nuevo en un momento.». En un hub de demostración el botón no aparece: sale «Este es un hub de demostración: siempre remite al entorno de pruebas de la AEAT…».
Implicados: pendiente
Pendiente de enlazar: hub — paso a producción del perfil fiscal y sus comprobaciones
Pendiente de enlazar: REC_FISCAL — de pruebas a producción sin perder ningún tique
QA: L-04, qa-hub §7

### VERIFACTU-F09 Volver a pruebas
Estado: hecho
Vertical: comun
Actor: administrador
Pantalla: Ajustes
Pasos:
1. En **VeriFactu → Ajustes**, con el hub en «Producción» y sin ningún registro remitido aún a la AEAT real, sale «Todavía no se ha remitido ninguna factura a la AEAT real, así que aún puedes volver a pruebas.» y el botón «Volver a pruebas».
2. Púlsalo y confirma en «¿Volver al entorno de pruebas?» («Las facturas volverán a ir al entorno de pruebas de la AEAT y no contarán ante Hacienda.»).
3. Sale «Tu hub ha vuelto al entorno de pruebas.».
4. En cuanto un registro ha salido hacia la AEAT real el botón desaparece y sale «Tu hub ya ha remitido facturas a la AEAT real, así que no puede volver a pruebas. Para hacer pruebas, usa otro hub.».
Entra: si algún registro salió ya hacia la AEAT real, del núcleo.
Sale: el hub vuelve a remitir en pruebas.
Si falla: con algo ya remitido, el núcleo lo niega y sale «No se puede volver al modo de pruebas: este hub ya envió a la AEAT un registro aceptado en producción…». La configuración del módulo tiene además su propia guarda: guardarla en pruebas con un registro aceptado en producción deshace la operación entera.
Implicados: pendiente
Pendiente de enlazar: hub — volver a pruebas mientras nada haya salido a la AEAT real
QA: L-04

### VERIFACTU-F10 Probar la conexión con la AEAT
Estado: parcial — con certificado propio y el hub ya en producción, la prueba envía un registro de muestra a la AEAT real, aunque la pantalla promete que «no afecta a la cadena real ni a tus facturas»
Vertical: comun
Actor: responsable, administrador
Pantalla: Ajustes
Pasos:
1. En **VeriFactu → Ajustes**, tarjeta «Prueba en vivo», elige el «Tipo de prueba»: «Tiquet simplificado (F2)» o «Factura completa (F1, cliente de prueba)».
2. Pulsa «Enviar prueba» («Enviando…»). El botón está apagado si el hub no tiene ninguna vía; entonces la pantalla dice qué falta («Conecta este hub con ERPlora ahí arriba…» o «Sube el certificado del negocio…»).
3. Debajo sale el resultado: «Certificado» (en verde o en rojo, con el motivo en palabras), «Se remite» («con mi propio certificado» o «lo hace ERPlora por ti»), Entorno, «Huella de muestra (SHA-256)», «Enlace de verificación en la AEAT» y «Respuesta de la AEAT».
4. Con certificado propio la muestra se envía de verdad a la AEAT y se ve «Aceptado por la AEAT» con su CSV, o el error. Por la vía de ERPlora no se envía nada, a propósito: sale «ERPlora puede remitir por ti» o «ERPlora no puede remitir por ti ahora mismo» y «No se ha remitido nada, y en esta vía eso es lo correcto…».
Entra: el tipo de prueba; la vía y el entorno del hub.
Sale: el resultado guardado como evento «Prueba de conexión» (avisa: verifactu.diagnostic.run). No crea ningún registro ni toca la cadena.
Si falla: sin permiso del módulo, el aviso «Permiso: Certificado del negocio (firma fiscal)» con «Ir a Permisos»; sin NIF del negocio, el motivo en el resultado («…falta el NIF del obligado tributario…»); otro fallo, «No se pudo ejecutar la prueba» o el mensaje del servidor.
Implicados: pendiente
Pendiente de enlazar: hub — prueba de conexión del motor fiscal por la vía real del hub
Pendiente de enlazar: verifactu-gateway — responder si la celda puede remitir ahora (readyz)
QA: qa-hub §7

### VERIFACTU-F11 Crear una factura de prueba
Estado: hecho
Vertical: comun
Actor: administrador
Pantalla: Ajustes
Pasos:
1. En **VeriFactu → Ajustes**, tarjeta «Prueba en vivo», con el hub en pruebas y el NIF del negocio configurado, pulsa «Crear factura de prueba» («Creando…»). Fuera de pruebas el botón está apagado y sale «Solo disponible en el entorno de pruebas y con el NIF del emisor configurado.».
2. Sale «Factura de prueba creada — verla en Facturación.».
3. Facturación emite un tique simplificado F2 de 1,00 € más 21 % de IVA en la serie de tiques; VeriFactu lo registra y lo envía como cualquier otra factura (VERIFACTU-F13, VERIFACTU-F15) y aparece en **Registros**.
Entra: nada que escribir: la línea de prueba es fija.
Sale: una factura real de Facturación en el entorno de pruebas y su registro.
Si falla: el mensaje de Facturación o «No se pudo crear la factura de prueba». Un usuario sin permiso para emitir facturas recibe la negativa de Facturación.
Implicados: pendiente
Pendiente de enlazar: invoice — emitir una factura (tique F2) a petición de otro módulo
QA: BD-09

### VERIFACTU-F12 Consultar la declaración responsable
Estado: hecho
Vertical: comun
Actor: empleado, responsable, administrador
Pantalla: Ajustes
Pasos:
1. En **VeriFactu → Ajustes**, tarjeta «Declaración responsable» («La declaración que ERPlora firma para la versión del sistema que estás usando…»).
2. «Leer la declaración firmada» abre el documento; al lado, «Versión de la declaración».
3. «Datos identificativos de este sistema»: Productor, «NIF del productor», «Nombre del sistema», «Código del sistema», «Versión instalada», «Número de instalación» y los indicadores de uso, cada uno con el nombre del elemento tal como va en el XML.
4. Si los datos del productor aún no han llegado: «Los datos identificativos de ERPlora todavía no han llegado. Llegan solos al minuto de estar el sistema en marcha; hasta entonces no se puede enviar ninguna factura a Hacienda.» y solo se ven la versión y el número de instalación.
Entra: la declaración y los datos del productor, del núcleo del hub (los recibe del SaaS en cada latido).
Sale: nada; es consulta. Mientras faltan los datos del productor, los registros se crean y esperan en la cola (VERIFACTU-F20); la venta no se bloquea.
Si falla: «No se ha podido cargar la declaración responsable.».
Implicados: pendiente
Pendiente de enlazar: hub — servir la declaración responsable y los datos del productor
Pendiente de enlazar: saas — publicar los datos del productor del software a cada hub
QA: L-04, qa-hub-restaurant §7.00
