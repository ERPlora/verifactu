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
Sale: la configuración del módulo guardada con el emisor efectivo y el entorno (avisa: verifactu.config.changed). El entorno que se guarda es el que dijo el núcleo; si la pantalla no pudo leerlo, el que ya tenía la fila del módulo. Cada guardado vuelve a copiar el NIF y la razón social de Ajustes → Negocio. Guardar no exige el permiso del certificado: por eso se guarda aunque falte.
Si falla: sin NIF en Ajustes → Negocio: «No se puede activar VeriFactu sin obligado tributario: configura antes el NIF y la razón social en Ajustes → Negocio.» y no se guarda nada. Quien no es administrador recibe una negativa, sin PIN de aprobación. En un hub de demostración con un intento de cambiar su identidad o su entorno sale el aviso de demostración correspondiente. Cualquier otro fallo: «No se pudo guardar la configuración» o el mensaje del servidor.
Implicados: HUB-F35, HUB-F222, HUB-F300, HUB_SHELL-F28, HUB_SHELL-F31, HUB_SHELL-F155, HUB_SHELL-F164, HUB_SHELL-F167
QA: BD-02, qa-hub §7

### VERIFACTU-F02 Subir el certificado propio del negocio
Estado: parcial — no se comprueba la contraseña ni se enseña la caducidad del certificado al subirlo; un certificado caducado solo se descubre al pasar a producción o al cobrar en producción; el aviso de éxito dice solo «Subido el», sin fecha
Vertical: comun
Actor: administrador
Pantalla: Configuración
Pasos:
1. Abre **VeriFactu → Configuración**, pestaña «Mi certificado» (o desde Ajustes, «Usar mi propio certificado» cuando la lectura dijo que no hay ninguno subido).
2. Arrastra o elige el fichero `.p12` o `.pfx` (hasta 1 MB) y escribe la «Contraseña del certificado».
3. Pulsa «Subir certificado» («Subiendo…»).
4. Sale un aviso verde que dice solo «Subido el»; la pastilla pasa a «Cargado» con el Titular y «Subido el» con la fecha. El fichero y la contraseña se quedan en el hub y no vuelven a la pantalla.
Entra: el fichero y su contraseña, que escribe la persona.
Sale: el certificado guardado en el núcleo del hub; a partir de ahí la vía de envío la decide el interruptor de VERIFACTU-F04. El núcleo avisa al SaaS de la vía nueva.
Si falla: sin fichero: «Elige antes un fichero .p12 o .pfx.». Un fichero de otro tipo o de más de 1 MB lo rechaza la propia zona (««{name}» no es de un tipo admitido.», ««{name}» pesa más de {size}.»). Sin permiso del módulo: «Esta app no tiene permiso para usar el certificado del negocio. Concédelo en Ajustes → Permisos.». Cualquier otro rechazo, también el de quien no es administrador: «No se ha podido guardar el certificado. Revisa el fichero y la contraseña.». Un hub de demostración también puede subir su certificado: lo que lo aparta de la AEAT real es que siempre remite a pruebas, no esta puerta.
Implicados: HUB-F302
QA: qa-hub §7, qa-hub-restaurant §7.11

### VERIFACTU-F03 Quitar el certificado propio
Estado: parcial — «Quitarlo» borra el certificado al primer toque, sin la confirmación cuyos textos ya existen («Esto quita tu certificado»); y en producción, sin autorización aprobada y conexión segura, deja al negocio sin vía y sin poder cobrar, sin que nada lo impida
Vertical: comun
Actor: administrador
Pantalla: Configuración
Pasos:
1. En **VeriFactu → Configuración**, pestaña «Mi certificado», con un certificado «Cargado».
2. Pulsa «Quitarlo».
3. Sale «Certificado quitado. ERPlora vuelve a remitir en tu nombre.» y la pastilla pasa a «Sin cargar». Ese texto solo es cierto si la vía de ERPlora está lista para el entorno del hub: en producción necesita la autorización aprobada y la conexión segura (VERIFACTU-F05, VERIFACTU-F07).
Entra: nada más que la orden.
Sale: el certificado borrado del núcleo; los registros siguientes salen por la vía de ERPlora. En producción sin autorización aprobada o sin conexión segura el hub se queda sin vía, y desde ese momento el núcleo niega las ventas (regla En producción, sin vía no se cobra, del índice). Apagar el interruptor de VERIFACTU-F04 en ese mismo caso se niega; quitar el certificado, no.
Si falla: «No se ha podido guardar el certificado. Revisa el fichero y la contraseña.» (el mismo texto que la subida) y el certificado sigue ahí.
Implicados: REC_FISCAL-F01, HUB-F303
QA: qa-hub §7

