# Arquitectura general

## Identidad y alcance

Milo Store es una única aplicación modular Next.js con dos experiencias: **Milo Store Admin**, para operaciones del negocio, y **Milo Store Shop**, PWA de venta mayorista privada para técnicos autorizados. Ambas usan los mismos casos de uso, políticas de precios, inventario y datos. No habrá backend separado ni microservicios inicialmente.

El negocio inicia en Argentina (ARS, español, `America/Argentina/Buenos_Aires`), con una sucursal y un depósito. El modelo permitirá sumar ubicaciones. La tienda no será abierta al público general.

## Componentes y flujo

```text
Navegador / PWA
├── Catálogo público: campos permitidos, sin precio
├── Tienda privada: técnico activo, precio/carrito/pedidos
└── Administración: operaciones según rol y permiso
          │ rutas y UI Next.js
          ▼
 Validación Zod + sesión + autorización de servidor
          ▼
 Casos de uso compartidos → políticas de dominio
          ▼
 Adaptadores de infraestructura
 ├── Prisma → PostgreSQL en Supabase
 ├── Supabase Auth → identidad y sesión
 └── Supabase Storage → imágenes/documentos
```

Route Handlers, Server Actions y Server Components son puntos de entrada, no lugares para duplicar reglas de dominio. Cada acción valida sesión, estado del usuario, rol/permisos y datos en servidor. Los resultados privados deben marcarse dinámicos/no almacenables y devolver solo los campos necesarios.

## Estructura propuesta (no crear hasta aprobación)

```text
.
├── AGENTS.md
├── README.md
├── docs/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── public/                    # shell público, iconos y recursos no privados
└── src/
    ├── app/
    │   ├── (shop)/            # páginas públicas y privadas de tienda
    │   ├── (auth)/
    │   ├── admin/
    │   └── api/
    ├── components/
    │   ├── ui/
    │   └── shared/
    ├── modules/
    │   ├── catalog/ inventory/ customers/ suppliers/ purchasing/
    │   ├── sales/ receivables/ cash/ repairs/ online-orders/
    │   ├── reporting/ access/ access-requests/ notifications/ settings/
    │   ├── media/              # dominio de assets y pipeline de imágenes
    ├── lib/
    │   ├── auth/ db/ errors/ env/ validation/ cache/
    └── styles/
```

La estructura dentro de cada módulo se concretará cuando se implemente: dominio/invariantes, casos de uso, persistencia y UI donde aplique. Evitar carpetas vacías prematuras. `app/` compone rutas; no aloja lógica comercial.

## Módulos y responsabilidades

- **Catálogo:** productos, SKU, códigos, marca, taxonomía categoría/subcategoría, compatibilidades/modelos, precios/costos, disponibilidad comercial y publicación.
- **Imágenes/media:** originales, procesamiento y variantes, galería ordenada, imagen principal, estado de publicación y reconciliación de objetos Storage.
- **Inventario:** ubicaciones, reservas, balances operativos y ledger de movimientos.
- **Clientes y acceso:** clientes/técnicos, estado de cuenta, alta manual, relación con Auth y datos de contacto.
- **Solicitudes de acceso:** formulario público sin auto-registro; cola de revisión Admin, solicitud de corrección, aprobación/rechazo y auditoría.
- **Proveedores/compras:** órdenes, recepciones, costos, pagos a proveedores y entradas de inventario.
- **Ventas/POS:** ventas de mostrador, snapshots, medios de pago, devoluciones y movimientos.
- **Cuentas corrientes:** cargos, créditos, pagos, aplicaciones y reversos históricos.
- **Caja:** sesiones, aperturas/cierres, ingresos/egresos y conciliación con cobros.
- **Reparaciones:** recepción, diagnóstico, autorización, estados, repuestos consumidos y cobros.
- **Pedidos online:** carrito autenticado, pedido B2B, reserva, pago manual, entrega e historial.
- **Notificaciones internas:** nuevas compras persistidas y accesibles desde Admin.
- **Configuración/reportes/auditoría:** datos bancarios, WhatsApp, envíos, métricas y trazabilidad.

## Catálogo de tienda y administración

