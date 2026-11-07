# Diseño inicial de base de datos

Propuesta conceptual; no es esquema Prisma ni migración aprobada. PostgreSQL en Supabase es la fuente de verdad. IDs UUID; relaciones e índices explícitos; timestamps `timestamptz` en UTC; ARS como moneda inicial; importes `numeric(18,2)` con código de moneda; cantidades `numeric` con escala/unidad definida. Rechazar operaciones que lleven stock debajo de cero.

## Entidades propuestas

| Área | Entidades | Campos y relaciones clave |
|---|---|---|
| Organización | `Organization`, `Branch`, `Warehouse` | Una organización, sucursal y depósito al inicio; todas las entidades comerciales relevantes acotadas por `organization_id`, y stock por depósito para permitir expansión. |
| Acceso | `UserProfile`, `Role`, `Permission`, `UserRole`, `RolePermission`, `UserInvitation` | `auth_user_id` vinculado a `auth.users`; estado active/suspended/disabled y cliente asociado. `UserInvitation` guarda actor, emitida/vencimiento/aceptación/revocación, nunca token ni contraseña. TTL 24 h; nueva invitación revoca la previa. |
| Solicitudes de acceso | `AccessRequest`, `AccessRequestHistory` | Registro público pendiente de revisión, sin crear Auth. Nombre, email normalizado, teléfono argentino nacional, localidad/provincia y actividad; estado pending/needs_correction/approved/rejected y acciones/revisor/fechas. DNI excluido hasta justificar y aprobar su recolección. |
| Catálogo | `Product`, `Category`, `Brand`, `ProductCategory`, `ProductCompatibility`, `ProductAssociation`, `ProductImage`, `ImageAsset`, `ImageVariant` | Título/descripción, SKU único, barcode opcional, marca, categoría/subcategoría, compatibilidades/modelos, precio/costo privados, publicación, disponibilidad comercial, destacado, relaciones con productos, galería ordenada e imagen principal. Unidad/mínimo de stock; cantidad solo desde Inventario. Asset referencia original privado y variantes con checksum, revisión, MIME, bytes, dimensiones, uso, Storage key y estado. |
| Medios | `ImageProcessingJob` (o outbox) | Estado pending/processing/ready/failed/delete_pending, intentos, error no sensible, hash, versión de receta y fechas. Coordina la transacción Prisma con Storage, limpieza/reintentos y reconciliación de huérfanos. |
| Inventario | `InventoryBalance`, `StockMovement`, `StockReservation` | Balance por producto/depósito con existencias físicas y unidades reservadas; ledger con tipo, delta, origen, actor, fecha, idempotency key y reverso. Reserva por pedido con cantidad, status y liberación/consumo únicos. Disponible = físico − reservado ≥ 0. |
| Terceros | `Customer`, `CustomerIdentity`, `CustomerContact`, `BillingProfile`, `Supplier` | Identidad y contacto separados de dirección de entrega por pedido y perfil/datos fiscales de facturación. DNI nullable y no recolectado por defecto; acceso restringido. Customer enlaza opcionalmente a UserProfile. |
| Compras | `Purchase`, `PurchaseLine`, `SupplierPayment` | Documento y líneas con SKU/descripción/costo snapshot; recepciones crean movimientos positivos, incluida recepción parcial si se habilita. |
| Ventas | `Sale`, `SaleLine`, `Payment`, `PaymentApplication` | Cabecera/ítems snapshot; pago separado de estado de orden; fuente POS/online/reparación; aplicación identifica importe por documento. |
| Pedido online | `OnlineOrder`, `OnlineOrderLine`, `OrderStatusHistory`, `OrderDelivery`, `OrderPolicySetting` | Cliente/técnico, número, status, payment status independiente, delivery method/status, snapshots de líneas/datos de entrega e importes ARS congelados. `payment_deadline_at` por pedido. Configuración versionada de Admin define vencimiento default (24 h para transferencia); se captura al crear. Sin dirección si retira. |
| Transferencia | `StorePaymentSettings` (o tabla de configuración versionada), `Payment` | Datos bancarios privados; pedido referencia la versión/instantánea pertinente. Solo se muestran al cliente dueño tras pedido confirmado con transferencia. Nunca desde endpoint público. |
| Pagos tardíos | `LatePaymentReconciliation` | Recibo tardío enlazado al pedido cancelado, importe/moneda/referencia/fecha, estado pending/refunded/applied_to_new_order, actor de resolución y pedido nuevo asociado opcional. No cambia el pedido original ni reserva stock. |
| Incidencia de entrega | `DeliveryIncident`, `DeliveryIncidentHistory` | Pedido/envío, motivo no entregado, intentos, fechas, actor, estado y decisión Admin: reintentar, devolver o cancelar. La incidencia no libera stock por sí sola. |
| Retiro pendiente | `AdminNotification` | Aviso persistente al pasar a `ready_for_pickup`; se mantiene hasta retiro o resolución. Puede añadirse recordatorio de antigüedad configurable, pero nunca vencimiento ni liberación automática de stock. |
| Notificaciones | `AdminNotification` | Tipo/fecha/destinatarios/leído; nuevas compras, retiro pendiente, incidencia y conciliación. Insertar idempotentemente; enlazar al pedido/incidencia/conciliación y cargar detalle según autorización, sin duplicar datos sensibles. |
| Devoluciones y reembolsos | `Return`, `ReturnLine`, `Refund`, `FinancialAdjustment` | Documentos separados e inmutables con cantidades/importes/motivo/actor/fecha; reembolso ligado al Payment original; ajustes parciales enlazan líneas, pedido/venta y asientos compensatorios. Estado de inspección antes de permitir retorno a inventario vendible. |
| Cuenta corriente | `AccountEntry`, `AccountApplication` | Cargo/crédito inmutable por cliente, moneda y documento origen; aplicaciones de pagos y reversos. Saldo derivado por suma, nunca columna editable de deuda. |
| Caja | `CashRegister`, `CashSession`, `CashMovement` | Apertura/cierre, ingresos/egresos, usuario, medio de pago, referencias a pagos y documentos. |
| Reparación | `Repair`, `RepairStatusHistory`, `RepairPart` | Cliente, equipo/identificadores mínimos, diagnóstico, presupuesto, autorización, estados; pieza enlaza movimiento de inventario. |
| Auditoría | `AuditEvent` | Actor, acción, entidad, id, timestamp, request/correlation id, motivo y metadatos no sensibles. No guardar contraseñas, tokens ni datos bancarios completos innecesarios. |