### VERIFACTU-F04 Elegir quién remite: mi certificado o ERPlora
Estado: hecho
Vertical: comun
Actor: administrador
Pantalla: Ajustes
Pasos:
1. Abre **VeriFactu → Ajustes**. El interruptor «Usar mi propio certificado» enseña la vía actual según el núcleo, con su explicación: «Envías tú directamente a Hacienda con el certificado de tu negocio…», «ERPlora remite tus registros de facturación a Hacienda en tu nombre, con su propio certificado. No necesitas ninguno.» o, si hay un certificado guardado pero apagado, «Tu certificado sigue guardado en este hub, pero ahora remite ERPlora en tu nombre…».
2. Cámbialo. Si lo enciendes y la lectura del certificado dijo que no hay ninguno subido, la pantalla te lleva a Configuración, pestaña «Mi certificado» (VERIFACTU-F02), sin cambiar nada; si esa lectura falló, decide el núcleo.
3. Sale «Listo: a partir de ahora envías con tu propio certificado.» o «Listo: a partir de ahora remite ERPlora en tu nombre. Tu certificado sigue guardado.», y el interruptor se relee del núcleo.
4. «Abrir Configuración» lleva a la pestaña de la vía actual.
Entra: la vía actual y si hay certificado subido, del núcleo del hub.
Sale: la vía de envío cambiada en el núcleo; los registros siguientes salen por ella (VERIFACTU-F15).
Si falla: el interruptor vuelve a la vía real y dice por qué: en producción sin autorización aprobada, «Para que ERPlora remita en producción falta que aprobemos tu otorgamiento de representación…»; en producción sin conexión segura, «Para que ERPlora remita falta que firmemos la conexión segura de este hub…»; sin certificado, «No hay ningún certificado subido: súbelo en Configuración para poder usarlo.»; otro, «No se ha podido cambiar la vía de envío. No ha cambiado nada; inténtalo de nuevo.».
Implicados: HUB-F301, HUB-F304
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
5. Pulsa «Enviar a revisión». El estado pasa a «Subido el {date}. Lo estamos revisando y te avisamos por email en 24-72 horas.» y aparece «Lo que has enviado» con los documentos recibidos.
6. Una persona de ERPlora lo revisa en el SaaS; al volver a abrir la pantalla se ve «Aprobado el {date}. ERPlora puede remitir en tu nombre.» o «Devuelto el {date}. Corrige lo que se indica abajo y vuelve a subirlo.» con el motivo que escribió quien lo revisó.
Entra: los datos del negocio de Ajustes → Negocio y lo que adjunta la persona.
Sale: la autorización enviada al SaaS para su revisión; su estado lo publica el núcleo del hub y es condición para pasar a producción por la vía de ERPlora (VERIFACTU-F08) y para cobrar en producción por esa vía.
Si falla: «Enviar a revisión» no se activa sin el modelo, la copia del documento y, si tocan, la muestra de firma y el justificante; en una sociedad sí se activa sin el nombre y el NIF del representante, y entonces lo frena el servidor con «Rellena el nombre y el NIF de quien firma.». Otros rechazos salen con su frase («Adjunta el modelo firmado.», «El modelo firmado tiene que ser un PDF — escanéalo o fírmalo con AutoFirma.», «Cada fichero tiene que ocupar menos de 10 MB.», «Este hub todavía no está conectado con ERPlora.»…) o «No ha funcionado. Vuelve a intentarlo.», con el código HTTP entre paréntesis. Sin respuesta del SaaS al abrir: «No hemos podido contactar con ERPlora, así que no podemos decirte cómo va.». Quien no es administrador recibe la negativa del hub.
Implicados: HUB-F305, VFGW-F08
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
Implicados: HUB-F305
Pendiente de enlazar: saas — revisar el envío nuevo de la autorización sin tocar el vigente
QA: qa-hub §7