Cada producto contempla título, descripción, SKU único, código de barras opcional, marca, categoría y subcategoría, compatibilidades/modelos, precio y costo restringidos, estado de publicación, disponibilidad comercial, galería e imagen principal. Disponibilidad comercial es una proyección de venta (por ejemplo, disponible/agotado/consultar) independiente del ledger; no permite editar existencias ni exponer cantidades exactas a visitantes. La semántica final de disponibilidad y estados de producto se fija en el diseño del módulo.

Shop ofrece grilla, detalle con galería, búsqueda, filtros, ordenamiento, destacados/relacionados y carrito con cantidades. Responsive/mobile-first. Público no autenticado ve campos de presentación públicos, nunca precio/costo; un cliente autorizado puede ver precio tras verificación server-side de sesión, estado activo y permiso. Carrito, alta de cantidad, precio mostrado, cálculo y checkout pasan por casos de uso de servidor. Productos ocultos/desactivados no aparecen en el catálogo público; productos despublicados no se deben comprar.

Admin crea/edita productos; publica, oculta o desactiva; carga imágenes múltiples, ordena la galería, define principal, reemplaza y previsualiza antes de publicar. Administración de disponibilidad no cambia stock. Toda entrada/salida/ajuste/reserva/liberación sigue el ledger de inventario.

Importación/exportación CSV y Excel son funcionalidades planificadas. Requieren plantilla/versionado de columnas, validación previa, vista de errores por fila y confirmación transaccional; exportaciones de precio/costo requieren permisos y control de datos. No se implementan ahora.

Primera modalidad de carga: Admin descarga imágenes de fuentes cuyo uso está autorizado y sube el archivo al sistema. Importar imagen directamente desde URL, incluidos enlaces de Mercado Libre, no se asume accesible ni reutilizable: queda pendiente investigar derechos de uso, estabilidad/acceso y protección SSRF antes de diseñar una integración.

## Pipeline de imágenes (propuesta técnica)

Un servicio/adaptador de aplicación dentro del monolito recibe WEBP, JPG/JPEG y PNG desde Admin, valida firma real/MIME, dimensiones, bytes y decodificación segura antes de procesar. Los límites del producto se configuran por separado: no imponer los objetivos de 1200×1200, 400×400 y 160×160 como dimensiones obligatorias ni como límites de entrada. Son cajas de referencia para variantes principal/galería, catálogo y miniatura. Redimensionar dentro de la caja preservando aspecto, sin deformar ni recortar por defecto, no ampliar una imagen pequeña innecesariamente y previsualizar antes de publicar; si un recorte focal se agrega a futuro debe ser explícito y editable.

Producir variantes optimizadas para detalle/galería, catálogo y miniatura. Formato final se elige según origen, transparencia, peso, calidad y compatibilidad: conservar un WEBP apropiado; evaluar WebP/AVIF para derivados con fallback del navegador. Quitar EXIF/GPS/metadatos innecesarios, corregir orientación y preservar perfil de color solo cuando se requiera fidelidad. Mantener originales inmutables privados para reprocesar; generar hash SHA-256 para duplicados exactos. Detección de casi duplicados puede usar similitud perceptual, pero solo sugerir y pedir revisión humana para evitar falsos positivos.

`sharp` es candidato a procesador server-side, no dependencia aprobada; comprobar compatibilidad del runtime, consumo de CPU/memoria, licencia y dependencias transitivas (incluido libvips) antes de adoptarlo. El procesador debe ejecutarse dentro de límites seguros de tamaño/píxeles/tiempo; confirmar compatibilidad del hosting antes de producción. No usar transformación dinámica paga de Supabase como requisito.

### Storage, publicación y limpieza

Propuesta de buckets separados: `catalog-originals` privado (fuentes/revisiones, accesible a Admin autorizado) y `catalog-public` público solo para derivados de productos aprobados; usar área privada/staging para vistas previas antes de publicar. Rutas generadas por sistema con IDs estables, p. ej. `{orgId}/{productId}/{imageId}/{revision}/{role}.{format}`; no usar nombres recibidos como paths. DB registra cada asset, versión, checksum, bytes, MIME, ancho/alto, variante, status, orden y `isPrimary`; restricción garantiza principal única por producto y orden determinista.

