# Compras V1 — contrato aprobado

Estado: Compras V1 implementado y migración `20261112010000_add_purchases` aplicada posteriormente a milo_dev mediante Prisma Migrate con autorización y respaldo verificado, en la tarea anterior. D-049 reorganiza el módulo y prepara una octava migración exclusivamente aislada, sin desplegarla a milo_dev: ver [PURCHASES_MODULE_RESTRUCTURE.md](PURCHASES_MODULE_RESTRUCTURE.md). Las instrucciones de aislamiento/despliegue de las secciones originales describen la preparación histórica de V1.

## Relevamiento

- Rama `main`, con cambios anteriores pendientes que deben conservarse. Sin commits ni pushes.
- Prisma tiene Supplier, Product, ProductPresentation, Branch, StockBalance, StockMovement y AuditEvent, pero no Purchase ni PurchaseLine.
- Una consulta de metadatos en una transacción PostgreSQL de solo lectura confirmó que no existen tablas de compras ni FKs entrantes hacia Supplier. Las seis migraciones existentes están aplicadas. No se leyeron fichas personales ni se modificaron registros.
- `StockMovement.sourceOrderId` pertenece a WholesaleOrder: no reutilizarlo para compras.
- Inventario manual recibe cantidades enteras positivas en la unidad base del producto. Las presentaciones tienen factores, pero el servicio actual no implementa ingresos fraccionarios ni conversiones. Compras V1 mantiene ese límite explícito.
- Los escritores de inventario bloquean Product antes de leer/modificar saldos y movimientos. StockMovement es inmutable; el stock no puede ser negativo. Reutilizar esos contratos, no llamar al servicio de ingreso manual una vez por renglón en transacciones independientes.
- El borrado de proveedores deniega actualmente cualquier FK entrante desconocida. La incorporación de compras requiere revisar ese control para admitir exclusivamente la nueva relación conocida y bloquear proveedores realmente referenciados.

## Reglas aprobadas

1. Solo OWNER/ADMIN con asignación COMPANY válida pueden consultar compras y costos, crear/editar borradores y confirmar recepciones de su empresa, en cualquiera de sus sucursales. No extender automáticamente los permisos de inventario de Depósito o Encargado a compras/costos.
2. Dos estados: BORRADOR y RECIBIDA. Recepción completa, una única vez. No hay recepción parcial, cancelación, devolución, nota de crédito, eliminación de compras ni reversión de stock en esta versión.
3. Moneda ARS explícita. Costos unitarios no negativos con hasta dos decimales; cero se permite únicamente si fue ingresado expresamente. Vacío no es cero. Cantidades enteras positivas en unidad base; no convertir presentaciones ni aceptar fracciones todavía.
4. Fecha comercial obligatoria como fecha calendario, inicialmente la fecha local argentina; fecha/hora efectiva de recepción y usuario receptor se registran por separado en servidor. Referencia libre opcional del comprobante real del proveedor, sin atribuirle tipo o validez fiscal.
5. Código interno por empresa `CP000001`, secuencia atómica, inmutable y no reutilizable. No es número de factura ni comprobante fiscal.
6. Entre 1 y 100 renglones por compra. Un producto puede aparecer varias veces con costos distintos; cada renglón conserva su costo y genera su propio movimiento. Bloquear cada producto una sola vez y acumular sus cantidades para actualizar el saldo.
7. Una compra recibida queda inmutable. Para cambios posteriores de stock se necesita otro flujo aprobado; no ofrecer un botón que borre historia o revierta movimientos.

## Modelo y migración preparada

Agregar PurchaseCounter, Purchase y PurchaseLine. Mantener las seis migraciones anteriores intactas. Preparar una séptima migración revisable, sin ejecutar sobre `milo_dev`.

### Purchase

- UUID, tenantId obligatorio, número interno único por tenant, estado y versión de concurrencia.
- Supplier y Branch del mismo tenant mediante FKs compuestas RESTRICT.
- Fecha comercial, moneda ARS, referencia opcional de hasta 200 caracteres y observaciones opcionales de hasta 2.000 caracteres.
- Total Decimal(18,2), calculado por el servidor desde los renglones.
- Creador, receptor opcional, timestamps de creación/actualización y recepción; actores del mismo tenant con FKs compuestas.
- Identificador estable de operación para alta y recepción y huella canónica de la solicitud para distinguir reintento de contenido diferente. No almacenar datos privados en logs.
- Snapshot mínimo del código/nombre del proveedor al recibir, para que editar la ficha no reescriba el documento histórico. No copiar contactos o datos fiscales innecesarios.