### VERIFACTU-F07 Solicitar o renovar la conexión segura con ERPlora
Estado: parcial — con la conexión caducada el hub la sigue presentando, la celda de ERPlora la rechaza y los registros esperan sin límite, también en pruebas; «Renovar la conexión» no pide una firma nueva mientras ERPlora tenga la anterior como aprobada
Vertical: comun
Actor: administrador
Pantalla: Configuración
Pasos:
1. En **VeriFactu → Configuración**, pestaña «Lo remite ERPlora», bloque «Conexión segura con ERPlora» (no aparece si el núcleo dice que el hub remite con certificado propio).
2. Según el estado sale un único botón: «sin solicitar» → «Solicitar la conexión»; «pendiente de firma» → «Comprobar el estado»; «caduca pronto» (30 días o menos) o «caducada» → «Renovar la conexión». «activa» y «no disponible» no tienen botón.
3. Pulsa el botón («Trabajando…»).
4. Sale el resultado: «Solicitada. Una persona de ERPlora la revisa y la firma, normalmente en 24-72 horas.», «Ya estaba solicitada y sigue en revisión. Aquí no hay nada más que hacer.», «Conexión activa. ERPlora ya puede remitir en tu nombre.», «ERPlora ha devuelto la solicitud.» con el motivo, o «Demasiadas comprobaciones en una hora. El hub sigue intentándolo solo; vuelve en unos minutos.». El bloque enseña el «Identificador de este hub» y «Válida hasta».
Entra: el estado de la identidad de máquina del hub, del núcleo.
Sale: la solicitud enviada a ERPlora (la clave privada nace en el hub y no sale); cuando una persona la firma, el hub la instala. La conexión firmada es lo que la vía de ERPlora necesita en producción; en pruebas la celda de ERPlora acepta al hub sin ella (VERIFACTU-F20), salvo la celda hoy desplegada (verifactu-gateway#68).
Si falla: sin ser administrador, «Solo un administrador del hub puede solicitar esta conexión.»; un rechazo con nombre sale traducido con su código al lado; sin respuesta del hub, «El hub no ha respondido a la solicitud. Vuelve a intentarlo en un momento.». Con la conexión caducada la pantalla dice «ERPlora no puede remitir en tu nombre hasta que la renueves. Mientras tanto, tus registros esperan en la cola de contingencia.»: el hub sigue usando la conexión caducada, la celda la rechaza y los registros esperan sin límite, también en pruebas. «Renovar la conexión» no presenta una solicitud nueva mientras ERPlora tenga la anterior como aprobada, y el servicio de fondo del hub no actúa mientras haya una conexión instalada, aunque esté caducada. Sin confirmar: qué devuelve erplora.com cuando la identidad del hub ha caducado.
Implicados: HUB-F306, VFGW-F01, VFGW-F03
QA: qa-hub §7

### VERIFACTU-F08 Pasar a producción
Estado: hecho
Vertical: comun
Actor: administrador
Pantalla: Ajustes
Pasos:
1. En **VeriFactu → Ajustes**, «Entorno AEAT» enseña «Pruebas (AEAT Test)» y la explicación «Tus facturas van al entorno de pruebas de la AEAT. Cuando esté todo listo, pasa a producción: ERPlora comprueba antes que no falte nada.».
2. Pulsa «Pasar a producción».
3. Confirma en «¿Enviar tus facturas a la AEAT de verdad?» («A partir de ahora cada factura se remite a la AEAT real. Solo podrás volver a pruebas hasta que se remita la primera.») con «Pasar a producción»; «Cancelar» no cambia nada.
4. Sale «Tu hub está en producción: las facturas ya se remiten a la AEAT real.» y la pastilla pasa a «Producción».
Entra: el perfil fiscal del hub (núcleo): identidad, vía, autorización, caducidad del certificado propio.
Sale: el hub remite en producción a partir de ese momento; el NIF del negocio queda congelado. Los registros nuevos nacen en la cadena de producción, con el QR de la sede real; los que nacieron en pruebas siguen yendo a pruebas.
Si falla: el núcleo dice qué falta: «Para pasar a producción, ERPlora necesita tu autorización firmada para remitir en tu nombre, aprobada por nuestro equipo. Fírmala en Configuración.» (vía de ERPlora sin autorización aprobada), «Tu hub aún no está listo para producción: faltan tus datos fiscales o una vía para remitir (tu propio certificado o el de ERPlora). Revisa Configuración.», «Tu certificado propio ha caducado y la AEAT no lo acepta. Sube uno renovado, o deja que remita ERPlora, y vuelve a intentarlo.», «Este hub cesó su actividad y ya no emite facturas.», «Este es un hub de demostración y no puede pasar a producción. Crea tu propio hub para facturar de verdad.», o «No se ha podido pasar a producción. Inténtalo de nuevo en un momento.». En un hub de demostración el botón no aparece: sale «Este es un hub de demostración: siempre remite al entorno de pruebas de la AEAT. Crea tu propio hub para pasar a producción.».
Implicados: REC_FISCAL-F14, HUB-F301, HUB-F307, HUB-F315
QA: L-04, qa-hub §7

### VERIFACTU-F09 Volver a pruebas
Estado: parcial — se puede volver a pruebas después de vender en producción, hasta la primera rectificativa; las ventas siguientes van a la AEAT de pruebas (ERPlora/hub#2498)
Vertical: comun
Actor: administrador
Pantalla: Ajustes
Pasos:
1. En **VeriFactu → Ajustes**, con el hub en «Producción» y sin ninguna rectificativa emitida todavía en producción, sale «Todavía no se ha remitido ninguna factura a la AEAT real, así que aún puedes volver a pruebas.» y el botón «Volver a pruebas».
2. Púlsalo y confirma en «¿Volver al entorno de pruebas?» («Las facturas volverán a ir al entorno de pruebas de la AEAT y no contarán ante Hacienda.»).
3. Sale «Tu hub ha vuelto al entorno de pruebas.».
4. En cuanto se emite la primera rectificativa en producción (a mano o por una devolución) —aunque su registro siga en la cola sin haber salido— el botón desaparece y sale «Tu hub ya ha remitido facturas a la AEAT real, así que no puede volver a pruebas. Para hacer pruebas, usa otro hub.». Una venta o una factura normal no cierra la vuelta: el núcleo solo la anota cuando la emite una orden declarativa, y la factura de Facturación no lo es (ERPlora/hub#2498). Si se vuelve después de vender en producción, las ventas siguientes nacen en la cadena de pruebas, con el QR de la sede de pruebas, y nunca llegan a la AEAT real.
Entra: si ya se emitió alguna rectificativa en producción, del núcleo (lo anota al confirmarla, no al llegar a la AEAT).
Sale: el hub vuelve a remitir en pruebas.
Si falla: con una rectificativa ya emitida en producción, el núcleo lo niega y sale «No se puede volver al modo de pruebas: este hub ya envió a la AEAT un registro aceptado en producción. Para hacer pruebas, usa otro hub (uno gratuito o la demo).». Un rechazo que la pantalla no reconoce sale como «No se ha podido pasar a producción. Inténtalo de nuevo en un momento.», aunque se estuviera volviendo a pruebas. La configuración del módulo tiene además su propia guarda: guardarla en pruebas con un registro aceptado en producción deshace la operación entera. Esa guarda solo actúa al pulsar «Guardar configuración»: el botón «Volver a pruebas» llama al núcleo del hub, así que no tapa el hueco.
Implicados: REC_FISCAL-F14, HUB-F308
QA: L-04

### VERIFACTU-F10 Probar la conexión con la AEAT
Estado: parcial — con certificado propio la muestra es un registro de alta real presentado en el entorno del hub: en producción queda en la AEAT real a nombre del negocio, aunque la pantalla promete «No afecta a la cadena real ni a tus facturas.»; los textos que explican por qué el botón está apagado mandan a sitios que no son
Vertical: comun
Actor: responsable, administrador
Pantalla: Ajustes
Pasos:
1. En **VeriFactu → Ajustes**, tarjeta «Prueba en vivo», elige el «Tipo de prueba»: «Tiquet simplificado (F2)» o «Factura completa (F1, cliente de prueba)».
2. Pulsa «Enviar prueba» («Enviando…»). El botón está apagado si el hub no tiene ninguna vía; entonces la pantalla dice «Conecta este hub con ERPlora ahí arriba para poder ejecutar la prueba en vivo.» (la conexión no está arriba: está en Configuración) o «Sube el certificado del negocio en Ajustes → Negocio para poder ejecutar la prueba en vivo.» (se sube en Configuración, pestaña «Mi certificado»).
3. Debajo sale el resultado: «Certificado» (en verde o en rojo, con el motivo en palabras), «Se remite» («con mi propio certificado» o «lo hace ERPlora por ti»), Entorno (con el código interno, `testing` o `production`), «Huella de muestra (SHA-256)», «Enlace de verificación en la AEAT» y «Respuesta de la AEAT».
4. Con certificado propio la muestra (un alta con número `PRUEBA-AAAA-MM-DD` de 121,00 €, marcada como primer registro de la cadena) se presenta de verdad a la AEAT del entorno del hub y se ve «Aceptado por la AEAT» con su CSV, o el error. Por la vía de ERPlora no se presenta nada, a propósito: sale «ERPlora puede remitir por ti» o «ERPlora no puede remitir por ti ahora mismo» y «No se ha remitido nada, y en esta vía eso es lo correcto: un registro remitido no se puede deshacer, así que ERPlora comprueba la vía en vez de usarla.».
Entra: el tipo de prueba; la vía y el entorno del hub.
Sale: en el hub, el resultado guardado como evento «Prueba de conexión» (avisa: verifactu.diagnostic.run), sin crear ningún registro ni tocar la cadena local. Con certificado propio, además, un registro de alta en la AEAT que el hub no tiene: en producción queda en la AEAT real a nombre del negocio, y una recuperación posterior desde la AEAT (VERIFACTU-F28), que ancla en el último registro del mes, podría anclar la cadena sobre esa muestra.
Si falla: sin configuración guardada ni certificado propio, el servidor lo niega (VeriFactu sin configurar). Sin permiso del módulo, el aviso «Permiso: Certificado del negocio (firma fiscal)» con «Ir a Permisos». Sin NIF del negocio, el recuadro del certificado dice «configura el NIF del obligado tributario (emisor) en Ajustes → Negocio antes de probar la conexión». Un empleado recibe la petición del PIN de un responsable y, con él, la prueba sigue. Otro fallo: «No se pudo ejecutar la prueba» o el mensaje del servidor.
Implicados: REC_FISCAL-F14, HUB_VERIFACTU-F16, HUB_VERIFACTU-F17, VFGW-F13
QA: qa-hub §7

### VERIFACTU-F11 Crear una factura de prueba
Estado: hecho
Vertical: comun
Actor: administrador
Pantalla: Ajustes
Pasos:
1. En **VeriFactu → Ajustes**, tarjeta «Prueba en vivo», con el hub en pruebas y el NIF del negocio configurado, pulsa «Crear factura de prueba» («Creando…»). Fuera de pruebas el botón está apagado y sale «Solo disponible en el entorno de pruebas y con el NIF del emisor configurado.»; en pruebas pero sin NIF, se apaga sin decir por qué.
2. Sale «Factura de prueba creada — verla en Facturación.».
3. La pantalla le pide a Facturación un tique simplificado F2 de una línea de 1,00 € al 21 % de IVA, con la serie `TICKET`, por la misma puerta que el alta manual de facturas (INVOICE-F03): sale en **Facturación → Facturas** con «Origen» «Otro» y gasta un número de la serie TICKET del año. Cuando lo emite, VeriFactu lo registra y lo envía como cualquier otra factura (VERIFACTU-F13, VERIFACTU-F15), a la cadena de pruebas, y aparece en **Registros**; el aviso verde solo dice que Facturación aceptó la petición.
Entra: nada que escribir: la línea de prueba es fija.
Sale: una factura real de Facturación en el entorno de pruebas y su registro.
Si falla: el mensaje de Facturación o «No se pudo crear la factura de prueba». Un usuario sin permiso para emitir facturas recibe la negativa de Facturación.
Implicados: INVOICE-F03, REC_FISCAL-F14
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
4. Si los datos del productor aún no han llegado: «Los datos identificativos de ERPlora todavía no han llegado. Llegan solos al minuto de estar el sistema en marcha; hasta entonces no se puede enviar ninguna factura a Hacienda.» y solo se ven la versión y el número de instalación. El «al minuto» no es exacto: llegan con el aviso que el hub manda a ERPlora al arrancar, cada día o al cambiar la vía de envío; si el del arranque falla, pueden tardar hasta un día.
Entra: la declaración y los datos del productor, del núcleo del hub (los recibe del SaaS en cada latido).
Sale: nada; es consulta. Mientras faltan los datos del productor, los registros se crean y esperan en la cola (VERIFACTU-F20); la venta no se bloquea.
Si falla: «No se ha podido cargar la declaración responsable.».
Implicados: HUB-F310
Pendiente de enlazar: saas — publicar los datos del productor del software a cada hub
QA: L-04, qa-hub-restaurant §7.00