Bucket público implica que quien tenga URL puede leer el objeto y la URL/CDN puede permanecer cacheada después de ocultar o despublicar. Solo publicar imágenes autorizadas para difusión pública; no usar el bucket para fotos privadas ni asumir revocación instantánea. Upload, reemplazo y borrado se autorizan en servidor para Admin; RLS y políticas del bucket limitan operaciones no confiables. No exponer service-role. Usar API de Storage, no borrar/editando filas en schema de Storage.

Postgres y Storage no comparten transacción. Usar ciclo de vida `pending_upload/processing/ready/failed/delete_pending`, outbox/reconciliador y operaciones idempotentes: verificar todas las variantes nuevas, actualizar referencias en DB y luego limpiar versiones previas. Para borrar, retirar referencias/estado primero y completar borrado físico con retry; alertar y listar huérfanos si queda una operación parcial. No borrar original activo antes de confirmar reemplazo. Evitar huérfanos y objetos inaccesibles que sigan ocupando cuota.

## Rendimiento del catálogo

Grillas cargan miniaturas con lazy loading, `srcset`/sizes adaptables, dimensiones/ancho/alto o aspect ratio explícito para evitar layout shift, y formatos modernos solo si el cliente los acepta. El detalle solicita variante grande al abrir/seleccionar imagen; no descargar originales en listados. Priorizar solo la primera imagen visible según viewport. Cachear por hash/revisión imágenes publicadas versionadas y recursos públicos. Nunca cachear precio, costo, sesión ni respuestas privadas de API; catálogo privado de precios debe mantenerse no-store.

## Matriz inicial de permisos

Esta es la matriz operativa propuesta para guiar el diseño; cada acción se verifica en el servidor y en el límite del caso de uso. “Propios/asignados” restringe registros al usuario autenticado. **[A]** requiere autorización expresa de un Administrador y motivo auditado, incluso si quien ejecuta la operación normalmente puede gestionar el flujo. Los permisos son denegados por defecto; ocultar botones no constituye autorización. El Administrador puede ejecutar y autorizar toda operación, pero operaciones de dinero, excepciones y reversos siempre quedan auditadas.