### PurchaseLine

- UUID, tenantId, purchaseId, branchId, productId y posición estable.
- Snapshot de SKU, nombre y unidad base; cantidad Decimal(18,3), limitada a enteros positivos en V1; costo unitario y subtotal Decimal(18,2).
- FKs compuestas que impidan cruzar empresas, sucursales o productos. Restricciones de valores finitos, rangos y consistencia de subtotal.
- Proteger la identidad/unidad base del producto cuando tenga renglones de compra, siguiendo la protección histórica existente de inventario. Las nuevas restricciones no cambian productos ni sus unidades existentes.

### Vínculo con inventario

- Agregar a StockMovement una referencia opcional a PurchaseLine, con FK compuesta que incluya tenant, sucursal y producto, y unicidad para impedir más de un movimiento por renglón.
- Tipo de movimiento de recepción de compra con cantidad estrictamente positiva. Los movimientos antiguos conservan su contenido y tienen la nueva referencia en null.
- Mantener los triggers de bloqueo de Product y la prohibición de editar/borrar movimientos. Proteger documentos recibidos y coherencia de sus vínculos al cierre transaccional.
- Sin cascadas sobre compras, movimientos, saldos, proveedores ni auditorías. No reinterpretar referencias históricas libres.
- Ajustar la comprobación de borrado de proveedores: cualquier compra, incluso borrador, impide eliminar su proveedor; sin compras puede conservarse el borrado actual. Ante FKs desconocidas, seguir denegando. Probar también la carrera entre borrado e incorporación de una compra.

## Persistencia y concurrencia

- Resolver sesión, perfil, tenant y permisos en servidor en cada lectura y escritura. Revalidar membresía dentro de la transacción, también después de esperar bloqueos.
- Validar con Zod estricto todos los campos y el límite de renglones. El navegador aporta IDs seleccionados, nunca tenant, actor o permisos confiables. Verificar proveedor, sucursal y productos contra el tenant autenticado.
- Guardar borrador persiste documento, renglones, total y auditoría en una transacción; no crea movimientos ni inicializa/modifica StockBalance.
- Editar borrador exige versión vigente. Un conflicto conserva el formulario y solicita recargar; no sobrescribir ni reintentar escrituras automáticamente.
- Confirmar exige confirmación explícita, versión vigente y un ID estable de recepción. Bloquear el documento y luego todos sus productos en orden `(tenantId,id)` antes de consultar cantidades. Revalidar unidades, importes y pertenencia.
- Una sola transacción de recepción recalcula y conserva el documento/renglones definitivos, crea movimientos, incrementa/crea saldos, marca RECIBIDA y registra auditoría. Cualquier fallo, incluida auditoría, revierte todo.
- El bloqueo del documento, la transición única de estado y la unicidad por renglón impiden doble stock. Repetir la misma operación y contenido devuelve la recepción existente; reutilizar su ID con contenido distinto es conflicto. Otra confirmación de un documento recibido informa que ya fue recibido, sin escribir.
- Si la conexión se pierde después de confirmar, reconciliar por IDs estables mediante lectura autorizada; no volver a escribir con un ID nuevo automáticamente.
- Calcular costo por cantidad, subtotales y total exclusivamente con Decimal en servidor. Rechazar desbordamientos; no redondear ni truncar silenciosamente. Usar el formato y utilidades de `docs/MONEY_FORMAT.md`, con dos decimales visibles y moneda explícita.
- No modificar precios de venta, estado de pago, deudas ni saldos comerciales. AuditEvent conserva solo tipo de operación, entidad, actor, tenant y fecha, sin contacto ni detalles fiscales.

## Interfaz

- `/panel/compras`: búsqueda por código/referencia/proveedor, filtro de estado y sucursal autorizada, paginación estable y tabla con scroll interno y encabezados visibles.
- Nueva compra y edición de borrador con el patrón compartido RecordWorkspace/RecordEditor y rutas directas `/panel/compras/nueva` y `/panel/compras/[id]`. Detalle recibido de solo lectura.
- Cabecera compacta con proveedor, sucursal, fecha y referencia; búsqueda de artículos por nombre/SKU; grilla de renglones con unidad base, cantidad, costo y subtotal. Totales calculados por una operación de servidor sin persistencia; respuestas viejas no sustituyen el cálculo más reciente.
- Pie fijo con Cancelar y Guardar borrador; recepción explícita desde un borrador guardado, con confirmación de sucursal y cantidades. No mezclar una recepción con cambios de formulario sin guardar.
- Detalle con estado, usuario creador/receptor, fechas, costos históricos y movimientos vinculados. Conservar búsqueda, filtros, página y scroll al guardar.
- Escape, foco, advertencia por cambios sin guardar, etiquetas accesibles y navegación completa por teclado. Diseño para 1920 × 1080; en tamaños menores, scroll interno sin ocultar acciones ni provocar desbordamiento horizontal de la página.
- Sidebar operativo únicamente para autorizados. Las capturas orientan la distribución, conservando identidad visual MILO. No crear enlaces operativos de notas de crédito, pagos o cuenta corriente que no existen.