## Catálogo y activos de imagen

### Producto

`Product` contempla `title`, `description`, `sku` único, `barcode` opcional, `brand_id`, `category_id` (categoría o subcategoría), datos/atributos, compatibilidades vía relación, `publication_status` (propuesta: draft/published/hidden/deactivated), `commercial_availability` separado del inventario (semántica/valores pendientes), flag/rank de destacado, unidad y mínimo de stock. Precio y costo se restringen por autorización; disponibilidad pública no expone cantidad exacta ni permite editar stock. Categoría usa `parent_id` o jerarquía equivalente. SKU es único por organización; barcode puede ser nulo y su unicidad se decidirá según uso. `ProductAssociation` enlaza productos relacionados para merchandising, separado de compatibilidad técnica.

La consulta pública selecciona allowlist de campos de marketing y assets publicados, excluyendo siempre precio, costo, cantidad exacta, datos internos y atributos no autorizados. La página de detalle, búsqueda, filtros, orden, destacados/relacionados y carrito aplican la misma separación. Acciones de precio y carrito requieren sesión activa verificada en servidor; no confiar en estado enviado por cliente. Las cantidades de inventario se administran desde el módulo de movimientos, nunca como campo editable de producto.

### Imagen y variantes

`ProductImage` enlaza producto, `ImageAsset` fuente original privada, orden, texto alternativo opcional, estado y marca principal. Una regla única por producto permite como máximo una imagen principal; reordenamiento produce orden estable. Reemplazos crean una revisión nueva y no alteran original histórico. `ImageVariant` registra asset, revisión, uso (`detail/gallery`, `catalog`, `thumbnail`), formato, ancho/alto real, bytes, hash y storage key. `ImageProcessingJob`/outbox controla el flujo y errores/reintentos.