| Módulo / acción | Administrador | Encargado | Vendedor | Técnico | Cliente |
|---|---|---|---|---|---|
| Solicitudes públicas de acceso | Revisar, aprobar, rechazar, solicitar corrección y crear/invitar perfil tras aprobar | Ver solicitud y recomendar; no aprobar ni crear cuenta Auth | Sin acceso | Sin acceso | Sin acceso a otras solicitudes; visitante no autenticado solo puede enviar una solicitud |
| Usuarios y técnicos | Crear/editar, invitar, regenerar invitación, activar/suspender/desactivar; roles/permisos | Consultar perfiles; solicitar cambios a Admin | Consultar datos comerciales mínimos | Sin administración de cuentas | Ver/editar solo datos propios permitidos; sin cambiar estado/rol |
| Catálogo y precios | Alta/edición/publicación, precios, costos, categorías, marcas e imágenes | Alta/edición operativa y publicación según permiso; costo oculto, cambio de precio solo con permiso explícito | Consultar catálogo/precio autorizado; sin costos ni edición | Consultar repuestos/precios autorizados; sin costos | Ver ficha pública sin precio; si activo, ver precio mayorista; nunca costo |
| Clientes/proveedores | CRUD, estado, datos comerciales/fiscales; DNI solo Admin con permiso dedicado/auditoría | CRUD operativo sin DNI ni datos de identidad sensibles; no activar cuenta Auth | Crear/editar datos básicos de cliente para una venta; nunca ver DNI ni datos sensibles de identidad | Ver cliente de reparación asignada | Ver/corregir solo datos propios, incluido DNI si se llegara a recolectar; no otros clientes/proveedores |
| Inventario | Consultar, recibir, transferir, ajustar, contar, revertir movimientos [A para ajustes/reversos] | Consultar y operar recepción/transferencia; ajuste requiere [A] | Consultar disponibilidad; movimientos solo generados por venta | Consultar repuestos y disponibilidad; consumir solo desde reparación asignada | No ver cantidades exactas; solo disponibilidad comercial si se publica |
| Compras | Crear/aprobar órdenes, recepcionar, devoluciones y pagos proveedor | Crear/editar/recepcionar compras; devoluciones y correcciones [A] | Sin acceso | Sin acceso | Sin acceso |
| Ventas de mostrador / POS | Crear, editar antes de cierre, descuentos, anular/reembolsar [A] | Crear y gestionar ventas; descuentos extraordinarios/anulación [A] | Crear venta/cobro según caja; no alterar precios manuales ni reembolsar; descuento fuera de regla [A] | Consultar ventas vinculadas a reparación; no POS | Crear solo pedido propio en tienda; no editar precio/total |
| Devoluciones, cancelaciones parciales y reembolsos | Autorizar/registrar con motivo y auditoría [A]; no borrar original | Preparar solicitud; ejecutar solo tras autorización Admin | Solicitar; no autorizar ni reembolsar | Informar estado del repuesto devuelto en reparación; no aprobar reintegro | Solicitar devolución de pedido propio; sin confirmar reintegro |
| Pedidos online | Ver todos, preparar/cambiar estados, cancelar, autorizar excepción [A], historial | Ver/preparar y cambios ordinarios; cancelación solicita [A] | Consultar atención asignada, sin alterar dinero ni autorizar excepción | Sin acceso salvo pedido asociado a una reparación autorizada | Ver seguimiento propio y solicitar cancelación a Admin; no cancelar ni cambiar pago/estado |
| Pagos y acreditación | Confirmar/rechazar transferencia, registrar cobro COD, reembolsar y corregir [A auditada] | Ver pagos y conciliar; no confirmar acreditación ni reembolso; puede registrar caja según permiso | Recibir cobro de venta en caja abierta; sin confirmar transferencias ni registrar pago COD de pedido | Sin acceso | Ver estado de pago propio; iniciar pedido, sin declarar pagado |
| Entrega y despacho | Preparar/entregar, confirmar excepciones de transferencia [A] | Preparar/despachar pedido COD con pago pendiente; transferencia solo tras acreditación; excepción [A] | Ver estado y coordinar retiro según permiso; no excepción | Ver reparación asignada, no pedido de cliente | Seleccionar modalidad y dirección, ver seguimiento propio; no marcar entrega |
| Caja | Abrir/cerrar, movimientos, conciliación y ajustes [A] | Abrir/cerrar, registrar movimientos; diferencia/ajuste [A] | Operar su sesión/cobros y cierre; diferencia/ajuste [A] | Sin acceso | Sin acceso |
| Cuenta corriente | Crear cargos/créditos, pagos/aplicaciones, reversos y límites [A auditada] | Consultar/registrar cobros y aplicaciones autorizadas; crédito/reverso [A] | Ver saldo necesario para venta; no modificar | Sin acceso salvo reparación vinculada | Ver solo saldo/movimientos propios si la cuenta corriente se habilita al cliente |
| Reparaciones | Ver/gestionar todas, estados, presupuestos, autorizaciones, cargos/reversos | Gestionar flujo y asignar técnicos; excepciones/reversos [A] | Consultar estado mínimo para atención | Crear/actualizar diagnóstico, estados y repuestos de trabajos asignados; no aprobar su propio descuento/excepción | Ver seguimiento propio y aprobar presupuesto propio; no editar diagnóstico ni consumo |
| Notificaciones | Ver todas, marcar leídas, administrar reglas | Ver avisos operativos de pedidos | Avisos de ventas asignadas si se habilitan | Avisos de reparaciones asignadas | Avisos propios de pedido |
| Reportes | Todos, exportar según privacidad | Reportes operativos y de inventario; datos financieros según permiso | Ventas propias/turno y consulta de disponibilidad | Carga de trabajo asignada, sin reportes financieros | Historial propio de pedidos y reparaciones |
| Configuración, bancos y envíos | Administrar; datos bancarios solo Admin | Consultar configuraciones operativas, no secretos bancarios | Sin acceso | Sin acceso | Solo ver datos bancarios de su propio pedido confirmado por transferencia; sin cambios |
| Auditoría | Consultar/exportar; no modificar ni borrar | Sin acceso salvo reporte expresamente autorizado | Sin acceso | Sin acceso | Sin acceso |

