# Compras — reorganización autorizada, 2026-11-12

> Actualizaci?n D-050 (2026-11-12): autorizaci?n posterior expresa y despliegue exclusivo de `20261112060000_purchase_document_details` a `milo_dev` mediante Prisma Migrate. Respaldo externo verificado; ocho migraciones aplicadas, ninguna pendiente; 32 tablas anteriores conservadas y detector `documentReady=true`. Comprobante, categor?a e IVA manual disponibles. Las referencias siguientes a falta de autorizaci?n describen la etapa previa. Sin escrituras comerciales ni cambios de alcance. Ver [registro y evidencia](DECISIONS.md#d-050--despliegue-autorizado-de-detalles-de-compras).

El pedido del usuario autoriza implementar cinco entradas bajo Compras conservando MILO y Compras V1. Este contrato concreta dependencias y aceptación antes de editar datos/acceso. Supera la propuesta visual anterior en lo aquí especificado; no autoriza desplegar migraciones nuevas a milo_dev.

## Rutas y funciones

- Ingreso de Mercadería: `/panel/compras/nueva`; conserva borrador/recepción y modal existente.
- N/C Proveedor (Carga): `/panel/compras/notas-credito/nueva`; formulario de estructura, escritura deshabilitada.
- Consulta de Compras: `/panel/compras`; búsqueda/paginación y operaciones V1, nuevas columnas cuando haya estructura.
- Consulta de N/C: `/panel/compras/notas-credito`; filtros y tabla preparados, sin consultas ni registros simulados.
- Pagos a Proveedores: `/panel/compras/pagos`; proveedores reales mediante servicio autorizado existente, búsqueda y paginación. Acción de consulta lleva al contexto del proveedor, sin saldo, cuenta corriente ni pago inventados.

Todos los destinos exigen sesión y OWNER/ADMIN COMPANY. N/C y pagos no tienen server actions de escritura. La disponibilidad visual no concede permisos ni crea soporte contable.

## Datos adicionales de ingreso

- Tipo de comprobante externo opcional FA/FB/FC/OTRO, punto de venta opcional de hasta cinco dígitos y número opcional de hasta ocho, preservando ceros. Sin emisión, validación fiscal ni nueva unicidad de documentos.
- Categoría opcional de la compra como texto libre de hasta cien caracteres, independiente de Category de productos. No crear catálogo ni alta + en esta etapa; la nueva instrucción pide categoría si corresponde y no requiere CRUD de categorías de compra.
- Proveedor seleccionado: código/nombre, condición IVA, CUIT y domicilio actuales desde la ficha del tenant, solo para autorizados. No inferir consumidor final ni incorporar DNI a CUIT. La interfaz explica que DNI no está soportado. Snapshot histórico de código/nombre recibido conserva su contrato; datos de ficha actuales se distinguen.
- Costos netos al activar desglose, según respuesta del usuario. Neto = suma de subtotales; IVA del comprobante ingresado manualmente, no negativo, obligatorio y explícito incluso en cero; total = neto + IVA. Sin alícuotas automáticas ni redondeo. Sin desglose, taxAmount es null y se conserva total V1. No distribuir IVA en costos de renglones. Todos los importes usan Decimal exacto, Zod y D-038.
- Cinco columnas nullable en Purchase: documentType, pointOfSale, documentNumber, purchaseCategory y taxAmount. Total sigue significando total final; neto se obtiene de los renglones. Actualizar la función diferida de integridad para sumar IVA explícito sin quitar controles de recepción, ledger o auditoría. No cambiar las siete migraciones existentes.
- Antes de desplegar la nueva migración, V1 sigue operativo: las consultas omiten las columnas inexistentes, los datos nuevos aparecen bloqueados con aviso y el servidor rechaza solicitudes que intenten usarlos. Estructura parcial deniega la extensión; no suplir con valores ficticios. No guardar campos que aparenten persistir sin soporte.
- Conservar hashes V1 cuando el documento adicional esté ausente/vacío. Los documentos nuevos incluyen metadatos en la huella. Recibidos inmutables, locks y versión se conservan. La migración no reescribe filas comerciales.

## N/C: reglas y modelo faltantes

Faltan tipo de efecto (devolución física o ajuste comercial), vínculo obligatorio/opcional con recepción y factura, límites por renglón y devoluciones previas, sucursal destino, disponibilidad de stock, costos/IVA y redondeo, estados/confirmación/cancelación, numeración, idempotencia y auditoría. Harán falta entidades de nota/renglones y relaciones tenant-aware; si hay devolución física, requiere un flujo de inventario aprobado, movimientos persistentes y no negativos. No reutilizar pagos ni invertir movimientos existentes. No preparar una migración con semántica inventada antes de definir estas reglas.

## Pagos: reglas y modelo faltantes

No existen obligaciones/saldos comerciales de proveedores, ledger de cuenta corriente, pagos ni imputaciones. Falta definir origen y vencimiento de deuda, impacto de N/C, pagos parciales, medios/cuentas, moneda, estados, conciliación, anulaciones/reversos, idempotencia y auditoría. Purchase.total no equivale a deuda ni autoriza calcular saldo. Se requerirán entidades y migración tras aprobar estas reglas; hoy no corresponde inventarlas.

## Aceptación y comprobación

Exactamente cinco enlaces en orden; enlaces activos sin marcar dos entradas a la vez e IDs de grupos únicos. Formulario MILO, renglones con cantidad/SKU/descripción/unidad/costo/subtotal/acciones, total ARS, pie fijo, foco y Escape, sin copiar estilos externos. Conservar tests V1 y ampliar casos de compatibilidad, campos, importes, permisos y bloqueo. Probar migración adicional y escritura solo en base propia aislada. Ejecutar Prisma validate, lint, typecheck, pruebas, build con HTTPS temporal de proceso y diff check. Informar separadamente límites de revisión visual real. Sin cambios de Better Auth, Docker, .env; sin datos ficticios en milo_dev, commits ni pushes.

## Resultados de verificación

- Prisma validate, lint y typecheck aprobados. Suite completa: 175 casos, 172 aprobados, 3 omitidos, sin fallos.
- Build de producción aprobado usando BETTER_AUTH_URL HTTPS temporal solo para el proceso, sin editar .env.
- Integración PostgreSQL propia aislada: suite V1 completa antes del upgrade, conservación por huellas de todas las tablas al aplicar la octava migración, metadatos/ceros iniciales/IVA explícito, búsqueda, recepción e idempotencia, inmutabilidad y denegación ante estructura parcial. La base se eliminó tras verificar nombre y propiedad.
- milo_dev: comprobación de solo lectura, siete migraciones con checksum correcto, cero columnas nuevas y lectura Prisma V1 compatible. Hashes de .env, lib/auth.ts y los siete SQL anteriores coinciden con la evidencia previa. No se aplicó la octava migración.
- Revisión visual: Chrome headless con componentes reales renderizados en un harness SSR, CSS de MILO y datos sintéticos solo en memoria, sin sesión ni conexión a la base. Viewports medidos 1920×1080 y 1366×768; sin desbordamiento horizontal y pie Guardar/Cancelar visible tras ajustar altura del editor. Ingreso con extensión disponible y pendiente, más carga N/C, inspeccionados. No equivale a una prueba de sesión autenticada ni a recepción real en milo_dev. Capturas locales ignoradas en .local/purchase-*.png. Foco, Escape, F3/F5, cambios sin guardar y formulario se verificaron con React/DOM.