Objetivos iniciales de salida son 1200×1200 principal/galería, 400×400 catálogo, 160×160 miniatura, como **dimensiones de referencia**, no límites obligatorios ni obligación de cuadrar. Cada variante se contiene dentro de su caja sin estirar ni recortar; respetar aspecto, no hacer upscale innecesario y conservar márgenes/transparencia cuando aplique. Entrada aceptada WEBP/JPG/PNG; validar firma del contenido, MIME, bytes, ancho/alto, megapíxeles, decodificación completa y límites configurados. Umbrales de carga exactos se deben definir; no convertir el máximo de Supabase en política de producto ni interpretar los tamaños guía como máximo de upload.

Normalizar orientación antes de quitar EXIF/GPS u otra metadata innecesaria. Guardar original sin modificar en bucket privado para reprocesar; derivados no conservan metadatos privados. Hash SHA-256 exacto detecta mismos bytes; imágenes recodificadas/parecidas pueden sugerirse con hash perceptual sujeto a revisión humana. Mantener salida original si WEBP ya es apropiado; evaluar WebP/AVIF para derivados con fallback y pruebas reales de calidad/compatibilidad. No asumir conversión universal a WebP/AVIF.

Rutas recomendadas (no nombre original): `catalog-originals/{orgId}/{productId}/{imageId}/{revision}/source.{ext}` y `catalog-public/{orgId}/{productId}/{imageId}/{revision}/{role}.{format}`. Originales y previews de borrador son privados; solo derivados aprobados/publicados quedan en bucket público. Storage path se registra en DB y se genera con IDs propios. Límite, política RLS, mime-types permitidos y tamaño por bucket son configurables; upload/delete solo Admin por aplicación/API Storage. Supabase recomienda operar objetos mediante su API; no mutar `storage.objects` directamente en SQL.

Supabase Storage tiene cuota Free publicada de 1 GB y tamaño máximo global de archivo de 50 MB en ese plan; Image Transformations no está disponible en Free (Pro+ en tarifa publicada). Estos valores cambian y no sustituyen la política interna de upload. Por política de costos, no depender de transformación gestionada ni activar overages/plan pago. Diseñar procesamiento estático en el servidor de la misma aplicación, con procesador Open Source compatible, luego almacenar variantes; verificar límites de runtime y almacenamiento antes de producción. El catálogo público ocupa cuota y egreso; dimensionar y monitorizar uso.

Una URL de bucket público puede seguir accesible por CDN/caché después de ocultar un producto; no almacenar ahí material sensible ni prometer revocación instantánea. En unpublish, quitar de consultas públicas, invalidar referencias de app y programar limpieza/versionado; confirmar límites de cache TTL.

Storage y PostgreSQL no tienen transacción distribuida. Subir a staging, verificar output/hash y registrar estado en DB; hacer publish atomicamente en DB y después copiar/promover versiones públicas; borrar/reemplazar con job idempotente, retry y reconciliador periódico de referencias/objetos. No quitar el objeto anterior hasta confirmar reemplazo. Borrado de producto o imagen actualiza primero el estado/referencias y limpia físicos con estado `delete_pending`; no dejar objetos huérfanos ni eliminar metadatos Storage vía SQL.

La primera carga es por archivos descargados de fuente autorizada y subidos desde Admin. Importar imágenes por URL externa (incluyendo Mercado Libre) queda pendiente de investigación de acceso, derechos de uso, fiabilidad de URL y mitigación SSRF; no hacer fetching automático ahora.

CSV/Excel de catálogo queda planificado. Prever validación de plantilla/version, SKU y referencias, simulación y reporte por fila antes de confirmar lote; importación no actualiza existencias salvo movimiento de inventario explícito. Exportar precio/costo solo para roles autorizados; proteger CSV frente a fórmulas ejecutables en hojas de cálculo. Decidir formatos/mapeo/límites y estrategia sin añadir dependencias hasta aprobación.

### Entrega eficiente