Los códigos detallados de permiso (por ejemplo, `orders.cancel`, `payments.confirm_transfer`, `inventory.adjust`, `delivery.override_transfer_gate`) se definirán como catálogo extensible durante la etapa de acceso. No se autoriza por nombre de rol en UI; se resuelve en servidor, incluyendo pertenencia al cliente/registro y estado activo. Confirmar antes de implementar la matriz si una operación sensible asignada aquí al Administrador debe delegarse.

### Solicitud de acceso y datos personales

Visitantes pueden enviar un formulario, pero esto no crea identidad Auth, cliente aprobado, sesión ni acceso a precios. Campos iniciales propuestos: nombre y apellido, teléfono/WhatsApp, email, localidad/provincia y actividad comercial. **DNI queda excluido del formulario inicial** hasta que el propietario documente y apruebe su necesidad legal, operativa o comercial. Admin revisa manualmente y puede aprobar, rechazar o pedir correcciones; Encargado puede revisar/recomendar, pero la decisión la toma Admin. La invitación se genera solo tras aprobación; Admin copia el enlace de un solo uso y lo envía manualmente por WhatsApp.

El formato de teléfono aprobado es exactamente diez dígitos nacionales: sin +54, cero inicial, 15, espacios ni separadores; código de área incluido (por ejemplo `2234567890`). Aceptar dígitos y longitud no basta: validar que el número sea posible/válido para Argentina contra metadatos actualizados del Plan Fundamental de Numeración Nacional. `libphonenumber-js` es candidato de biblioteca TypeScript; verificar mantenimiento, licencia, cobertura argentina y versión al implementarlo. Validar formato sintáctico y validez de numeración por separado de la titularidad: no inferir titularidad por un número válido. OTP por SMS/WhatsApp queda sujeto a decisión de proveedor y costo.

Normalizar email con política coherente en frontend y servidor (trim, dominio IDNA/case-folded; conservar reglas del local-part, sin quitar puntos ni etiquetas `+`), detectar duplicados en solicitudes abiertas y contra cuentas/clientes antes de aprobación, y reforzar con restricciones transaccionales/índices apropiados en DB. Mostrar errores específicos sin revelar si un email está registrado públicamente.

Como el formulario no requiere sesión, validar todo en servidor, limitar frecuencia/tamaño, proteger contra abuso automatizado y evitar enumeración de clientes. Preferir mitigación propia y no añadir CAPTCHA o servicio externo pago sin autorización; definir política de IP/logs minimizando retención de datos.

DNI, teléfono, email, identidad, entrega y facturación son datos personales. Separar los datos de identidad del snapshot de entrega y de facturación. Restringir el acceso interno a DNI a Admin con permiso dedicado; el titular solo podrá acceder a sus propios datos mediante un flujo autorizado si llegaran a recolectarse. Ocultarlo en pantallas/listados generales y excluirlo de público, logs, telemetría y notificaciones. Auditar toda lectura/modificación de DNI y cambios sensibles. Minimizar recolección, definir propósito, acceso y retención/eliminación antes de producción; confirmar obligaciones de Ley 25.326 con asesoramiento legal. Solicitudes de acceso y datos de contacto tienen acceso mínimo y auditoría.

## Acceso de técnicos y privacidad

No hay registro público. El visitante solicita acceso por WhatsApp; un Administrador aprueba la solicitud, crea el perfil y la identidad de Supabase Auth. El sistema genera una invitación de un solo uso válida 24 horas y el técnico establece su contraseña al aceptarla. Si vence, Admin genera otra invitación. Nunca se guardan ni envían contraseñas en texto plano. El enlace es un secreto bearer: se muestra una sola vez para que Admin lo copie y lo envíe manualmente por WhatsApp; excluirlo de logs, auditoría técnica y analytics, y limitar el redirect. Supabase Auth comparte el ajuste Email OTP Expiration con otros enlaces OTP; verificar que soporte 24 horas y evaluar el efecto sobre recuperación de contraseña antes de configurar. No cambiar ajustes globales sin ese análisis.

