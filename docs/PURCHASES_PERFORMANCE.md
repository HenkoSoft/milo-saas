# Compras: presentación y rendimiento

> D-052 actualiza el recorrido de apertura y agrega prueba nativa con React y Chrome: ver [PURCHASES_MODAL.md](PURCHASES_MODAL.md). La inspección SSR de D-051 descrita aquí era una revisión de distribución, no una prueba del flujo modal real.

D-051, 2026-11-13. Alcance: alta/edición/detalle de Compras, sin cambios del ciclo borrador/recepción, autorización, modelo, migraciones ni datos reales. Dependencias revisadas: ADMIN_FORMS, RecordWorkspace/RecordEditor de Productos y Clientes, acciones, servicio, detectores de estructura, validación y triggers de Compras.

## Causas verificadas y cambios

- El formulario enviaba el documento completo a una Server Action 250 ms después de cualquier cambio serializado, incluso referencia o notas. Cada cotización ejecutaba siete consultas/transacciones SQL en el ensayo, además de la sesión y transporte fuera de la medición. La respuesta producía otro render completo. La estimación ahora es local, exacta en centavos BigInt, sin IO ni caché. Datos incompletos/incorrectos muestran «—», sin convertir vacíos a cero ni redondear. Guardado y recepción conservan Zod, Decimal y recálculo servidor como autoridad.
- Las 100 filas se volvían a renderizar al cambiar una sola. Las filas usan memo y callbacks estables; los cambios de datos ajenos al importe tampoco recalculan la estimación.
- Guardar 100 renglones hacía 100 INSERT separados, dentro de la misma transacción. createMany conserva filas, snapshots, restricciones, triggers, auditoría, locks previos y rollback; no usa skipDuplicates. La operación completa pasa de 119 a 20 consultas SQL.
- Listado, detalle y búsqueda de proveedores leían fichas completas cuando solo necesitan campos concretos. Ahora usan proyecciones acotadas. La respuesta pública de los servicios conserva su contrato; esta reducción de columnas no demuestra por sí sola una mejora temporal.
- Se mantienen comprobaciones de membresía y esquema en cada operación; no se agrega caché ni se altera Better Auth, Prisma schema/config/client, Docker o .env.

## Comparación medida

PostgreSQL local temporal propio con las ocho migraciones existentes, dos tenants, 30 borradores iniciales y 100 renglones por guardado medido. Ocho muestras después de una ejecución de calentamiento por operación; columna temporal = mediana en ms. La identidad de sesión está inyectada en el loader de pruebas; la membresía y autorización transaccionales usan los servicios reales. Se excluyen HTTP, sesión Better Auth, render RSC y compilación Next. Bases eliminadas tras verificar nombre y propiedad; ninguna escritura ni lectura de negocio a milo_dev en esta tarea.

| Operación del servicio | Antes, ms | Después, ms | SQL antes/después |
| --- | ---: | ---: | ---: |
| Listado inicial (25 registros) | 33,24 | 28,97 | 13 / 13 |
| Apertura de alta (datos) | 20,37 | 21,10 | 8 / 8 |
| Búsqueda de proveedores | 13,94 | 14,71 | 7 / 7 |
| Búsqueda de productos | 14,66 | 15,79 | 7 / 7 |
| Cotización servidor, 100 filas | 16,99 | 18,54 | 7 / 7 |
| Guardado de borrador, 100 filas | 261,69 | 107,58 | 119 / 20 |
| Consulta de detalle | 33,25 | 37,41 | 18 / 18 |

La cotización servidor sigue disponible pero el formulario ya no la llama al editar. No se afirma mejora en apertura, búsquedas ni detalle; tampoco una mejora robusta del listado por una diferencia pequeña en este conjunto reducido.

React real en jsdom, sin navegador de producción ni conexión: fixture de 100 filas, acciones simuladas de respuesta inmediata y React Profiler. Ocho cambios alternados de costo; antes se espera hasta que el contador detecta la cotización (debounce de 250 ms y posterior commit), después hasta el commit local. Cantidad, selección/agregado y apertura son observaciones individuales, no medianas.

| Operación UI | Antes, ms | Después, ms |
| --- | ---: | ---: |
| Cambio de costo, mediana de 8 | 405,61 | 16,05 |
| Cambio de cantidad, 1 observación | 409,05 | 14,48 |
| Buscar/seleccionar proveedor, sin latencia servidor | 84,18 | 16,50 |
| Buscar/agregar producto, sin latencia servidor | 76,00 | 74,57 |
| Montaje inicial del detalle de 100 filas | 255,37 | 306,30 |