Grillas utilizan variante miniatura y lazy loading, con width/height explícitos o aspect ratio; detalle solicita variante mayor al abrir imagen/galería. Adaptar `srcset` al viewport/dispositivo, no descargar originales en listados y priorizar solo contenido visible. Cachear por key versionada/hash solo assets publicados. No cachear precio ni datos privados; private API y páginas de precio permanecen `no-store` incluso si las imágenes del producto son públicas.

## Estados de pedido, pago y entrega

Mantener dimensiones independientes:

- Pedido: `received`, `preparing`, `ready_for_pickup`, `in_transit`, `delivered`, `cancelled`.
- Pago: `pending`, `credited`, `rejected`, `refunded`.
- Entrega/modalidad: `pickup` o `home_delivery`; dirección/paquete y cumplimiento correspondiente.

Validar transiciones en aplicación y guardar historial. `pickup` no admite `in_transit`; `home_delivery` necesita destinatario, teléfono, dirección y localidad. La dirección se omite si hay retiro. El método de pago es `bank_transfer` o `cash_on_delivery` y no equivale al estado del pago. Nombres de enum definitivos a normalizar en implementación.

La conciliación de fondos tardíos mantiene estado propio (pending/refunded/applied_to_new_order) en registro separado del pedido cancelado. Un COD no entregado crea `DeliveryIncident`, sin cambiar a la fuerza el pedido ni liberar stock; Admin elige reintento, devolución o cancelación. Una orden acreditada en `ready_for_pickup` conserva reserva hasta retiro o resolución administrativa, sin auto-liberación. Generar aviso interno persistente al quedar lista y mantenerlo abierto hasta cierre.

## Formulario y validación de solicitud de acceso

Campos de `AccessRequest`: nombre, apellido, teléfono nacional AR de diez dígitos, email, localidad, provincia, actividad comercial, estado y timestamps. DNI no se incluye en el formulario ni se almacena hasta justificar su necesidad y obtener aprobación del propietario. En cuanto a teléfono, una restricción de formato puede exigir `^[1-9][0-9]{9}$` sin espacios, `+54`, prefijo `0` ni `15`; esto solo valida representación. El servidor valida posibilidad/validez contra metadatos actuales del plan argentino; la titularidad requiere verificación independiente y no se da por demostrada.

Normalizar email coherentemente (trim, dominio IDNA y lowercase; no normalizar eliminando puntos o `+tag`), validar en cliente y servidor, detectar duplicados de solicitudes abiertas y cuentas/clientes antes de aprobar. Reforzar con restricciones únicas apropiadas y transacción para evitar carreras; errores específicos no deben permitir enumerar cuentas públicas. No aprobar solicitud crea una cuenta automáticamente: la aprobación Admin inicia flujo Auth separado.

## Flujos transaccionales

### Pedido online y reserva

Servidor autentica técnico, revisa estado activo y vuelve a consultar catálogo/precios. En una transacción con idempotencia: validar cantidades y disponibilidad; bloquear/actualizar balance para reservar unidades disponibles (para transferencia y contra reembolso); persistir pedido y líneas snapshot (SKU, descripción, cantidad, precio, descuentos, subtotales, total, moneda); capturar cliente y entrega; estado inicial recibido/pago pendiente; guardar método; para transferencia, guardar `payment_deadline_at = created_at + duración configurada` y vincular configuración bancaria privada aplicable; crear reserva(s) únicas y notificación interna persistente. Fallar todo el conjunto si un paso crítico falla. El precio que manda navegador nunca es fuente de verdad. Configurar una duración inicial de 24 horas. El ajuste del panel aplica a pedidos nuevos; el deadline existente no se modifica por cambios posteriores de política.

La reserva se mantiene hasta entrega/retiro, cancelación o expiración. Para COD no hay cancelación automática por falta de pago; Admin la decide. Entrega/retirada convierte reserva a salida física en transacción. Cancelar libera unidades reservadas una sola vez mediante movimiento compensatorio ligado a la reserva. No eliminar pedido ni movimientos originales.

### Vencimiento automático de transferencia