El usuario interno mantiene `active/suspended/disabled` y el estado se verifica en servidor en cada operación privada (precio, carrito, checkout, historial). Suspender/desactivar revoca o invalida sesión según el flujo Auth elegido y bloquea acceso incluso ante claims antiguos. Supabase Auth gestiona credenciales; jamás guardar contraseña en la base propia.

## Protección de precios y datos

Separar lecturas públicas de privadas con consultas y DTOs distintos. La consulta pública selecciona explícitamente campos de marketing y no incluye precio, costo, stock exacto ni metadatos comerciales. Nunca serializar el objeto Prisma completo. Aplicar esto a JSON, HTML/RSC, metadatos, búsqueda, logs y payloads del service worker. Respuestas privadas usan `Cache-Control: private, no-store`; permisos se verifican al pedir el dato en el servidor. El precio y total se calculan/validan en servidor al agregar/revisar/confirmar pedido; se ignoran importes enviados por el navegador.

Prisma opera desde servidor con credencial de base privada. Si la conexión usa un rol que evita RLS, la seguridad depende obligatoriamente de autorización de aplicación en todos los casos de uso; RLS es una capa adicional donde sea compatible. Nunca exponer service role ni secretos. Mantener Auth admin API solo del lado servidor. Storage público se limita a imágenes de catálogo aprobadas; documentos y archivos privados se sirven con autorización y URL firmada.

## PWA y caché

La tienda se diseña mobile-first, responsive, instalable, con manifest, iconos, pantalla de inicio, shell offline limitado, buscador, catálogo, carrito y seguimiento. El Admin prioriza escritorio y admite operaciones básicas desde móvil.

Service Worker cachea únicamente shell y recursos estáticos públicos, además de contenido de catálogo explícitamente público y sin precio si se define su estrategia. No cachea API privada, precios, sesión, datos personales, carrito persistente con información sensible, pedido, datos bancarios ni respuestas autenticadas. Las páginas/API privadas no-store y con validación de sesión fresca. Al logout/vencimiento se limpia cualquier almacén local privado, se invalida la UI y se requiere red/autenticación para volver a consultar. Nunca se promete disponibilidad offline de información privada; push queda como mejora futura tras analizar compatibilidad y costos.

## Operaciones comerciales e integridad

PostgreSQL es fuente de verdad. Stock no negativo y cada ajuste de balance se acompaña de movimiento histórico dentro de la misma transacción. Se mantiene ledger append-only y balance de lectura transaccionalizable con bloqueo o concurrencia optimista; movimiento tiene clave de origen e idempotencia. Reservas y liberaciones también son movimientos tipados.

Al confirmar un pedido, Admin muestra un indicador de no leídos. La notificación enlaza al pedido y presenta número, fecha/hora, cliente y contacto, productos/cantidades/precios, total, pago, entrega, dirección si aplica y observaciones. El detalle se carga desde el pedido con autorización Admin; no se duplica información sensible innecesariamente en la notificación.

### Reserva, vencimiento y permisos de entrega

Al confirmar una orden con transferencia, una transacción reserva unidades disponibles y persiste `payment_deadline_at`, calculado con la duración configurada en Admin (24 horas iniciales). La duración se copia al pedido; los cambios de configuración solo afectan órdenes nuevas. Hasta acreditar el pago, el pedido no puede entregarse ni despacharse. Un proceso programado y autenticado busca pedidos vencidos sin acreditación confirmada y los cancela automáticamente.

Al cancelar pedido vencido: condición atómica verifica que sigue sin acreditación confirmada antes del deadline, es transferencia y venció; cambia estado una sola vez, agrega historial/auditoría, libera reserva con movimiento único y actualiza notificación. Admin solo puede registrar acreditación dentro del plazo; después se rechaza esa transición normal aunque el job aún no haya corrido. Reintentos y carreras no duplican liberación ni cancelan un pago acreditado oportunamente. Si vence primero, un pago posterior se marca para conciliación manual (reembolso/crédito) y no reactiva reserva automáticamente.

