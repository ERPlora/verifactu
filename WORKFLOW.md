# WORKFLOW — VeriFactu

Prefijo: VERIFACTU
Alcance MVP: nucleo

> Contrato de comportamiento del módulo (pm#620, pm#621). Se lee antes de tocar el código y se
> actualiza en la misma PR que cambie un comportamiento. El detalle técnico vive en
> `architecture/modules/verifactu.md`; aquí se escribe lo que ve y hace la persona y lo que el
> módulo recibe y entrega. El motor fiscal del hub (huella, XML, firma, envío) y la celda fiscal
> `verifactu-gateway` tienen su propio fichero: aquí se enlazan, no se describen.

## Para qué sirve y para quién

VeriFactu es el final de la cadena fiscal: cada factura o tique que emite Facturación se convierte
aquí en un **registro de facturación** encadenado (cada uno lleva la huella del anterior) que se
envía a la Agencia Tributaria (AEAT) en cuanto se emite; si no se puede enviar en ese momento, se
queda en cola y sale solo después. Lo usan el **administrador**, que lo pone en marcha una vez
(activar, elegir quién remite —su propio certificado o ERPlora en su nombre—, firmar la
autorización, pasar a producción) y lo rescata en los casos graves (recuperar la cadena); el
**responsable**, que vigila la cola de envíos pendientes y la empuja; y el **empleado**, que solo
consulta. Sin nadie delante, el **sistema** registra cada factura, la envía y reintenta. Sirve igual a
la peluquería y al restaurante: todo el módulo es común.

## Referencia adoptada

Aquí la referencia no es un competidor: es la norma de la AEAT. Se adopta esto, no más:

- [Real Decreto 1007/2023](https://www.boe.es/buscar/act.php?id=BOE-A-2023-24840) (Reglamento de los
  sistemas informáticos de facturación) y la [Orden HAC/1177/2024](https://www.boe.es/buscar/doc.php?id=BOE-A-2024-22138)
  que lo desarrolla: registro de alta y de anulación, encadenamiento por huella SHA-256, QR
  cotejable, identificación del sistema informático y declaración responsable.
- La modalidad **VERI\*FACTU** únicamente (ADR-0271): cada registro se remite a la AEAT en el momento;
  por eso el sistema no lleva el registro de eventos que la norma exige solo a los sistemas NO
  VERI\*FACTU, y lo que este módulo llama «Eventos» es trazabilidad propia.
- [Preguntas frecuentes VeriFactu de la AEAT](https://sede.agenciatributaria.gob.es/Sede/iva/sistemas-informaticos-facturacion-verifactu/preguntas-frecuentes.html):
  un registro generado tiene que llegar a la AEAT (FAQ §5, base de la guarda que impide descartar
  un envío); una incidencia de envío se remite después marcada como tal (`Incidencia = S`).
- Del mercado (Odoo `l10n_es_edi_verifactu`, Holded) se copia solo el reparto de pantallas: activar
  en Ajustes y gestionar el certificado en su propia pantalla; si no subes certificado propio, remite
  el proveedor en tu nombre.
- El guion de QA que ya contrasta esta norma es `.claude/agents/qa-billing-verifactu.md` y el bloque
  legal L-01…L-18 de `.claude/qa/qa-method-shared.md`.

## Antes de empezar

- Al instalar VeriFactu se instala con él **Facturación** (sin facturas no hay nada que registrar).
- **Identidad fiscal del negocio** en Ajustes → Negocio (NIF, razón social y domicilio fiscal). Es
  la única fuente: VeriFactu la muestra y la usa, no la pide otra vez. Sin NIF no se puede activar
  (VERIFACTU-F01) ni preparar la autorización (VERIFACTU-F05).
- **Permiso «Certificado del negocio (firma fiscal)»** concedido en Ajustes → Permisos. Viene apagado
  en cualquier hub cuyos módulos no entraran por el diálogo de consentimiento de Apps. Sin él el
  módulo no registra ninguna factura, ni firma, ni envía, ni prueba, ni drena la cola. Lo que llega
  mientras tanto se reprocesa solo al concederlo. Ojo: en producción la venta no se bloquea por esto,
  así que se cobra sin registro hasta que se conceda.
- **Una vía de envío**: o el certificado propio del negocio (`.p12`/`.pfx`), o la vía de ERPlora. En
  pruebas, la vía de ERPlora funciona sin nada más, por el carril de pruebas de su celda; para
  producción necesita la **autorización firmada** (Anexo I, aprobada por una persona de ERPlora) y la
  **conexión segura** de este hub con ERPlora.
- Los datos del productor del software (ERPlora) llegan solos al hub; mientras no han llegado no se
  puede enviar ninguna factura (VERIFACTU-F12).

Configuración inicial, paso a paso:

1. En **VeriFactu → Ajustes**, enciende «Activar VeriFactu» y pulsa «Guardar configuración»
   (VERIFACTU-F01). Si avisa del permiso, concédelo en Ajustes → Permisos.
2. Elige la vía. Para que remita ERPlora: **VeriFactu → Configuración**, pestaña «Lo remite ERPlora»,
   firma y sube la autorización (VERIFACTU-F05) y solicita la conexión segura (VERIFACTU-F07). Para
   remitir tú: pestaña «Mi certificado», sube el `.p12` (VERIFACTU-F02) y enciende «Usar mi propio
   certificado» en Ajustes (VERIFACTU-F04).
3. Con el hub aún en pruebas, pulsa «Enviar prueba» (VERIFACTU-F10) y, si quieres ver el camino
   entero, «Crear factura de prueba» (VERIFACTU-F11): aparece en **Registros** y su QR se coteja en la
   sede de pruebas de la AEAT (VERIFACTU-F18).
4. Cuando todo esté listo, «Pasar a producción» (VERIFACTU-F08). Desde la primera rectificativa
   emitida en producción, aunque su registro no haya salido aún, ya no se puede volver a pruebas; una
   venta o una factura normal no cierra la vuelta (VERIFACTU-F09, ERPlora/hub#2498).

## Pantallas

Seis pestañas en el menú del módulo, en este orden. Se ven todas con el permiso de consulta (las
entradas de navegación no declaran permiso); lo que cada acción exige lo decide el servidor, y a un
empleado que pulsa una acción de responsable se le pide el PIN de un responsable (ver el apartado Reglas que no
se rompen).

### Registros
Menú **VeriFactu → Registros**. Título «Registros VeriFactu». Tabla de 50 por página con Seq,
Factura, Fecha, Tipo (Alta / Anulación), F. (tipo de factura F1…R5), Emisor, Total y Estado
(Pendiente, Transmitido, Aceptado, Rechazado, Error, Reintento, en una pastilla de color). Buscador
«Buscar factura, emisor o NIF…» (busca por número de secuencia, número de factura y nombre del
emisor); filtros por columna; vista tabla o tarjetas. Se refresca sola cuando nace un registro o se
envía uno a mano; lo que envía la pasada de la cola no aparece hasta recargar. Pulsar una fila abre el **detalle** («Registro {number}»): datos de la factura, «Generado
el», «Transmitido el», la «Cadena de huellas» (huella y «Huella anterior», recortadas), la «Huella de
la entrega» («ID de transmisión», «Digest del XML (SHA-256)», «Fichero XML»; «Aún sin estampar»
mientras no ha salido), la «Respuesta de la AEAT» (CSV, «Código de respuesta», «Mensaje de
respuesta», «Reintentos», «Próximo reintento») y, si lo tiene, el enlace «Abrir QR»; «Volver» regresa
a la lista. Un registro Pendiente, Error o Reintento muestra además el aviso «Aún no está en la AEAT»
con el porqué y el cuándo (VERIFACTU-F17). No hay botón de enviar ni de anular.
Vacía: «Todavía no has emitido ninguna factura. Cada factura que emitas se sella y aparece aquí.» si
tampoco hay facturas; «Sin registros VeriFactu.» en otro caso. Con facturas emitidas y ningún
registro: aviso rojo «La cadena no está sellando» con «Revisar permisos» y «Ver eventos caídos». Si no
se pudo contar las facturas (sin permiso de Facturación): «No hay registros y no se ha podido leer
cuántas facturas se han emitido…». Cargando: «Cargando…». Error: el mensaje con reintento; el fallo
al abrir un detalle sale encima de la lista («Registro no encontrado» o el error).

### Contingencia
Menú **VeriFactu → Contingencia**. Título «Cola de contingencia» y botón «Procesar cola»
(«Procesando…» mientras trabaja la cola, y también mientras trabaja un «Reintentar» o un «Cancelar»).
Tabla: Registro, Prioridad, Intentos, Estado, Próximo intento, Último error (recortado a 80
caracteres); un buscador «Buscar registro o estado…» que aparece pero no filtra nada; por fila
«Reintentar» y «Cancelar». Los estados de la cola salen con su código interno (`pending`, `retrying`, `failed`,
`cancelled`) y la columna Registro enseña el identificador interno del registro, no el número de
factura. Se refresca sola tras reintentar, descartar o procesar la cola; una entrada que nace por un
fallo al cobrar no aparece hasta la siguiente pasada o hasta recargar. Vacía: «Cola vacía.». Cargando: «Cargando…».
Error: el mensaje encima de la tabla; un descarte negado dice «No se puede descartar: el registro aún
no está registrado en la AEAT. Reintenta la transmisión.».

### Eventos
Menú **VeriFactu → Eventos**. Título «Eventos de auditoría». Tabla, lo más reciente primero: Cuándo
(fecha y hora del reloj del negocio), Severidad (Depuración, Información, Aviso, Error, Crítico),
Tipo (Registro creado, Tipo de factura cambiado, Envío aplazado, Envío aceptado, Aceptado con avisos,
Envío fallido, Cola de contingencia procesada, Cadena verificada, Cadena rota, Consulta a la AEAT,
Cadena recuperada, Prueba de conexión) y Mensaje, compuesto en el idioma de quien mira. Buscador
«Buscar tipo o mensaje…» que encuentra por las palabras que se ven, en español o inglés; filtros de
tipo y severidad por lista. Vacía: «Sin eventos.». Cargando: «Cargando…». Error: mensaje con
reintento. No se refresca sola.

### Recuperación
Menú **VeriFactu → Recuperación**. Título «Recuperación de cadena». Campo «NIF del emisor»
(rellenado con el del negocio). Bloque «Integridad de la cadena» con el último veredicto («Cadena de
huellas íntegra ✓», «Cadena de huellas ROTA ✗», «Sin validar todavía», «Comprobando la cadena…» o «No
se ha podido comprobar») y la nota de alcance («Recalcula las huellas SHA-256 y verifica el
encadenado. No vuelve a auditar los importes…»). Botones «Validar cadena», «Consultar AEAT» y
«Recuperar cadena desde la AEAT». Tabla «Últimos registros en la AEAT»: Factura, Fecha, Huella,
Estado, CSV, Cuándo; vacía: «Sin datos de la AEAT. Pulsa «Consultar AEAT».». Bloque «Continuar cadena
manualmente (migración)» con «Última huella (64 hex)», «Nº de factura (opcional)», «Fecha
(YYYY-MM-DD, opcional)» y «Continuar desde esta huella». Las dos recuperaciones piden confirmación
(«Confirmar recuperación» / «Cancelar»). Sin NIF, los botones quedan apagados. Si no se pudo leer el
NIF o el estado de la cadena: aviso rojo con el mensaje del error (o, si no trae ninguno, «No se pudo
leer el NIF del emisor o el estado de la cadena») y «Reintentar», que solo vuelve a leer; si también
falló la tabla de la AEAT, ese aviso no sale y el motivo lo dice la tabla. Al terminar una acción: «Operación completada.».

### Configuración
Menú **VeriFactu → Configuración**. Título «Configuración de VeriFactu». Dos pestañas, que son las
dos vías de envío:
- **«Lo remite ERPlora»** (abre por defecto): el panel «Otorgamiento de representación» con su estado
  («Sin firmar…», «Subido el {date}. Lo estamos revisando…», «Aprobado el {date}…», «Devuelto el
  {date}…», «Revocado el {date}…», «Consultando con ERPlora…» o «No hemos podido contactar con
  ERPlora…»), «Lo que has enviado», «Historial de envíos» (desde el segundo envío), «Volver a enviar»
  y, cuando toca, el formulario de dos pasos (VERIFACTU-F05). Debajo, salvo que el hub remita con
  certificado propio, «Conexión segura con ERPlora» con su estado («sin solicitar», «pendiente de
  firma», «activa», «caduca pronto», «caducada», «no disponible», «consultando…») y un único botón
  según el estado: «Solicitar la conexión», «Comprobar el estado» o «Renovar la conexión»
  (VERIFACTU-F07).
- **«Mi certificado»**: «Certificado del negocio (.p12 / .pfx)» con «Cargado» / «Sin cargar»,
  Titular y «Subido el», la zona para arrastrar o elegir el fichero (hasta 1 MB), «Contraseña del
  certificado», «Subir certificado» y, si hay uno, «Quitarlo» (VERIFACTU-F02, VERIFACTU-F03).
La pestaña se puede abrir directamente desde otras pantallas (`#delegated`, `#own`). Una lectura que
falla no vacía el resto, pero no todas lo dicen: si falla la del certificado, la pastilla dice «Sin
cargar»; si falla la de los datos del negocio, el panel de la autorización dice «Faltan datos de tu
negocio»; el estado de la autorización y el de la conexión segura sí dicen que no se pudo leer («No
hemos podido contactar con ERPlora…», «no disponible»).

### Ajustes
Menú **VeriFactu → Ajustes**. Título «Configuración VeriFactu». Tres bloques:
- **Formulario**: «Activar VeriFactu»; «Usar mi propio certificado» con su explicación y «Abrir
  Configuración»; «Entorno AEAT» con la pastilla «Pruebas (AEAT Test)» o «Producción» y, según el
  caso, «Pasar a producción» o «Volver a pruebas» con su explicación (en un hub de demostración, el
  aviso de que siempre remite a pruebas); y «Guardar configuración». Si no se pudo saber dónde remite
  el hub: aviso y «Reintentar».
- **«Prueba en vivo»**: «Tipo de prueba» (Tiquet simplificado (F2) / Factura completa (F1, cliente de
  prueba)), «Enviar prueba» y «Crear factura de prueba»; debajo, el resultado de la última prueba
  (Certificado, «Se remite», Entorno, «Huella de muestra (SHA-256)», «Enlace de verificación en la
  AEAT», «Respuesta de la AEAT»), o «Aún no has ejecutado ninguna prueba…».
- **«Declaración responsable»**: «Leer la declaración firmada», «Versión de la declaración» y los
  «Datos identificativos de este sistema» (VERIFACTU-F12).
Avisos de la pantalla: «Configuración guardada correctamente.», el aviso del permiso tras activar, el
de permiso denegado con «Ir a Permisos», y los errores en una franja roja arriba.

### Avisos en el panel de inicio
No es una pestaña: VeriFactu aporta cuatro tarjetas al panel (VERIFACTU-F31). «Pendientes VeriFactu»
(«Registros pendientes de envío a la AEAT», visible de fábrica), «Cola de contingencia», «Registros
por estado» y «Eventos AEAT recientes» (con «No se han podido cargar los últimos eventos de la
AEAT.» si falla). Y un paso obligatorio en la lista de puesta en marcha del hub, «Configura VeriFactu»,
que lleva a Configuración.

## Flujos

El detalle de cada flujo (pasos, datos, fallos, implicados y QA) vive en `workflow/`, con la misma
gramática y el mismo prefijo. Todos son `Vertical: comun`. Huecos (`parcial`, `no hecho`): el porqué
está en la línea `Estado:`.

| ID | Flujo | Estado | Fichero |
|---|---|---|---|
| VERIFACTU-F01 | Activar VeriFactu | parcial | [workflow/configuracion.md](workflow/configuracion.md) |
| VERIFACTU-F02 | Subir el certificado propio del negocio | parcial | [workflow/configuracion.md](workflow/configuracion.md) |
| VERIFACTU-F03 | Quitar el certificado propio | parcial | [workflow/configuracion.md](workflow/configuracion.md) |
| VERIFACTU-F04 | Elegir quién remite: mi certificado o ERPlora | hecho | [workflow/configuracion.md](workflow/configuracion.md) |
| VERIFACTU-F05 | Firmar y subir la autorización para que remita ERPlora | hecho | [workflow/configuracion.md](workflow/configuracion.md) |
| VERIFACTU-F06 | Volver a enviar la autorización | hecho | [workflow/configuracion.md](workflow/configuracion.md) |
| VERIFACTU-F07 | Solicitar o renovar la conexión segura con ERPlora | parcial | [workflow/configuracion.md](workflow/configuracion.md) |
| VERIFACTU-F08 | Pasar a producción | hecho | [workflow/configuracion.md](workflow/configuracion.md) |
| VERIFACTU-F09 | Volver a pruebas | parcial | [workflow/configuracion.md](workflow/configuracion.md) |
| VERIFACTU-F10 | Probar la conexión con la AEAT | parcial | [workflow/configuracion.md](workflow/configuracion.md) |
| VERIFACTU-F11 | Crear una factura de prueba | hecho | [workflow/configuracion.md](workflow/configuracion.md) |
| VERIFACTU-F12 | Consultar la declaración responsable | hecho | [workflow/configuracion.md](workflow/configuracion.md) |
| VERIFACTU-F13 | Registrar una factura emitida | parcial | [workflow/registro-y-envio.md](workflow/registro-y-envio.md) |
| VERIFACTU-F14 | Registrar una factura rectificativa | parcial | [workflow/registro-y-envio.md](workflow/registro-y-envio.md) |
| VERIFACTU-F15 | Enviar el registro a la AEAT y recoger su respuesta | parcial | [workflow/registro-y-envio.md](workflow/registro-y-envio.md) |
| VERIFACTU-F16 | Consultar los registros y su estado | parcial | [workflow/registro-y-envio.md](workflow/registro-y-envio.md) |
| VERIFACTU-F17 | Ver el detalle de un registro y por qué espera | hecho | [workflow/registro-y-envio.md](workflow/registro-y-envio.md) |
| VERIFACTU-F18 | Cotejar el QR en la sede de la AEAT | parcial | [workflow/registro-y-envio.md](workflow/registro-y-envio.md) |
| VERIFACTU-F19 | Dar el QR y el estado fiscal al tique y a la factura | hecho | [workflow/registro-y-envio.md](workflow/registro-y-envio.md) |
| VERIFACTU-F20 | Enviar después lo que no pudo salir (contingencia automática) | parcial | [workflow/contingencia.md](workflow/contingencia.md) |
| VERIFACTU-F21 | Procesar la cola a mano | hecho | [workflow/contingencia.md](workflow/contingencia.md) |
| VERIFACTU-F22 | Reintentar una entrada de la cola | parcial | [workflow/contingencia.md](workflow/contingencia.md) |
| VERIFACTU-F23 | Descartar una entrada de la cola | parcial | [workflow/contingencia.md](workflow/contingencia.md) |
| VERIFACTU-F24 | Actuar ante un registro rechazado por la AEAT | parcial | [workflow/contingencia.md](workflow/contingencia.md) |
| VERIFACTU-F25 | Reenviar un registro concreto | parcial | [workflow/contingencia.md](workflow/contingencia.md) |
| VERIFACTU-F26 | Verificar la cadena de huellas | parcial | [workflow/cadena.md](workflow/cadena.md) |
| VERIFACTU-F27 | Consultar lo que tiene la AEAT | hecho | [workflow/cadena.md](workflow/cadena.md) |
| VERIFACTU-F28 | Recuperar la cadena desde la AEAT tras restaurar una copia | hecho | [workflow/cadena.md](workflow/cadena.md) |
| VERIFACTU-F29 | Continuar la cadena de otra aplicación (migración) | parcial | [workflow/cadena.md](workflow/cadena.md) |
| VERIFACTU-F30 | Anular un registro enviado por error | parcial | [workflow/cadena.md](workflow/cadena.md) |
| VERIFACTU-F31 | Vigilar los envíos desde el panel y los eventos | parcial | [workflow/control.md](workflow/control.md) |
| VERIFACTU-F32 | Impedir apagar o desinstalar con registros sin enviar | parcial | [workflow/control.md](workflow/control.md) |
| VERIFACTU-F33 | Cesar la actividad | no hecho | [workflow/control.md](workflow/control.md) |
| VERIFACTU-F34 | Renovar el certificado propio | parcial | [workflow/control.md](workflow/control.md) |

## Qué comparten los verticales

Todo el módulo es común a peluquería y restaurante: no hay ningún flujo de un solo vertical, y tocar
cualquiera afecta a los dos. Las piezas que comparten varios flujos:

| Pieza compartida | Flujos que la usan |
|---|---|
| La vía de envío (certificado propio o ERPlora) que decide el núcleo del hub | VERIFACTU-F02, F03, F04, F05, F07, F08, F10, F15, F20 |
| El entorno (pruebas / producción), uno por hub, que viaja dentro de cada registro | VERIFACTU-F08, F09, F10, F11, F13, F15, F18, F20 |
| La ingesta de facturas (un solo camino para facturas y rectificativas) | VERIFACTU-F13, F14 |
| La cola de contingencia y su tarea de cada 5 minutos | VERIFACTU-F15, F17, F20, F21, F22, F23, F24 |
| El ancla de la cadena (por hub, NIF del emisor y entorno) | VERIFACTU-F13, F26, F28, F29 |
| La guarda de la tabla interna que deshace la operación entera si falla una condición | VERIFACTU-F01, F09, F23 |
| El registro de eventos y su texto compuesto por código | VERIFACTU-F10, F17, F26, F27, F28, F29, F31 |

## Cobertura contra la referencia

Requisitos de la norma (RD 1007/2023, Orden HAC/1177/2024, FAQ AEAT):

| Elemento de la referencia | Estado | Flujo |
|---|---|---|
| Registro de alta por cada factura expedida (F1, F2, F3) | hecho | F13 |
| Rectificativa (R1–R5) declarada como alta con su tipo y lo que rectifica | parcial: verifactu#110 abierta; desde Facturación siempre por diferencias, la de sustitución solo por asistente o API | F14 |
| Sustitutiva F3 que declara la simplificada que sustituye | hecho (lo lee de Facturación) | F13 |
| Registro de anulación | parcial: sin pantalla, solo asistente o API | F30 |
| Encadenamiento por huella SHA-256 con el registro anterior | hecho (lo calcula el motor del hub) | F13, F26 |
| Cadena separada por entorno de pruebas y de producción | hecho | F13, F08 |
| Remisión inmediata en modalidad VERI\*FACTU | parcial: una respuesta con un veredicto que el motor no reconoce deja «Error» sin reenvío, y un «duplicado» tras un reintento queda «Rechazado» aunque la AEAT lo tenga aceptado | F15 |
| Remisión posterior ante incidencia, marcada como tal | hecho (motor del hub) | F20 |
| Ningún registro generado se queda sin remitir | parcial: no se puede descartar ni desactivar o desinstalar con pendientes, pero un «Error» por un veredicto no reconocido, un hub sin vía (también en pruebas, si ERPlora no le da paso) y uno con la conexión con ERPlora caducada se quedan esperando | F07, F15, F20, F23, F32 |
| QR con URL de cotejo de la AEAT en el documento | hecho (lo pintan Venta y Facturación) | F18, F19 |
| Identificación del sistema informático en cada registro | hecho (datos del productor llegan del SaaS) | F12 |
| Declaración responsable consultable | hecho | F12 |
| Registro de eventos de sistema NO VERI\*FACTU | fuera: no aplica a VERI\*FACTU (ADR-0271) | — |
| Conservación y consulta de lo remitido (consulta a la AEAT) | hecho | F27 |
| Colaboración social: remitir en nombre del obligado con su autorización | hecho (revisión en el SaaS) | F05, F06, F07 |
| Certificado propio del obligado | parcial: sin aviso de caducidad en el módulo | F02, F34 |
| Paso a producción sin vuelta atrás tras la primera venta real | parcial: el núcleo del hub solo cierra la vuelta con la primera rectificativa, no con una venta (ERPlora/hub#2498); se cierra al emitir, no al llegar a la AEAT | F08, F09 |
| Hub de demostración clavado en pruebas | hecho (núcleo del hub) | F08 |
| Cese de actividad | no hecho en el hub (no exige nada al software: es la baja censal); el núcleo sabe cerrar un hub pero nada lo llama | F33 |
| Envío inmediato también en pruebas, sin configurar nada | hecho por el carril de pruebas de la celda; parcial si ERPlora no da paso al hub (sin la autoridad de confianza publicada, sin enlace o con el permiso de envío negado) | F20 |

Lo que el mercado ofrece en pantalla:

| Elemento | Estado | Flujo |
|---|---|---|
| Lista de envíos con estado y detalle | hecho | F16, F17 |
| Separar envíos de prueba y reales en la lista | no hecho (verifactu#103) | F16 |
| Enlace directo de cotejo desde la lista | no hecho (verifactu#104) | F18 |
| Reenviar un envío concreto desde la pantalla | no hecho: solo asistente o API | F25 |
| Cola de reintentos con reintento y descarte | parcial: «Reintentar» reprograma, no envía; descartar casi nunca se puede | F21, F22, F23 |
| Aviso de pendientes en el panel | parcial: cuenta también los de pruebas (verifactu#105) y no se refresca tras la pasada de la cola | F31 |

## Datos: de quién es cada dato

- **Propios** (tablas del módulo): la configuración (una por hub: activado, entorno espejo del núcleo,
  emisor, datos del productor, preferencias de reintento), los registros de facturación (con su
  huella, su XML y la respuesta de la AEAT), la cola de contingencia, el registro de eventos, la
  última foto de lo que tiene la AEAT (se sustituye en cada consulta) y una tabla interna de control
  que solo sirve para deshacer una operación que no cumple una condición (sin datos). Además, una copia
  de cada XML enviado en el almacenamiento de ficheros del módulo (`xml/<registro>.xml`).
- **Del núcleo del hub** (se leen por sus puertas, nunca por tabla): la identidad fiscal del negocio
  (Ajustes → Negocio), el certificado `.p12` y su contraseña (el módulo nunca los ve: solo si hay o no,
  titular y fecha), la vía de envío y el estado de la autorización, la conexión segura, el entorno y
  el paso a producción, y la declaración responsable con los datos del productor.
- **De Facturación**: la factura llega por sus avisos (`invoice.created`, `invoice.rectified`); el motor
  lee una sola fila de factura por su id para obtener el número oficial (excepción documentada en
  ADR-0058). VeriFactu guarda el id de factura como referencia, sin enlace fuerte.
- **Lo que entrega a otros**: a Venta y a Facturación, el registro de una factura (QR, CSV, estado)
  por su consulta pública; a cualquiera que escuche, los avisos de registro creado, enviado, rechazado
  y aceptado con errores, sin contenido fiscal (ver VERIFACTU-F15).
- **Datos personales** (inventario RGPD, recorriendo las migraciones):
  - registro de facturación: NIF y nombre del emisor (si es autónomo, es una persona), NIF, nombre,
    país y tipo de documento del **cliente** de una factura completa, la descripción de la factura,
    los datos de la factura rectificada o sustituida, y el XML completo que viajó (los lleva todos);
  - copia del XML en el almacenamiento de ficheros del módulo: lo mismo que el XML de la fila, con el
    NIF y el nombre del cliente. La puede leer cualquier persona con sesión en el hub, no solo quien
    tiene permiso de VeriFactu (ERPlora/hub#2495), y viaja dentro de una plantilla del negocio
    exportada con sus archivos (ERPlora/hub#2496);
  - foto de la AEAT: NIF del emisor y números de factura;
  - configuración: NIF y nombre del emisor;
  - eventos: el mensaje y sus detalles pueden llevar el NIF del emisor y números de factura;
  - las cinco tablas con datos: qué empleado creó y cambió cada fila;
  - fuera del módulo: los documentos de la autorización (modelo firmado, copia del DNI/NIE, muestra de
    firma, justificante de representación) se suben al SaaS y no se guardan en el módulo.
  - Borrado: el borrado RGPD de la plataforma es anonimizar al cliente en Clientes; VeriFactu no
    escucha ese aviso, y el borrado del núcleo solo vacía su historial de avisos y de automatizaciones.
    Los registros, su XML en la fila y la copia en el almacenamiento conservan el NIF y el nombre del
    cliente, a propósito: la norma obliga a conservar los registros. Esa copia sale también en una
    plantilla exportada con archivos (ERPlora/hub#2496).

## Reglas que no se rompen

Solo las que el código hace cumplir:

- **Un registro generado no se descarta**: descartar una entrada de la cola solo se permite si su
  registro ya está aceptado por la AEAT; en cualquier otro estado la operación entera se deshace
  (VERIFACTU-F23).
- **No se apaga ni se desinstala con registros sin enviar**: el hub lo niega diciendo cuántos quedan,
  también cuando lo arrastra la desactivación de otro módulo (por ejemplo, apagar Facturación), en
  una desinstalación forzada de VeriFactu y al desinstalar confirmando Facturación, que se lo lleva
  con ella. Con el hub en producción, además, no se puede quitar el último módulo que cumple su
  régimen fiscal aunque la cola esté vacía, tampoco arrastrado por otro (VERIFACTU-F32).
- **Producción no tiene vuelta atrás desde la primera rectificativa**: el núcleo niega volver a pruebas
  en cuanto se emite la primera rectificativa en producción, aunque su registro no haya salido aún. Una
  venta o una factura normal no la cierra: es un hueco, no una regla (ERPlora/hub#2498). El módulo
  además lo niega en cuanto hay un registro aceptado en producción, pero solo al «Guardar
  configuración»: el botón «Volver a pruebas» llama al núcleo y esa guarda no lo frena (VERIFACTU-F09).
  Un hub de demostración nunca pasa a producción (VERIFACTU-F08).
- **El entorno va dentro de cada registro**: un registro sale al entorno en el que nació, no al que
  esté configurado al enviarlo; uno que no sabe su entorno no se envía (VERIFACTU-F15). El entorno lo
  manda el perfil fiscal del núcleo del hub, no la fila del módulo.
- **En producción, sin vía no se cobra**: el núcleo del hub niega la venta o la factura que abriría la
  cadena si el hub está en producción y su vía no existe (certificado propio caducado; o, por la vía de
  ERPlora, sin autorización aprobada o sin conexión segura). Una AEAT o una celda caídas no impiden
  cobrar: el registro espera en la cola (VERIFACTU-F20). En pruebas nunca se bloquea el cobro. Esta
  regla no mira el permiso «Certificado del negocio (firma fiscal)»: sin él se cobra y no se registra.
- **VeriFactu no se simula**: no existe ningún modo simulado de envío; un hub de demostración envía de
  verdad, siempre al entorno de pruebas de la AEAT.
- **Lo que sale de la cola se declara como incidencia** y en el orden de su cadena. Una venta nueva
  espera si un registro anterior de su cadena tiene que salir en ese momento; si el anterior está
  esperando su reintento, la nueva sale antes que él (VERIFACTU-F15).
- **Hueco, no regla**: que todo tique con QR llegue a la AEAT no lo garantiza el código
  (ERPlora/hub#2493). Un hub sin certificado propio al que ERPlora no da paso (sin la autoridad de
  confianza de la celda, sin enlace o con el permiso de envío negado) espera sin límite también en
  pruebas (VERIFACTU-F20), y lo mismo uno con la conexión con ERPlora caducada (VERIFACTU-F07); una
  respuesta con un veredicto que el motor no reconoce deja el registro en «Error» sin reenvío si no
  tenía ya entrada en la cola, y un «duplicado» (3000) tras un reintento queda «Rechazado» aunque la
  AEAT lo tenga aceptado (VERIFACTU-F15). Un Fault o una respuesta sin veredicto sí van a la cola. Y un
  hub que vuelve a pruebas después de vender en producción manda las ventas siguientes a la AEAT de
  pruebas (VERIFACTU-F09).
- **Dos cadenas por hub y emisor**: pruebas y producción no se encadenan entre sí.
- **Una factura, un registro**: ingerir dos veces la misma factura no duplica el registro ni gasta otro
  número de la cadena, pero la segunda entrega llega a enviarse a la AEAT antes de chocar con el
  registro existente (VERIFACTU-F13).
- **No se sella un registro aritméticamente imposible**: la cuota de cada línea tiene que cuadrar con
  su tipo, y una factura ordinaria no puede sumar en negativo (las devoluciones son rectificativas);
  si no cuadra, no se escribe nada ni se gasta número.
- **Sin emisor no hay VeriFactu activo**: no se puede dejar activado sin NIF del obligado
  (VERIFACTU-F01).
- **El certificado no entra en el módulo**: la clave y la contraseña se quedan en el núcleo; las
  pantallas solo ven si hay o no, titular y fecha.
- **Permisos**: consultar (pantallas, cadena, verificar la cadena), empleado; reintentar, descartar y
  procesar la cola y crear registros, responsable; enviar, consultar a la AEAT y probar la conexión,
  responsable; guardar la configuración y las dos recuperaciones de la cadena, solo administrador.
  Cuando un empleado pide una acción de responsable, el hub pide el PIN de un responsable y, con él, la
  acción entra; las de administrador se niegan sin PIN. Pasar a producción, volver a pruebas, el
  certificado, la autorización y la conexión segura los decide el núcleo del hub con sesión de
  administrador. El permiso «Certificado del negocio (firma fiscal)» tiene que estar concedido para
  todo lo que hace el motor: registrar facturas, enviar, drenar la cola, probar, verificar, consultar y
  recuperar la cadena.
- **Aislamiento**: toda lectura y escritura va con el hub, salvo tres lecturas del motor que buscan por
  el identificador único de un registro; la cadena se ancla en el propio hub.
- **Dinero**: los importes se guardan en céntimos enteros; este módulo no calcula impuestos, los
  recibe de Facturación.

## Lo que NO hace, a propósito

- No emite, anula ni modifica facturas: eso es Facturación; una devolución es una rectificativa.
- No calcula impuestos: los importes llegan decididos.
- No guarda ni ve el certificado ni su contraseña: son del núcleo del hub.
- No lleva el registro de eventos de la modalidad NO VERI\*FACTU: «Eventos» es trazabilidad propia.
- No permite borrar ni editar un registro: un registro sellado es inmutable.
- No deja olvidar la conexión segura desde la pantalla: esa rotación es del operador de ERPlora.
- No envía nada a la AEAT real desde la prueba de conexión por la vía de ERPlora: comprueba la vía sin
  usarla, porque un registro remitido no se puede deshacer.
- No tramita el cese de actividad ante Hacienda: es la baja censal del negocio.

## Dudas abiertas

Se resuelven con `market-decision`; no las decide el worker.

1. ¿Hace falta un botón de reenviar por registro en Registros, como ofrece el mercado, o basta con la
   cola automática y «Procesar cola»?
2. ¿Qué tiene que hacer la persona ante un registro rechazado (rectificar en Facturación, subsanar)? Hoy
   la pantalla no le dice nada más que el código de la AEAT.
3. ¿Debe haber una pantalla para el registro de anulación, o queda solo para el soporte por asistente?
4. ¿Debe el módulo avisar de que el certificado propio caduca pronto (hoy solo lo dice el paso a
   producción al negarse)?
5. ¿Separar en Registros y en el panel los envíos de prueba de los reales (verifactu#103, #105)?
6. ¿Debe «Quitarlo» pedir confirmación? Los textos de la confirmación existen y no se usan.
7. «Activar VeriFactu» no cambia lo que hace el motor (VERIFACTU-F01): ¿debe parar la ingesta y el
   envío, o desaparecer? Ojo con la regla de la AEAT: un módulo activo emite siempre.
8. ¿Entra en el MVP una acción de cese de actividad en el hub (VERIFACTU-F33), o basta con la baja
   censal fuera de ERPlora?
9. La prueba en vivo con certificado propio en producción presenta una muestra en la AEAT real
   (VERIFACTU-F10): ¿se limita a pruebas, como «Crear factura de prueba», o se avisa antes?

## Fuentes contrastadas

Contra `origin/main` v1.5.63 del módulo y `origin/develop` del hub (05/10/2026). Una línea por
discrepancia; manda el código.

- **«Activar VeriFactu»**: `docs/screens.md` (`Turns the module on for this hub`) y el manual dicen que
  lo activa; el motor no lee ese valor y solo lo usa la lista de puesta en marcha (F01).
- **Estados del registro**: `docs/limits.md`, `docs/overview.md`, el manual y el filtro de Registros
  listan «Transmitido» y «Reintento»; el motor nunca los escribe: un fallo de red deja «Error» (F15, F16).
- **Máximo de reintentos**: `docs/limits.md` dice que al agotar los reintentos la entrada acaba en
  `failed`; no hay tope de intentos, y `failed` solo lo pone un rechazo de la AEAT. El ajuste
  `max_retries` se guarda (10 por defecto; la pantalla devuelve el que lee y el asistente puede mandar
  otro) y nadie lo lee. La espera sí crece desde `retry_interval_minutes` (5 por defecto): la escala
  5/10/20/40/60 de los `docs/` solo vale con ese valor (F20).
- **Orden de la cola**: `docs/overview.md` y `docs/limits.md` dicen que va por prioridad; se envía en el
  orden de la cadena, la prioridad no se usa y el motor siempre escribe prioridad 2 (F20).
- **Enviar un registro**: `docs/screens.md` (apartado `Transmit a record`) describe una acción de pantalla; no hay botón, solo asistente o API (F25).
- **Anulación**: `architecture/modules/verifactu.md` la sitúa en la pantalla de recuperación; esa
  pantalla no la tiene (F30). L-04 y `qa-hub.md` §7 esperan un registro de anulación al anular una
  factura; la ingesta solo crea altas: una devolución o una corrección es una rectificativa (F14), y
  anular una venta en Venta no produce nada fiscal (Facturación no escucha la anulación: INVOICE-F07)
  (F30).
- **Prueba en vivo**: el texto «Verifica el certificado y hace un envío de PRUEBA a la AEAT. No afecta a
  la cadena real ni a tus facturas.», `docs/screens.md` y la descripción para el asistente del
  `module.json` (`without touching the real chain`); con certificado propio la muestra es un alta real
  y en producción queda en la AEAT real, donde una recuperación posterior puede anclar sobre ella (F10).
- **Textos de la prueba en vivo que mandan a otro sitio**: «Conecta este hub con ERPlora ahí arriba…»
  (la conexión está en Configuración, no arriba) y «Sube el certificado del negocio en Ajustes →
  Negocio…» (se sube en Configuración) (F10). El Entorno del resultado sale con el código `testing` o
  `production` sin traducir.
- **Vuelta a pruebas**: el aviso de confirmación («Solo podrás volver a pruebas hasta que se remita la
  primera.»), «Todavía no se ha remitido ninguna factura a la AEAT real…» y la negativa «…ya envió a la
  AEAT un registro aceptado en producción…» hablan de remitir o de aceptar; el núcleo cierra la vuelta
  al emitir la primera rectificativa en producción, aunque no haya salido, y una venta no la cierra
  (F09, ERPlora/hub#2498). Un rechazo desconocido de «Volver a pruebas» sale como «No se ha podido
  pasar a producción…».
- **Test del hub que promete cerrar la vuelta con una venta**: `crates/runtime/tests/fiscal_mode.rs`
  (`a_sale_that_starts_the_fiscal_chain_in_production_seals_the_go_live`) se llama así pero sella
  llamando directamente a la función del núcleo; por el camino real, la factura de Facturación es un
  manejador y no sella (F09).
- **Aviso al subir el certificado**: dice solo «Subido el», sin fecha; el texto «Certificado subido»
  existe en el catálogo y no se usa (F02).
- **Desactivar con registros sin enviar**: la pantalla del hub enseña la frase del motor en inglés; el
  hub no tiene traducción para ese código (F32).
- **Capacidades**: `docs/overview.md`, `docs/concepts.md` y el README dicen que el módulo declara dos
  (certificado y red); `module.json` solo declara la del certificado.
- **Motivo de no tener vía en el envío manual**: dice que se suba el `.p12` en Ajustes → Negocio; se sube en
  VeriFactu → Configuración (F25).
- **Dónde se sube el certificado**: el manual (`hand-book/modulos/verifactu.md`),
  `architecture/modules/verifactu.md` (apartados de capacidades y de `verifactu_config`) y el motivo
  «el fichero del certificado no se ha podido cargar: comprueba en Ajustes → Negocio…» dicen Ajustes →
  Negocio; se sube en VeriFactu → Configuración, pestaña «Mi certificado» (F02).
- **Emisor que diverge**: `docs/limits.md` dice que, guardado una vez, el emisor del módulo ya no sigue
  a Ajustes → Negocio; cada «Guardar configuración» lo vuelve a copiar de Ajustes → Negocio (entre
  guardados sí puede quedar desfasado) (F01).
- **Contraseña en claro**: `docs/limits.md` y el README lo atribuyen al módulo; el módulo ya no guarda
  certificado ni contraseña desde la migración 006 (son del núcleo; cómo los guarda el núcleo no se ha
  contrastado aquí).
- **Buscador de Registros**: dice «Buscar factura, emisor o NIF…» y no busca por NIF (F16).
- **Orden de Registros**: el comentario de la consulta dice que salen los más recientes primero; la lista se ordena
  por el identificador interno, ascendente (sin confirmar si ese orden coincide con el de creación).
- **Contingencia en inglés**: la columna Estado enseña los códigos `pending`, `retrying`, `failed`,
  `cancelled` sin traducir, y Registro el identificador interno en vez del número de factura.
- **Descartar**: `docs/screens.md` lo presenta como acción útil, aunque muy vigilada; como la entrada de un
  registro aceptado sale sola de la cola, en la práctica siempre se niega (F23).
- **Manual, contingencia**: el manual habla de reintentar ahora; el botón dice «Reintentar» y no envía
  en el momento, reprograma (F22).
- **Tipo de rectificativa**: `docs/concepts.md` dice que el registro guarda el tipo de rectificación;
  por la ingesta siempre va vacío y el XML declara «por diferencias». El motivo «una rectificativa
  {invoice_type} exige TipoRectificativa…» ya no puede darse: el motor siempre lo pone (F14).
- **Rectificativas**: `docs/concepts.md` dice que una segunda ingesta deja un solo registro y no gasta
  número; es cierto, pero la ingesta falla en vez de no hacer nada, la segunda entrega llega a
  enviarse a la AEAT antes de chocar y el aviso acaba en la cola de fallos (verifactu#110, F13, F14).
- **Importes ×100**: verifactu#109 (abierta) dice que Registros enseña los totales multiplicados por
  cien; el código actual los pinta como dinero del hub (céntimos → euros), así que parece ya resuelto.
- **Declaración «hasta entonces no se puede enviar ninguna factura»**: cierto para el envío; la venta
  no se bloquea y el registro espera en la cola (F12).
- **Datos del productor «al minuto»**: el texto de la declaración («Llegan solos al minuto de estar el
  sistema en marcha») y el comentario de `crates/runtime/src/producer_facts.rs` del hub («a minute at
  most») prometen un minuto; llegan con el aviso de arranque, el diario o el de un cambio de vía, y si
  falla el de arranque pueden tardar hasta un día (F12).
- **Avisos de envío fallido «sin el NIF»**: el comentario del motor del hub
  (`crates/plugins/verifactu/src/events.rs`, `failure_payload`) dice que el aviso nunca lleva el NIF;
  el mensaje de un Fault 4116 de la AEAT lleva el NIF y la razón social del obligado y viaja en el
  aviso (F15).
- **Aviso de aceptado con errores**: su contenido lleva como motivo `aeat_rejected`, el mismo que un
  rechazo (F15).
- **README**: dice versión 1.5.40; el módulo va por la 1.5.63.
- **`qa-billing-verifactu.md`** y sus cuatro botones son de la facturación propia del SaaS, no de este
  módulo: no se usan como oráculo aquí.