## Criterios de aceptación y validaciones

Pruebas de escrituras exclusivamente en una base PostgreSQL aislada, con nombre/propiedad verificados y fixtures sintéticos. No crear compras ni alterar stock de `milo_dev`.

1. Aplicar las seis migraciones anteriores y la nueva únicamente en la base aislada; validar compatibilidad con filas previas sintéticas, restricciones y relaciones.
2. Guardar/editar borradores no altera ni crea saldos o movimientos.
3. Recibir 10 unidades incrementa exactamente 10 en el producto/sucursal correctos; comprobar saldo previo cero y no cero, costos históricos y auditoría.
4. Doble clic, reintento y confirmaciones concurrentes de la misma compra no duplican stock ni auditoría de recepción.
5. Dos compras concurrentes del mismo producto suman ambos ingresos, sin perder actualizaciones; renglones compartidos se bloquean en orden estable.
6. Forzar fallo de auditoría/movimiento en la base aislada y comprobar rollback de documento, renglones, movimientos y saldos.
7. Probar denegación de roles, sesión inválida, aislamiento entre empresas y referencias cruzadas; comprobar pertenencia de sucursal, proveedor y productos.
8. Probar Zod, vacíos, precisión, valores negativos, fracciones no habilitadas, exceso de renglones y overflow monetario/stock.
9. Probar inmutabilidad de recepción y movimientos, borrado protegido de proveedores y controles de concurrencia.
10. Probar apertura/cierre, foco, Escape, advertencia de descarte y conservación del listado. Verificar visualmente cuando haya navegador disponible; informar la limitación si no lo hay.
11. Ejecutar Prisma validate, lint, typecheck, pruebas, build con HTTPS temporal de proceso y `git diff --check`. Documentar resultados reales, sin presentar pruebas no ejecutadas como aprobadas.

Implementación y limitaciones: ARCHITECTURE, DATABASE, DATA_MODEL_V1, DECISIONS, ROADMAP y WHOLESALE_V1_SCOPE reflejan D-048. La aplicación de la migración a la base local real requiere autorización posterior independiente. En ausencia de la estructura, el módulo muestra un aviso de migración pendiente y no permite escribir.

## Verificación de la implementación

- `node scripts/purchases/test-postgres.mjs --run-isolated`: aprobado. Crea una base temporal propia, aplica las seis migraciones previas y la nueva allí, compara huellas de fixtures previos y la elimina solo tras verificar nombre/propiedad y ausencia de conexiones. No conecta a `milo_dev`; usa la configuración local únicamente para derivar las conexiones a postgres y a la base temporal.
- La integración ejercita borradores, edición/versiones, costos exactos, recepción de diez unidades, repeticiones/confirmaciones concurrentes, compras concurrentes del mismo artículo, renglones del mismo producto con costos diferentes, rollback de auditoría, roles/revocación, aislamiento, FKs y documentos inmutables, borrado seguro de proveedores, búsqueda, filtros y paginación.
- `tests/purchase-ui.test.mjs`: formulario real con servidor simulado en el límite de las acciones; cubre búsquedas, formato canónico/localizado, guardado, foco/Tab/Escape, descarte, estado del listado, confirmación explícita, bloqueo durante recepción, conflictos y detalle recibido de solo lectura.
- La revisión visual de navegador quedó bloqueada por el control automático al no poder verificar la URL de Windows. Las pruebas DOM no certifican dimensiones reales, zoom ni ausencia de desbordamiento a 1920 × 1080; la grilla y los contenedores usan límites responsive y desplazamiento interno.
- No se implementan conversiones/fracciones, recepciones parciales, devoluciones, notas de crédito, pagos ni documentos fiscales. Ante un resultado de red incierto, el formulario bloquea nuevos envíos y permite recargar el detalle; el servidor reconoce la recepción ya registrada y no repite stock.