Un job autenticado y recurrente toma órdenes de transferencia no canceladas ni entregadas, con deadline vencido y sin acreditación confirmada antes de ese deadline (pago pendiente o rechazado). Para cada orden, en transacción serializable o con bloqueo de fila: vuelve a verificar condiciones, intenta transición condicional a `cancelled`, registra historia y auditoría, libera cada reserva aún activa una sola vez y notifica al administrador. Admin solo puede confirmar acreditación antes del deadline; vencido el plazo, rechazar esa transición normal aunque el job aún no haya corrido. Una clave única por orden/reserva y transiciones monotónicas hacen los reintentos seguros. Si vence primero, un pago posterior entra a conciliación (reembolso/crédito manual), sin resucitar el pedido ni re-reservar stock automáticamente. Job debe ser observable y reintentable; vencidos pendientes de procesamiento se cancelan al recuperarse el scheduler.

### Confirmación manual de pago

Solo Administrador confirma transferencia acreditada y registra cobro COD, con actor, hora, importe, moneda y referencia/observación. El estado de pago sigue pendiente hasta el registro manual. En COD, retiro cobra al retirar y envío cobra al recibir; permite preparación/despacho con pago pendiente. La entrega reduce existencias físicas contra la reserva; registrar el pago es operación independiente e idempotente. Una venta por transferencia no puede entregarse ni despacharse antes de acreditar, salvo autorización Admin explícita con motivo y auditoría. La excepción no altera el estado del pago ni lo convierte en acreditado. Confirmar reembolso/reverso con permisos Admin y auditoría.

### Inventario

Dentro de transacción: validar autorización y documento origen, asegurar balance (bloqueo de fila o control optimista con reintento), comprobar nuevo saldo ≥ 0, actualizar proyección y agregar movimiento tipado con actor, motivo, origen e idempotencia. Confirmar ambos o ninguno. Los saldos se reconcilian/reconstruyen desde el ledger. No existe operación de edición directa.

### Cuenta corriente

Insertar cargo/crédito histórico ligado a documento; aplicaciones asignan cobro a uno o más cargos. Reversiones agregan entradas compensatorias vinculadas. Consultas calculan saldo por cliente y moneda desde el ledger; proyección opcional debe poder reconciliarse.

## Privacidad, índices y restricciones

- El endpoint público del catálogo debe tener consulta/DTO sin precio ni costo; no serializar modelos completos. Toda consulta privada filtra por organización/cliente y autorización.
- Índices únicos para SKU según tenant/organización, número de pedido y claves idempotentes; índices en estado, fecha, cliente, producto y depósito según consultas.
- FK restrictivas para documentos contabilizados. No borrar registros financieros o ledger; usar estado/anulación y conservar snapshots.
- Cifrar conexiones, almacenar secretos fuera de DB de dominio; separar buckets públicos de privados y conceder acceso a privados con URL firmada de corta duración.
- Definir retención de órdenes, clientes, reparaciones y auditoría con criterio legal/comercial antes de producción.
- Separar identidad, contacto, entrega y facturación en entidades/perfiles; `OrderDelivery` contiene snapshot del destino del pedido. Limitar DNI a permiso dedicado/Admin, enmascarar vistas generales, no registrar valor en logs/telemetría/notificaciones, y auditar lectura/cambio sensible. No recopilar DNI sin propósito aprobado; definir retención, acceso, corrección y eliminación conforme a la legislación aplicable.
- Las restricciones de base ayudan a unicidad de email/teléfono cuando proceda; validez de rangos telefónicos requiere metadata actualizada en servidor, no solo `CHECK` por longitud.

## Decisiones pendientes antes del esquema final

Elegir y verificar scheduler (plan, uso comercial, frecuencia, observabilidad y coste); validar TTL real de 24 h de Supabase Auth sin alterar configuración global hasta revisar su efecto en otros OTP; decidir justificación/retención legal del DNI (mientras tanto no se pide); límites del ajuste administrativo de vencimiento y recordatorios de retiro; reglas de costos, fiscalidad y retención legal general. Elegir la biblioteca/versión de validación telefónica tras revisar mantenimiento y licencia.