En ocho cambios de costo: 8 → 0 cotizaciones remotas, 16 → 8 commits, 877,17 → 97,33 ms acumulados de render React. El montaje inicial de 100 filas aumentó aproximadamente 51 ms en esta observación; no se presenta como mejora. Las cifras UI y servicio se reportan separadas y no se suman para simular una navegación autenticada.

EXPLAIN ANALYZE/BUFFERS en la base aislada: listado 0,088 ms, búsqueda de proveedores 0,103 ms, productos 0,044 ms. Se revisaron los índices compuestos existentes por tenant, fecha/id, proveedor y producto/SKU; los planes acotan por tenant. ILIKE con comodines requiere filtrar dentro del tenant y el orden mixto fecha DESC/id ASC puede ordenar resultados. Con estos datos pequeños no hay evidencia de un cuello de botella que justifique índices nuevos; no se modifica Prisma ni se crean migraciones.

## Presentación y criterios verificados

Se reutilizan RecordWorkspace, RecordEditor, EditorTabs, EditorTabPanel y EditorFooter, sin modificar esos componentes compartidos. Pestañas Datos de la compra, Artículos y Observaciones con campos controlados que conservan valores. Modal global MILO de 1120 × 740 px, encabezado y pie independientes del cuerpo desplazable, costos en ARS y tabla compacta con encabezado fijo y scroll interno. F3/F5 revelan y enfocan búsquedas; validación nativa revela la pestaña correspondiente. Continúan foco/Tab/Escape, descarte, bloqueo de cierres durante escritura, rutas directas y conservación del listado, URL, filtros, página y scroll.

Chrome headless con el formulario real renderizado SSR y CSS MILO, datos sintéticos solo en memoria y diálogo nativo. Datos y Artículos inspeccionados a viewport medido 1920 × 1080: modal 1120 × 740, pie a y=834–909, sin overflow horizontal. En Artículos con 20 renglones, cuerpo 526/526 px (sin scroll exterior) y tabla 260/1026 px con scroll interno. Vista reducida comprobada a 500 × 844; el intento de 390 px quedó limitado por el ancho mínimo del Chrome de este host y no certifica 390 px. Las capturas de pestañas cambian visibilidad en el harness SSR; navegación React, foco y descarte se prueban en jsdom. No equivale a una sesión autenticada real de producción.

## Reproducción y límites

- `node scripts/purchases/benchmark.mjs --run-isolated`: crea exclusivamente una base temporal propia desde la configuración local validada, carga fixtures y mide los servicios. No conecta servicios a milo_dev. Escribe `.local/purchase-performance/after.json`; exige poder crear/eliminar esa base propia.
- `node scripts/purchases/benchmark-ui.mjs`: mide el formulario con React/jsdom y acciones simuladas; escribe `.local/purchase-performance/ui-after.json`.
- Evidencia de esta comparación en `.local/purchase-performance/`: before.json, after.json, ui-before.json, ui-after.json, planes y capturas/medidas visual-*. La copia previa de los cuatro archivos originales se conserva allí como *.before. Los tiempos anteriores se tomaron antes de modificar los servicios; no se recrean fingiendo el comportamiento anterior del servicio actual.
- Pruebas agregadas: aritmética local contra Decimal, límites/IVA/cero/vacíos, diagnóstico de 1000 estimaciones de 100 filas, navegación de pestañas y conservación de valores, atajos y cero solicitudes remotas al editar. La suite de integración real conserva roles, tenant, locks, recepción concurrente/idempotente, auditoría, rollback e inmutabilidad.
- Pendientes: tiempos HTTP completos con sesión real y medición en un volumen representativo de catálogo/proveedores; perfilado de apertura inicial de documentos de 100 filas en navegador. No se atribuyen esos tiempos a PostgreSQL ni se afirma haberlos corregido.

## Validación ejecutada

Lint sin errores ni advertencias, typecheck y `git diff --check` aprobados. Suite completa: 179 casos, 176 aprobados, 3 omitidos, ninguno fallido. Build de producción aprobado con BETTER_AUTH_URL HTTPS temporal solo para el proceso; .env intacto. Integración PostgreSQL propia aislada de Compras aprobada y base eliminada con verificación de propiedad. Comprobados 13 hashes de archivos protegidos contra la evidencia D-050: .env, esquema/configuración Prisma, autenticación y ocho SQL sin cambios. No se hicieron commits ni pushes.