Con efectivo contra reembolso, el estado del pago sigue pendiente hasta que Admin registra cobro. Retiro se cobra al retirar y envío al recibir; el flujo permite preparar, marcar listo y despachar sin acreditación previa. Admin puede cancelar y se libera la reserva si aún no se entregó. Para cualquier pedido de transferencia, solo pago acreditado habilita retiro/entrega/despacho. Una excepción requiere acción explícita de Administrador, motivo obligatorio y evento de auditoría; nunca es un cambio silencioso. Las transiciones se validan en servidor y no desde el cliente.

La cancelación automática necesita un scheduler que ejecute con frecuencia y monitorice fallos. No asumir Vercel Hobby: además de ser no comercial para producción, su cron solo corre una vez por día y su ventana horaria es imprecisa. Supabase Cron/pg_cron es candidato técnico (permite intervalos menores), pero plan, disponibilidad, continuidad, monitorización y uso comercial deben verificarse antes de adoptarlo. El trabajo debe procesar vencidos en lotes, con reintentos e idempotencia; si el scheduler está atrasado, cancelar tan pronto vuelva a correr y alertar a Admin.

Cualquier mecanismo elegido debe tener disponibilidad y límites verificados para el plan autorizado y uso comercial; ejecución fiable/observable; logs de error, alertas y reintentos; autenticación/secreto protegido; lotes idempotentes; protección contra solapamiento (claim/lease o lock y transición atómica en DB); detección de deadlines vencidos no procesados y recuperación tras interrupción. Scheduler solo inicia casos de uso protegidos; no expone una ruta pública capaz de mutar pedidos. No seleccionar ni activar un servicio pago sin autorización.

### Pagos tardíos, retiros e incidencias

Una transferencia recibida después de cancelar se registra ligada al pedido original en un caso de conciliación manual. No cambia el estado del pedido cancelado ni crea reserva. Admin decide y audita si devuelve el dinero o crea un pedido nuevo; nunca reabrir automáticamente la orden original. La nueva orden tiene su propia disponibilidad, precio snapshot y reserva.

Un COD no entregado registra una incidencia de entrega enlazada al pedido, con motivo, actor, fechas, intentos y resolución. Admin decide reintento, devolución del paquete o cancelación; no se libera stock por el solo fallo de entrega. Para pedidos listos para retirar, mantener estado `ready_for_pickup` y reserva sin expiración automática. Crear aviso interno al pasar a listo para retirar y mantenerlo visible/pendiente hasta retiro o resolución manual. Si se agregan recordatorios por antigüedad, el umbral se configura aparte y no cancela ni libera stock.

### Devoluciones y cancelaciones parciales

Venta/pedido original nunca se elimina ni se reescribe destructivamente. Devolución parcial crea documento con líneas, cantidades, importes, motivo, usuario y fecha. Reembolso es una operación financiera separada vinculada al pago original y requiere autorización Admin con motivo obligatorio. Cancelación parcial crea reversos/ajustes enlazados a las líneas y genera eventos compensatorios para inventario y cuentas; mantiene auditoría e historia original. Inspección devuelve primero el bien a estado en revisión/cuarentena; un Admin/rol autorizado confirma si es apto para venta y solo entonces se agrega movimiento que incrementa stock disponible. Artículos no aptos no se reincorporan al disponible.

Pedido, pago y entrega son estados separados. Confirmar cualquier pedido crea snapshots, notificación interna y reserva de stock; si algún paso falla, no queda estado parcial. Pagos manuales generan registros inmutables con actor y fecha. Cambios de precios no alteran snapshots. Cancelaciones/devoluciones liberan reservas/existencias con movimientos compensatorios, nunca borrando originales. Cuentas corrientes se calculan desde movimientos, no desde deuda editable.

## Costos, despliegue y continuidad

Desarrollar y verificar localmente primero. Entornos de desarrollo/preview/producción con credenciales separadas. Migraciones versionadas y aplicadas en forma controlada. No habilitar gasto por uso. Vercel Hobby es no comercial, así que el destino de producción de tienda requiere una alternativa autorizada compatible o presupuesto aprobado. Supabase Free tiene límites y no ofrece backups automáticos; acordar respaldo, recuperación y operación antes de datos reales. Mantener adaptadores y configuración portable dentro del stack aprobado.
