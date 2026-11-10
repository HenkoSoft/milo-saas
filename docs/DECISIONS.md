# Registro de decisiones de Milo Store SaaS

## D-039 — Plan privado de activación y publicación segura

El CLI de activación recibe un plan explícito validado con Zod mediante variables `MILO_ACTIVATION_*`, sin nombres, correos ni UUID reales predeterminados. El plan se pasa como parámetro a inspección, identidad y transacción; importar los módulos no carga un plan ni abre conexiones. La contraseña conserva su ingreso interactivo privado, nunca por entorno o argumentos. El comando genérico es `activation:tenant`; documentación en [scripts/activation/README.md](../scripts/activation/README.md).

Se conservan los identificadores originales y journals fuera de Git para reconciliación; el CLI no los genera ni reemplaza. Detecta también journals anteriores del mismo UUID, sin renombrarlos ni borrarlos. La comprobación de historial reconoce las cuatro migraciones existentes. Los tests emplean un plan sintético separado y transporte en memoria; la integración PostgreSQL continúa opt-in. Las referencias históricas a datos fijados en código quedan superadas por esta decisión.

Se retiraron datos personales y referencias locales de respaldo de la documentación publicable y se ampliaron las exclusiones de respaldos, claves y temporales. Esta preparación no ejecuta activaciones, migraciones ni operaciones PostgreSQL, ni cambia Prisma, Better Auth o `.env`. La inspección del historial remoto y los archivos candidatos no encontró coincidencias con los secretos locales ni los patrones de credenciales revisados; esto no sustituye la rotación si posteriormente se descubre una exposición.

## D-038 — Formato monetario global obligatorio

Por indicación expresa del responsable, todos los campos monetarios actuales y futuros deben usar punto de miles, coma de centavos y dos decimales visibles (`100.000,00`), en todos los módulos, tenants y monedas habilitadas. Aplica a entrada, consulta, tablas, totales y documentos para personas. La norma, ejemplos, mantenimiento y criterios de comprobación están en [MONEY_FORMAT.md](MONEY_FORMAT.md), con instrucción permanente en AGENTS.md.

La interfaz convierte a decimales canónicos exactos sin miles y con punto para los contratos internos y la persistencia; no usa Number ni redondeo. Se preservan moneda explícita, vacío distinto de cero, Zod server-side, permisos y políticas de signos de cada operación. Los factores y cantidades mantienen contratos propios. No se autorizan nuevos campos comerciales, módulos, monedas ni cambios de esquema/datos. Implementado actualmente en precio habitual y por presentación; la norma no implica que toda la aplicación haya sido auditada visualmente.

## D-035 — Cantidades de inventario en formato argentino

- Listado, historial y existencia consultada en formularios usan `lib/inventory/format.ts`: reciben el decimal canónico con punto, eliminan ceros decimales finales y muestran coma decimal y punto de miles, sin pasar por Number ni redondear. Un saldo ausente conserva el estado «Sin saldo registrado».
- UN muestra enteros. Las fracciones existentes se muestran exactamente cuando el producto admite cantidades fraccionarias y su unidad no es UN; una fracción inesperada se conserva visible con advertencia, nunca se oculta o redondea. Se consulta el indicador real de Product; no se infiere el permiso por ser metro u otra unidad.
- Es un cambio de presentación: no altera valores almacenados, unidades, conversiones ni validación de operaciones. Los formularios de inventario siguen aceptando solo cantidades enteras hasta aprobar las reglas de fracciones. Pruebas de formato y renderizado cubren listado, historial y formularios sin acceso a PostgreSQL.

## D-034 — Caché del cliente y diagnóstico de ingresos fallidos

- El 2026-11-10 se investigó el mensaje de resultado incierto sin reenviar el ingreso ni escribir datos. Consultas READ ONLY en milo_dev para Milo Store encontraron cero StockMovement, StockBalance y AuditEvent de inventario. El esquema tenía los dos campos y CHECK correctos; no había un ingreso registrado ni un estado parcial.
- Causa comprobada en el proceso Next dev que permanecía abierto desde antes de generar los campos: globalThis conservaba un cliente Prisma sin reason/sourceReference. Una consulta de solo lectura con ese mismo cliente produjo PrismaClientValidationError. El catch genérico y el fallo de la reconciliación mostraban el mensaje de commit incierto aunque la validación impedía completar el callback transaccional.
- `lib/prisma.ts` ahora reutiliza el singleton solo si fue creado por el constructor generado actualmente cargado. La identidad del constructor evita reutilizar metadatos previos tras HMR/regeneración; no se usa instanceof, porque el cliente generado devuelve un proxy. No se desconecta automáticamente el cliente anterior para no interrumpir solicitudes en curso. No se cambiaron esquema, migraciones, SDK, configuración Prisma o .env ni se ejecutó generate.
- Inventario distingue una validación de cliente anterior a la finalización del callback (error de aplicación sin commit) de un error posterior, que sigue reconciliándose por el mismo ID/payload. Los errores inesperados registran únicamente UUID de solicitud, etapa y código permitido, nunca SQL, mensajes del proveedor, credenciales, actor, cantidades o texto libre. El formulario conserva su identificador y no hay reintentos automáticos.
- Pruebas nuevas en memoria con constructores reales del SDK sin conexiones a PostgreSQL: renovación/reutilización del cache, sin desconectar clientes activos, rollback simulado por validación, commit sin ACK, validación posterior al callback y reconciliación no disponible. La lectura real en el proceso de desarrollo pasó tras renovar el cliente. No se ejecutaron movimientos reales, ni pruebas de escritura en base aislada durante esta investigación.

## D-033 — Inventario manual preparado y probado en PostgreSQL aislado

### Aplicación controlada verificada — 2026-11-10

Por autorización expresa se aplicó exclusivamente `20261109220000_add_inventory_manual_trace` mediante Prisma 7.10.1 migrate deploy a `127.0.0.1:5432/milo_dev` (PostgreSQL 17.11). Tres migraciones anteriores completas con checksums coincidentes y una única pendiente; cero movimientos incompatibles. Respaldo consistente con snapshot exportado: evidencia local no versionada, 91.806 bytes, 198 entradas, pg_restore --list y lectura completa sin restaurar correctos. SHA-256: `85d78c13a2278f8af4e782ab9f50e409223e04061e3c9c24f918ec25b1eb2e03`. Evidencia de preparación y resultado en `.audit.json` y `.verified.json` del mismo nombre base, fuera del repositorio.

Confirmados reason VARCHAR(1000), sourceReference VARCHAR(200), ambos nullable, y los dos CHECK validados. Cuatro migraciones aplicadas y ninguna pendiente; migrate status, prisma validate y diff real/schema correctos. Huellas de los datos anteriores de las 27 tablas coincidentes (el historial Prisma incorpora únicamente la entrada autorizada); resto de columnas, restricciones, índices, triggers, funciones y enums intactos. No se crearon movimientos ni datos comerciales. Better Auth, Docker, .env, modelos y archivos de migración sin cambios. Las referencias siguientes a aplicación pendiente describen la etapa de preparación; no son el estado actual de milo_dev. Esta aplicación no ejecuta ni prueba un movimiento real desde el panel.

- `/panel/inventario` consulta saldos por sucursal y busca artículos; `/panel/inventario/[id]` muestra fecha/zona del tenant, actor, sucursal, cantidad exacta, motivo y referencia real cuando existen. No se interpreta un saldo ausente como cero ni stock registrado como reservas/disponibilidad para ventas. Sidebar/accesos rápidos solo para roles autorizados, sin selección global implícita de sucursal.
- Contrato aprobado expresamente durante esta tarea: ingresos positivos; ajustes sumar/restar con cantidad positiva y motivo obligatorio; campos nuevos de motivo/referencia manual; OWNER/ADMIN COMPANY en todas las sucursales de su tenant, WAREHOUSE en sus BRANCH asignadas y MANAGER solo consulta en las suyas. SALES/TECHNICIAN sin acceso. La membresía por authUserId y los roles se revalidan en cada transacción. Una asignación MANAGER nunca amplía el alcance de escritura de WAREHOUSE.
- `/panel/inventario/ingresar` y `/panel/inventario/ajustar` usan Server Actions, Zod estricto y cantidades enteras en unidad base, sin Number, fracciones o conversiones. Se registran códigos técnicos MANUAL_RECEIPT (delta positivo) y MANUAL_ADJUSTMENT (delta positivo o negativo según sumar/restar). El ajuste guarda motivo libre obligatorio; referencia libre opcional, sin inventar documentos/proveedores ni vincular automáticamente pedidos. Cada cambio crea movimiento y auditoría junto a un incremento firmado de saldo, en la misma transacción ReadCommitted con lock Product FOR UPDATE previo a leer cantidades. Nunca se envía un saldo final desde el navegador. Saldo negativo o fuera de DECIMAL(18,3) se rechaza.
- Idempotencia mediante UUID estable del movimiento, conservado por el formulario. La repetición debe coincidir en tenant/actor/sucursal/artículo/unidad/tipo/delta/motivo/referencia; payload distinto se rechaza. No hay reintentos automáticos de escritura. Ante confirmación de commit incierta se reconcilia por el mismo ID/payload; no se genera otra operación. La unidad esperada se comprueba bajo lock, evitando reinterpretar una cantidad si cambió la unidad antes del primer movimiento.
- Migración nueva `20261109220000_add_inventory_manual_trace`, generada por comparación de esquemas sin conexión de escritura: solo agrega StockMovement.reason VARCHAR(1000) y sourceReference VARCHAR(200), nullable para historial anterior, más dos CHECK para ingreso positivo/finito y ajuste no nulo/finito con motivo. Conserva las restricciones y triggers existentes. Envuelta en BEGIN/COMMIT y timeouts. No modifica migraciones anteriores ni filas históricas. Antes de aplicar se debe revisar cualquier fila previa que use esos códigos técnicos. No se aplicó a milo_dev: la interfaz y el servicio bloquean escrituras hasta comprobar columnas y CHECK validados; lectura compatible con el esquema anterior.
- Runner `node scripts/inventory/test-postgres.mjs --run-isolated`: aplica las cuatro migraciones únicamente a su base temporal propia y ejecuta el servicio real con Prisma/PostgreSQL 17.11 y sesión de prueba simulada. Verificados ingreso 10→10, ajuste 10→7 con motivo/historial, repetición sin duplicar, concurrencia de ingresos distintos y del mismo UUID, aislamiento por tenant/sucursal, MANAGER de lectura, stock negativo rechazado, restricciones append-only/FKs, rollback de saldo/movimiento/auditoría ante fallo y reconciliación tras commit sin ACK. Sin cuentas credential ni sesiones de prueba. Base temporal eliminada tras comprobar identidad, marcador y fingerprints completos.
- No hubo escrituras o migraciones en milo_dev. Prisma solo incorpora los dos campos autorizados; cliente regenerado. Better Auth, Docker, .env y modelos restantes intactos. La activación en milo_dev requiere autorización posterior para aplicar la migración. Fracciones, conversiones, transferencias, reversos automáticos, ventas y pedidos no se implementan.

## D-032 — Shell ERP y dashboard comercial

- Sidebar oscuro persistente/contraíble en escritorio, menú móvil desplegable con cierre por Escape y submenús Artículos y Administración. Inicio y enlaces de productos/categorías/marcas/empresa/sucursales respetan los permisos existentes. Clientes, Compras, Ventas, Proveedores, Inventario, Caja, Reportes, Herramientas y Ayuda se muestran deshabilitados como Próximamente, sin rutas ficticias. Identidad MILO y Powered by HenkoSoft propios; cierre de sesión reutiliza el componente Better Auth existente.
- Dashboard `/panel` con cuatro indicadores, espacio de ventas de siete días, últimas ventas y accesos rápidos. Solo OWNER/ADMIN COMPANY reciben conteos reales de Customer (todos los estados, sin inferir aprobación) y Product (publicados y no publicados). Servicio server-only revalida perfil por authUserId, tenant y asignación dentro de RepeatableRead y usa COUNT filtrado exclusivamente por tenant. Sin caché compartida ni PII/precios en el agregado. Los otros roles no reciben métricas administrativas ni enlaces de administración.
- No se consulta WholesaleOrder para simular ventas ni pedidos operativos. Ventas del día, Pedidos de hoy, gráfico y últimas ventas muestran Próximamente/Sin datos disponibles sin cifras, ejes o series simuladas. Fallos de consulta se distinguen de un conteo real de cero. La página conserva cuenta/roles reales, sin ampliar autorización comercial.
- No hay contrato de sucursal activa ni selector existente. Se muestra el alcance empresarial o las sucursales asignadas verificadas por el guard, sin elegir una automáticamente ni denominarla activa. Ese selector sigue pendiente. Las capturas de referencia no estaban disponibles en el contexto: se siguió la descripción, sin copiar logos o recursos de Plus Web.
- Cambios limitados a presentación, navegación y agregados de lectura autorizados. No se modifican guard, lógica comercial, datos, Better Auth, Prisma, migraciones o .env. Pruebas de tenant/permisos/fallos y markup accesible con transporte en memoria, sin afirmar integración real PostgreSQL de las métricas.

## D-031 — Administración de sucursales

- `/panel/sucursales`, `/panel/sucursales/nueva` y `/panel/sucursales/[id]` incorporan listado con búsqueda/paginación, alta y edición de Branch; navegación integrada al sidebar MILO. Solo OWNER/ADMIN COMPANY sin sucursal pueden consultar/guardar. Tenant y actor se derivan del guard authUserId y la membresía/rol se revalidan dentro de cada transacción.
- Branch solo ofrece nombre comercial editable: texto obligatorio, trim, máximo técnico de formulario 200 caracteres y sin controles/saltos de línea. No se agregan dirección, contacto, estado, códigos ni unicidad de nombre que el modelo no declara. IDs, tenantId, createdAt y relaciones se conservan; no hay borrado, reasignación ni habilitación/deshabilitación.
- Persistencia Prisma con allowlist explícita name/updatedAt, concurrencia optimista por updatedAt y transacción Serializable. AuditEvent mínimo BRANCH_CREATED/BRANCH_UPDATED con actor del mismo tenant, entidad Branch y UUID real, dentro de la misma transacción; errores revierten todo y no-op no audita. Sin copiar el nombre a auditoría, retries automáticos, cambios de roles/asignaciones o escrituras de pedidos/inventario.
- Las FKs tenant-aware y RESTRICT a Tenant y desde roles/pedidos/saldos/movimientos se respetan sin modificar SQL. Pruebas de permisos, aislamiento, validación, persistencia, concurrencia, referencias intactas y rollback simuladas en memoria, sin crear sucursales reales ni afirmar integración PostgreSQL. Sin cambios de Prisma, migraciones, Better Auth o .env.

## D-030 — Carga rápida de productos

- Formulario principal de alta/edición con nombre, SKU, descripción, categoría, marca opcional y precio de venta. Presentaciones/unidades/factores especiales quedan en «Opciones avanzadas». Sin campo de existencias iniciales ni escrituras de inventario. Se conservan publicación y administración avanzada de cajas, packs y metros.
- El alta habitual autorizada usa la unidad existente UN/COUNT, sin fraccionamiento, y crea Product, presentación Individual habilitada (factor exacto 1) y WholesalePrice explícito en la misma transacción Prisma, con auditoría de las tres entidades. Precio cero o positivo con hasta dos decimales; no se inventa cero para un campo vacío. Se comprueba moneda real y unidad en servidor. Si falta UN/COUNT no se sustituye por otra unidad: queda disponible el alta especial con selección explícita de unidad/fraccionamiento, sin presentación ni precio automáticos.
- En edición no se cambia unidad base ni fraccionamiento. Solo se asocia automáticamente una única presentación UN/factor 1 habilitada de un producto UN/COUNT no fraccionario, sin renombrarla o alterar su identidad. Si no existe, ingresar un precio explícito permite crearla preservando todas las otras presentaciones. Con varias candidatas, una individual deshabilitada, precio previo negativo o configuración especial, se conserva todo y se deriva la administración de precios a Opciones avanzadas. Una ficha existente sin precio puede guardarse sin crear ninguno; blanco nunca elimina un precio existente. No hay selección arbitraria de una presentación principal inexistente en el modelo.
- Server Actions usan saveQuickProduct con guard OWNER/ADMIN COMPANY, tenant desde authUserId, FKs tenant-scoped, Zod estricto y auditoría en la transacción. Locks Product→ProductPresentation y versiones de producto/presentación/precio previenen sobrescrituras; un cambio de precio rápido actualiza también el token de producto. No hay reintentos automáticos ni modificaciones masivas de productos existentes.
- Pruebas de carga rápida, compatibilidad, permisos, aislamiento, precisión, persistencia y rollback en memoria; sin escrituras reales ni prueba de integración PostgreSQL de esta etapa. No cambian Prisma, migraciones, Better Auth o .env. Reglas operativas de fracciones/conversión/redondeo, stock, ventas y pedidos siguen pendientes. D-030 amplía el flujo separado de presentación/precio de D-029.

## D-029 — Marcas y presentaciones administrativas

- `/panel/marcas` incorpora listado, búsqueda, paginación, alta y edición de Brand; la ficha `/panel/productos/[id]` incorpora alta/edición de ProductPresentation, habilitación y precio mayorista independiente. Solo OWNER/ADMIN COMPANY sin sucursal; tenant y actor se resuelven y verifican en servidor, también dentro de la transacción. No se crea ningún dato de referencia ni se cambia Prisma, migraciones o Better Auth.
- Factores positivos DECIMAL(18,3) y precios DECIMAL(18,2) se validan como texto exacto y se pasan a Prisma Decimal, sin Number, redondeo o conversiones implícitas. Punto/coma decimal admitidos sin miles ni exponentes. Unidad compatible por dimensión, factor y estado elegidos explícitamente. La presentación se crea sin precio y este se guarda por separado, con moneda real del Tenant comprobada en servidor. Por autorización expresa se admiten precios cero o positivos; los negativos siguen pendientes y bloqueados. Cero exige ingreso explícito y se distingue de ausencia de precio. No es una nueva restricción de base de datos.
- Identidad de presentación editable solo sin OrderLine referenciadas. Con historial, producto/unidad/dimensión/factor se preservan; nombre, habilitación y precio pueden cambiar sin alterar snapshots. No hay borrado. Para presentaciones/precios se bloquea Product y luego ProductPresentation, siempre tenant-scoped. ReadCommitted permite consultar historial después de esperar el lock compartido con los escritores de OrderLine; updatedAt de producto, presentación y precio detectan fichas desactualizadas. El precio actualiza también el token de presentación. Sin reintentos automáticos de escritura ante errores inciertos.
- Marcas usan el control optimista/Serializable existente del catálogo, sin imponer unicidad de nombre no declarada. AuditEvent mínimo registra tenant/actor/acción/entidad en la transacción de cada cambio; fallos de auditoría revierten el cambio y los no-op no generan eventos. No se copian precios ni datos privados al evento.
- Siguen pendientes las reglas operativas de cantidades fraccionarias, conversiones y redondeos; no se ejecutan cálculos de cantidad, stock, pedidos o ventas. El catálogo público y la autorización comercial de precios no cambian. Pruebas nuevas de autorización, aislamiento, precisión, concurrencia, persistencia y rollback con transporte Prisma en memoria; sin afirmar validación de integración PostgreSQL ni realizar escrituras reales.

## D-028 — Unidades base iniciales aprobadas y cargadas

Autorizados y creados únicamente `UN / Unidad / COUNT` y `M / Metro / LENGTH` en UnitOfMeasure de milo_dev, mediante una transacción Prisma Serializable, tras comprobar destino, tres migraciones al día y ausencia de ambos códigos. Valores verificados después del commit; las otras 26 tablas y los registros existentes permanecieron intactos. No se crearon productos, categorías, presentaciones ni tenants. El alta de productos ya dispone de unidades base; requiere selección explícita de unidad y fraccionamiento. No se aprobaron conversiones, reglas de fracciones o redondeos adicionales. No se modificaron Prisma, migraciones, Better Auth, .env o Docker. Las referencias anteriores a cero unidades describen la inspección previa.

## D-027 — Administración inicial de categorías y productos

- Rutas `/panel/categorias` y `/panel/productos`, con alta y edición en subrutas, búsqueda y paginación tenant-scoped. Solo OWNER/ADMIN COMPANY; guard en cada página/acción y revalidación de membresía/rol dentro de cada transacción. No se habilitan otros roles ni endpoints públicos de catálogo.
- Categorías: crear/editar nombre, sin jerarquía ni unicidad de nombre inventada. Productos: crear ficha con SKU, nombre, descripción, categoría/marca opcionales del mismo tenant y estado de publicación. SKU único por tenant según la restricción existente, sin normalizarlo a mayúsculas ni inventar numeración. Marcas solo se consultan como opciones existentes, sin altas automáticas.
- El alta exige unidad base existente en UnitOfMeasure y selección explícita del indicador allowsFractionalQuantity, sin default implícito. La dimensión se deriva en servidor de esa unidad. No se cargan unidades ni se definen códigos: en la inspección read-only de milo_dev había cero unidades, por lo que el formulario de alta de productos queda deshabilitado hasta aprobar/cargar el vocabulario compartido en otra etapa.
- El indicador de fracciones solo persiste el booleano existente; no habilita cálculos, pasos mínimos ni reglas para cantidades comerciales/base. En productos existentes unidad base, dimensión y fraccionamiento son de lectura. Presentaciones, conversionFactor DECIMAL(18,3) y precios DECIMAL(18,2) se consultan como strings exactos desde Prisma Decimal; no hay creación automática, edición, conversiones, redondeos, precio cero implícito ni cantidad calculada. Sin imágenes, stock, pedidos o ventas nuevos.
- Ediciones con token updatedAt, filtro tenantId/id/version y avance monotónico de updatedAt generado en servidor, en transacción Serializable. Auditoría mínima atómica: CATEGORY_CREATED, CATEGORY_UPDATED, PRODUCT_CREATED, PRODUCT_UPDATED; actor del mismo tenant, entidad Category/Product e ID real, sin valores o descripción en el evento. Formularios sin cambios no escriben. Fallos/conflictos requieren revisar/recargar, sin reintento automático.
- Zod estricto rechaza claves adicionales y campos inmutables; límites técnicos de texto (nombres 200, SKU/unidad 100, descripción 5000, búsqueda 100). Relaciones de categoría/marca se comprueban en servidor y conservan FKs compuestas. No existe operación de eliminación de productos o categorías; por tanto no se permite borrar productos con historial y no se tocan snapshots ni triggers.
- Sin cambios a Prisma, migraciones, Better Auth, .env o datos reales durante las pruebas. Los tests de autorización, aislamiento, decimales, persistencia, concurrencia y rollback de auditoría usan transporte simulado con Prisma Decimal real; no constituyen prueba de escritura en PostgreSQL. El storefront editorial y sus reglas de precios/acceso no cambian.

## D-026 — Configuración de empresa inicial

- Implementada `/panel/empresa` e integrada al sidebar/topbar global MILO. Consulta y modificación limitadas a OWNER/ADMIN con COMPANY y sin sucursal; no se infieren permisos de lectura para roles operativos. El guard se ejecuta en la página y en cada acción; identidad, perfil y tenant siempre se resuelven en servidor. Se añade authUserId al contexto exclusivamente server-side para revalidar membresía dentro de la transacción, sin entregarlo al formulario.
- Único campo comercial editable: commercialName como texto opcional. Vacío se guarda como NULL, sin imponer obligatoriedad nueva; límite técnico de formulario de 200 caracteres, trim y rechazo de controles internos. Dirección sigue en lectura porque su alcance/detalle está pendiente. ContactData conserva su JSONB sin reinterpretación ni campos inventados: representación textual de lectura solo para los administradores autorizados, sin declararlo público. No se seleccionan datos fiscales ni se publican estos datos en el storefront.
- Moneda, locale, zona horaria y priceVisibility se muestran en lectura. El formulario solo acepta commercialName y un token updatedAt para concurrencia; rechaza IDs, actor, roles, dirección, contacto y cualquier otro campo adicional. El estado previo enviado por el navegador no participa en autorización ni en persistencia.
- Guardado Prisma Serializable con revalidación tenant-scoped de perfil/rol, update condicionado al updatedAt leído y avance monotónico de ese timestamp generado en servidor. Sin sobrescritura silenciosa de versiones obsoletas ni reintentos automáticos. Se invalidan las vistas del panel después de guardar; no hay caché compartida de configuración entre empresas.
- Auditoría mínima en la misma transacción: action=`TENANT_COMMERCIAL_NAME_UPDATED`, entityType=`Tenant`, entityId=tenantId y actorUserId del perfil autenticado con FK compuesta. No incluye valores anteriores/nuevos, nombres, contactos ni dirección. Un fallo del evento revierte el cambio; un formulario sin cambios no escribe ni genera evento. Este caso específico no resuelve el catálogo general de acciones ni la retención pendientes de AuditEvent.
- Sin cambios de Prisma, migraciones, Better Auth, .env, roles, storefront o módulos comerciales. Las pruebas nuevas usan fixtures y transacciones simuladas en memoria; no se modificaron datos reales para probar la pantalla. Validaciones de autorización, aislamiento, contrato de entrada, persistencia, conflicto y rollback de auditoría en `tests/company-settings.test.mjs`.

## D-025 — Activación real inicial completada

El 2026-11-09, con autorización expresa y precondiciones verificadas, se completó una única activación transaccional en milo_dev: Milo Store, identidad responsable autorizado, cuenta credential, perfil y asignación OWNER/COMPANY sin sucursal. Se creó solo la definición OWNER faltante. Sin sesiones automáticas, emailVerified=false y sin datos comerciales adicionales. Journal committed y reconciliación complete/previousAttempt=true; no repetir la activación. Las otras tablas, migraciones, Better Auth, Prisma, .env y Docker se conservaron. Respaldo previo íntegro y evidencia en evidencia local no versionada. El primer ingreso manual queda pendiente del responsable. Las referencias a preparación sin ejecutar corresponden a etapas anteriores.

## D-024 — Script local de activación inicial, preparado sin ejecutar

- Autorizada exclusivamente la preparación del CLI para Milo Store y responsable autorizado, con un plan local autorizado (actualmente configurado por entorno, sin datos personales en el repositorio). IDs de activación, tenant, perfil, asignación y posible definición OWNER reservados localmente, sin crear filas. No aceptar cambios de identidad/tenant/rol por argumentos ni adoptar identidades existentes por email.
- Dry-run predeterminado sin contraseña ni escrituras de archivos/datos; destino restringido a 127.0.0.1:5432/milo_dev, PostgreSQL 17, esquema public, versiones Better Auth 1.7.18 y Prisma 7.10.1, historial/checksums y restricciones verificados. Dry-run ejecutado: ready, sin intento previo. No se ejecutó el modo real.
- Preparada transacción Serializable, advisory lock e historial/duplicados revalidados dentro de ella. Better Auth local recibe solo delegados del mismo tx, sin cliente raíz ni transacción independiente. Dos creates permitidos (AuthUser/AuthAccount), con marcador xid/pid antes/después; sesiones, verificaciones y mutaciones ajenas bloqueadas. autoSignIn=false y emailVerified=false; UserProfile se enlaza al ID realmente persistido. Tenant y OWNER/COMPANY sin sucursal se crean en esa misma transacción futura. OWNER global válido se reutiliza; no se altera.
- Registro público sigue bloqueado en la configuración HTTP existente. La instancia privada del CLI no abre un servidor ni exporta handler. Better Auth genera la credencial; no hay hashing manual. Contraseña solo por TTY oculto con confirmación; no argumentos, archivos, logs o fallback de entorno. El journal .local ignorado por Git contiene solo IDs, tiempo y resultado, y su existencia bloquea otro intento.
- Ante falta de confirmación de commit, conservar journal/IDs y reconciliar por dry-run, sin compensación, promoción, cambios de contraseña ni reintento automático. No inferir unicidad SQL del nombre comercial o un solo OWNER total por empresa.
- Verificadas con transporte simulado la biblioteca real Better Auth, ausencia de sesión/verificación de correo, rollback simulado por etapa, fallo de credencial, duplicados, marcador transaccional y commit incierto. Posteriormente se autorizó una base temporal: la prueba PostgreSQL real pasó en las cuatro etapas, con las 26 tablas de aplicación vacías al finalizar y misma transacción/conexión en las escrituras Better Auth. La base se eliminó tras confirmar identidad y contenido. milo_dev conserva datos e historial, con respaldo actualizado verificado y dry-run ready; activación real no ejecutada. Prisma, migraciones, .env y Better Auth público permanecen intactos. Evidencia en [scripts/activation/README.md](../scripts/activation/README.md).
- Antes de ejecución futura: prueba real de rollback autorizada, respaldo reciente verificado, revisión final y autorización expresa; luego ingreso/cierre manuales del responsable en /acceso y /panel. Procedimiento y comandos en [scripts/activation/README.md](../scripts/activation/README.md).

> Estado actualizado D-023: `/acceso` ofrece ingreso real por correo/contraseña y `/panel` tiene estructura protegida empresarial. Solo se muestran cuenta, empresa y asignaciones reales autorizadas. Sin registro público, invitaciones, métricas ficticias ni módulos comerciales operativos. TenantStorefront permanece aplicado, sin integración editorial. Las referencias anteriores a ingreso informativo o login pendiente describen etapas previas.

Este registro distingue **Acordado**, **Previsto** y **Pendiente**. Las instrucciones vigentes del propietario reemplazan decisiones anteriores solo donde existe contradicción. La documentación resultante requiere aprobación antes de desarrollar cambios multi-tenant.

## D-022 — Preparación de TenantStorefront

- **Acordado y preparado:** relación opcional 1:1 desde Tenant, con tenantId UUID como PK/FK de TenantStorefront; slug global único, canónico y de máximo 63 caracteres; enums iniciales WHOLESALE y MANUAL; draft y published JSONB; publishedAt y revision positiva. Migración `20261109150000_add_tenant_storefront` generada comparando archivos locales, sin aplicarla a PostgreSQL.
- **Integridad preparada:** FK RESTRICT siguiendo el esquema comercial, índice único de slug y cinco CHECK de canonicidad, revisión positiva, documentos objeto y coherencia published/publishedAt. Draft obligatorio sin default, published/publishedAt opcionales y revision inicial 1. Se preservan los modelos, restricciones, migraciones comerciales y Better Auth existentes.
- **Contrato previsto:** JSON con schemaVersion independiente del token revision y bloques editoriales del contrato actual; ver [DATA_MODEL_V1.md](DATA_MODEL_V1.md#tenantstorefront--preparación-de-persistencia-editorial-d-022). La validación interna Zod y los conversores quedan pendientes; los CHECK solo exigen objetos.
- **Publicación manual acordada, implementación pendiente:** OWNER/ADMIN del tenant podrán editar/publicar con autorización server-side. Una publicación futura copia el borrador validado y guarda su fecha de forma atómica, comparando e incrementando revision para impedir sobrescrituras concurrentes. Editar borrador no cambia el snapshot público. El modelo no implementa esos casos de uso ni aumenta revision automáticamente.
- **Límites:** no se conecta el registro de D-021 a Prisma, no se crean tenants, no se habilitan registros abiertos, panel, login, endpoints, publicación ni acceso comercial. Personalización solo comercial; panel global MILO. No se cambia Tenant.priceVisibility ni Better Auth.
- **Pendientes:** validación detallada del JSON, compatibilidad de versiones, lectura sin publicación, reglas de cambio de slug/template/política después de publicar y autorización efectiva. No se definen renombres, reservas, despublicación ni historial de publicaciones. Revisar drift e historial reales y verificar SQL en PostgreSQL antes de una aplicación futura autorizada.

## D-001 — Plataforma SaaS multiempresa

- **Estado: Acordado.**
- Una plataforma SaaS compartida sirve a múltiples empresas (tenants), sobre código y aplicación comunes.
- Aislamiento lógico estricto de todos los datos de negocio entre tenants.
- Los datos tenant-scoped usan `tenant_id` o una convención equivalente única, consistente y documentada.
- Milo Store es el primer tenant de la plataforma.

## D-002 — Marca e identidad visual

- **Estado: Identidad actualizada por D-021: plataforma MILO, desarrolladora HenkoSoft y primer tenant Milo Store.**
- Una identidad SaaS global, separada de Milo Store y HenkoSoft.
- El panel administrativo y de ventas comparte colores, tipografías, componentes, navegación y diseño entre todas las empresas. La personalización comercial se actualiza en D-021.
- Sitios comerciales personalizables de forma acotada; sin white-label completo. El panel conserva su tema global.
- Cada tenant mantiene su propio logo para presupuestos, comprobantes, reportes y documentos comerciales de su empresa; el logo no cambia la interfaz global.

## D-003 — Información propia de cada empresa

- **Estado: Acordado en alcance; campos y políticas pendientes.**
- Cada tenant tendrá nombre comercial, razón social, CUIT y datos fiscales, dirección, contacto, logo, usuarios/empleados y datos comerciales propios.
- La protección, campos obligatorios, retención y permisos para estos datos deben definirse antes de producción.

## D-004 — Primer tenant y módulo mayorista

- **Estado: Acordado.**
- Milo Store utilizará primero la plataforma para venta mayorista de repuestos/productos para celulares.
- Se conserva el alcance mayorista V1; el catalogo publicado siempre es publico y Tenant.priceVisibility configura los precios por empresa.
- No autorregistro de compradores mayoristas. PWA instalable solo si no agrega complejidad significativa.
- Argentina, ARS, español y `America/Argentina/Buenos_Aires` para Milo Store.

## D-005 — Capacidades modulares futuras

- **Estado: Previsto; implementación fuera del alcance actual.**
- La plataforma podrá ofrecer módulos de reparaciones/órdenes de servicio, ventas minoristas, inventario/productos, gestión de clientes y distribución mayorista.
- Los módulos disponibles podrían depender del plan contratado.
- No diseñar ni implementar ahora todos los módulos ni construir un ERP anticipadamente.

## D-006 — Administración central, planes y suscripciones

- **Estado: Capacidad central acordada; alcance operativo y calendario pendientes.**
- La administración SaaS contempla empresas registradas, estado de sus cuentas, límites y módulos habilitados.
- Planes y suscripciones son parte del modelo futuro; no se implementan pagos de suscripción ni integraciones de pago en esta etapa.
- Definir permisos del operador SaaS para administrar información propia de plataforma, con mínimo privilegio y auditoría; no habilitar lectura de datos de negocio de tenants.

## D-007 — Arquitectura y tecnologías

- **Estado: Acordado.**
- Next.js, React, TypeScript y Tailwind CSS; aplicación modular monolítica y PostgreSQL previsto.
- Se conservan las decisiones no conflictivas existentes de Supabase PostgreSQL/Storage y Better Auth, Prisma ORM Community, shadcn/ui, Zod y GitHub.
- No incorporar microservicios sin una necesidad concreta. Docker/Compose opcionales.
- No cambiar tecnologías ni contratar servicios pagos sin autorización.

## D-008 — Aislamiento y seguridad

- **Estado: Acordado.**
- Resolver tenant y membresía en servidor; no confiar en `tenant_id` ni permisos enviados por el navegador.
- Toda operación tenant-scoped filtra y valida pertenencia. Usar FKs y restricciones tenant-aware para impedir asociaciones cruzadas.
- La administración SaaS puede gestionar información propia de la plataforma, como empresas registradas y estado de cuenta, pero ningún usuario accede a datos de negocio de otra empresa.
- RLS es defensa adicional; autorización server-side obligatoria si Prisma omite RLS.
- Mantener privacidad existente: precios/costos nunca en respuestas públicas; secretos y Prisma solo servidor; datos privados no se cachean entre tenants.

## D-009 — Sucursales

- **Estado: Acordado.**
- Cada empresa puede tener una o varias sucursales.
- Un empleado puede tener acceso asignado a una o varias sucursales de su empresa.
- Un administrador autorizado puede acceder a todas las sucursales dentro de su empresa.
- El acceso a sucursales no cambia el límite de tenant ni permite acceso a otra empresa.

## D-010 — Pertenencia de usuarios y alcance empresarial

- **Estado: Acordado.**
- Cada usuario pertenece a una única empresa. Cada empresa administra sus propios usuarios y empleados.
- Los permisos de cualquier usuario siempre están limitados a la empresa a la que pertenece; ningún usuario accede a datos de otro tenant.
- El alcance de un empleado puede cubrir una o varias sucursales de su tenant. Los administradores autorizados pueden cubrir todas las sucursales de su empresa.
- No se implementan permisos en esta decisión.

## D-011 — Roles y alcance de permisos

- **Estado: Roles y límites de alcance acordados; permisos específicos por acción pendientes.**
- Los roles de empresa son Dueño, Administrador, Encargado, Vendedor, Técnico y Depósito. Un empleado puede tener varios roles; los roles operativos pueden variar según sucursal.
- Dueño tiene control total de su empresa. Administrador tiene administración general, sin poder transferir la propiedad ni eliminar al Dueño.
- Encargado supervisa las sucursales asignadas y no administra usuarios ni modifica permisos. Vendedor se ocupa de operaciones comerciales. Técnico corresponde a reparaciones y órdenes de servicio. Depósito se ocupa de inventario y movimientos de stock.
- Dueño y Administrador tienen alcance general dentro de su empresa. Los roles operativos respetan las sucursales asignadas.
- Ningún usuario accede a otra empresa. La administración central de HenkoSoft permanece separada de los roles de las empresas.
- Esta decisión no define permisos específicos por acción ni autoriza implementación de autenticación o autorización.

## D-012 — Alcance funcional Mayorista V1

- **Estado: Acordado en alcance; detalles operativos e implementación pendientes.**
- El módulo inicial de Milo Store cubre empresas/configuración comercial, usuarios/sucursales, catálogo, categorías/marcas, precios mayoristas, clientes mayoristas, pedidos/ventas, inventario/stock y consulta de pedidos/operaciones, según `docs/WHOLESALE_V1_SCOPE.md`.
- Se mantienen solicitud/aprobacion manual, catalogo siempre publico, precios segun Tenant.priceVisibility y compra para clientes autorizados/activos, junto con inventario, pedidos y pagos manuales del alcance V1.
- Cada producto tiene una unidad base para inventario y puede ofrecer múltiples presentaciones de venta. Cada presentación tiene nombre, unidad, factor de conversión respecto de la unidad base, habilitación para nuevas ventas e importe mayorista propio en la lista general. Los pedidos preservan snapshots de presentación, cantidad, factor, cantidad equivalente en unidad base, precio e importe; saldo y movimientos de stock se expresan solo en la unidad base.
- Son ejemplos de presentación unidad individual, caja de 10 unidades, metro y rollo de 100 metros; no se fija un vocabulario cerrado de unidades.
- WhatsApp en el estado actual es un enlace saliente de contacto, no una integración API. No se incorporan pasarelas ni procesamiento automático de pagos.
- La definición del alcance no significa que las funciones estén implementadas: el repositorio contiene el sitio institucional multipágina y el portal informativo de Milo Store; el catálogo online y los flujos operativos siguen pendientes.
- El detalle de campos, estados, permisos específicos por acción y consultas aún no acordadas permanece pendiente. No se deben inferir funcionalidades adicionales.

## D-013 — Primera versión del esquema Prisma

- **Estado: Esquema inicial Prisma implementado; migracion init creada con create-only y aplicada previamente según confirmación del responsable.**
- El esquema de `MILO Mayorista V1` se expresa en `prisma/schema.prisma` con Prisma ORM 7.10.1 y `@prisma/client` 7.10.1; usa el adaptador PostgreSQL `@prisma/adapter-pg` 7.10.1.
- La conexion se obtiene de `DATABASE_URL` mediante `prisma.config.ts`. PostgreSQL local esta disponible y la migracion inicial fue aplicada previamente según confirmación del responsable.
- La etapa original no configuró autenticación. D-020 agrega Better Auth y el vínculo a UserProfile; no se agrega ExternalIdentityRef, Supabase ni RLS. Los estados no aprobados continúan como texto.
- El schema contiene `UnitOfMeasure` como catálogo global compartido, `Product.baseUnitCode`, `Product.allowsFractionalQuantity`, `ProductPresentation`, precio por presentación y snapshots comerciales extendidos en `OrderLine`.
- Los importes usan `Decimal @db.Decimal(18, 2)` y las cantidades/factores `Decimal @db.Decimal(18, 3)`. La migracion init contiene estas precisiones, PriceVisibility y restricciones adicionales; se aplicó previamente según confirmación del responsable.
- Los checks, indices unicos parciales y triggers adicionales estan incorporados en la migracion `init`, auditada y aplicada previamente a `milo_dev` según confirmación del responsable. No se introducen modelos `Sale`, `Employee` ni `Warehouse`.

## D-014 — Integridad obligatoria de roles e inventario

- **Estado: Requisitos acordados; SQL incluido en `prisma/migrations/20261108225754_init/migration.sql`, auditado y aplicado previamente a `milo_dev` según confirmación del responsable.**
- La migración `init` incluye `CHECK` que vinculan códigos de rol con su alcance, exigen coherencia entre `assignmentScope` y `branchId`, garantizan `StockBalance.quantityOnHand >= 0`, factor de conversión positivo y cantidades/factores/equivalente base positivos.
- Incluye índices únicos parciales para impedir repetir un rol global por tenant/usuario y repetir un rol por tenant/usuario/sucursal.
- La actualización del saldo y la inserción del movimiento correspondiente deben ser una operación transaccional protegida contra concurrencia y stock negativo. Los casos de uso normales del servidor no modifican snapshots históricos de `OrderLine`.
- Los identificadores técnicos OWNER, ADMIN, MANAGER, SALES, TECHNICIAN y WAREHOUSE fueron aprobados para MILO V1 y se usan en el CHECK de `RoleDefinition`.

## D-015 — Unidad base y presentaciones de venta

- **Estado: Modelo implementado en Prisma; restricciones y triggers SQL incluidos en `init`, auditada y aplicada previamente según confirmación del responsable a `milo_dev`.**
- Cada producto tiene una unidad base de inventario y puede tener varias presentaciones de venta, cada una con nombre, unidad y factor de conversión a la unidad base. Se puede deshabilitar para nuevas ventas sin borrar su historial.
- Cada presentación puede tener precio propio dentro de la lista general mayorista. `WholesalePrice` se relaciona con `ProductPresentation`, con unicidad por tenant y presentación.
- El inventario se conserva exclusivamente en unidad base. Los snapshots de `OrderLine` incluyen presentación/unidad, cantidad pedida, factor de conversión, cantidad equivalente en unidad base, precio e importe. Los movimientos de stock también se expresan en unidad base.
- Prisma fija `DECIMAL(18,2)` para importes y precios y `DECIMAL(18,3)` para cantidades y factores. La aplicación previa de `init` fue confirmada por el responsable.
- `UnitOfMeasure` es global y no admite unidades definidas por tenant. Los códigos y nombres a cargar aún no están definidos; el schema no incluye un listado sembrado.
- Las FKs compuestas a `UnitOfMeasure` vinculan unidad base y de presentación por dimensión. Los checks positivos y triggers de inmutabilidad de equivalencia/unidad base están incluidos en `init`; su aplicación previa fue confirmada por el responsable.
- `Product.allowsFractionalQuantity` se almacena explícitamente. Si restringe cantidad en presentación, cantidad base o ambas, y cómo redondear la conversión, requiere definición antes de los casos de uso.
- La actualización de `StockBalance` y la creación de `StockMovement` siguen siendo una operación transaccional protegida contra concurrencia y saldo negativo.

## D-016 — PostgreSQL local de desarrollo

- **Estado: Acordado para desarrollo local.**
- Docker Compose ejecuta la imagen oficial `postgres:17.11` en el contenedor `milo-postgres`, con base/usuario `milo_dev`, puerto publicado solo en loopback y volumen Docker persistente.
- La contraseña y `DATABASE_URL` viven en `.env`, ignorado por Git. `.env.example` contiene solo valores de ejemplo. Prisma 7 carga el archivo desde `prisma.config.ts`.
- Esta configuración es exclusivamente local; no agrega servicios, migraciones ni cambios de esquema.

## Contradicciones y reemplazos documentales

1. La documentación anterior describía Milo Store como una aplicación para una organización. Se reemplaza por la plataforma compartida multi-tenant; Milo Store pasa a ser su primer tenant.
2. La marca Milo Store antes representaba toda la aplicación. Ahora la marca SaaS será independiente y global; Milo Store identifica el primer tenant. El nombre de plataforma es MILO, aprobado en D-021.
3. La documentación anterior limitaba V1 exclusivamente a la tienda mayorista y posponía todo módulo futuro. Se conserva la tienda mayorista como primer módulo, y se documenta la capacidad modular futura solo a nivel de catálogo de posibilidades, sin diseño anticipado.
4. El logo de tenant se incorpora como identidad comercial para documentos y storefront; la personalización comercial acotada de D-021 no modifica la identidad visual global del panel.
5. La decisión anterior de una sucursal inicial queda reemplazada: cada empresa puede tener una o varias sucursales, con asignación de usuarios dentro del tenant.

## Decisiones pendientes

- Evolución de los activos visuales de MILO, conservando una identidad compartida para la plataforma.
- Onboarding/alta de empresas y asociación operativa de usuarios y empleados.
- Permisos específicos por acción dentro de los roles acordados y el modelo operativo de la administración central de HenkoSoft, manteniendo la separación entre roles empresariales y plataforma.
- CUIT y datos fiscales requeridos, validación, acceso, retención y borrado.
- Perfil y uso de logo en documentos, almacenamiento, permisos y versiones.
- Estados de cuenta, suspensión, baja, exportación y tratamiento de datos al cerrar un tenant.
- Planes, suscripciones, límites, módulos y fecha/alcance de la administración central.
- Controles concretos de RLS y rol de Prisma; pruebas de aislamiento por tenant.
- Hosting comercial, backups/restauración y costos de operación.
- Lista/códigos del catálogo global de unidades y reglas de redondeo; `UnitOfMeasure` no tiene datos iniciales definidos.
- Alcance operativo de `allowsFractionalQuantity` (cantidad comercial, equivalente base o ambas).
- La migración `init` ya incluye triggers para preservar la identidad de presentaciones referenciadas y la unidad base de productos con historial; no congela las líneas de pedido.
- Política de inmutabilidad de snapshots por estado del pedido: los estados comerciales siguen sin aprobarse, por lo que no se especifica trigger condicional.
- Si los pedidos deben conservar un snapshot de los datos de contacto del cliente y cuáles serían esos datos.
- Estrategia de integridad y consulta para la referencia polimórfica `AuditEvent.entityType`/`entityId`.
- Prisma ya carga `.env` desde `prisma.config.ts`; falta configurar las variables operativas de Better Auth.
- Ciclo de vida y estados comerciales, reglas de redondeo, vinculacion Customer-identidad externa y estrategia de bloqueo/reintentos en casos de uso multi-producto.

Esta actualización es documental. No autoriza por sí sola cambios de código, esquema, configuración ni integraciones. No se deben hacer commit o push como parte de esta tarea.


## D-017 - Migracion inicial preparada

- **Estado: Generada en modo create-only y auditada; aplicada previamente a `milo_dev` según confirmación del responsable.**
- Prisma Migrate creo `prisma/migrations/20261108225754_init/migration.sql` a partir del schema real. La migracion incluye los checks, indices unicos parciales y triggers de integridad adicionales documentados para la primera version.
- Los códigos de rol OWNER, ADMIN, MANAGER, SALES, TECHNICIAN y WAREHOUSE usados por el check fueron aprobados para MILO V1 y corresponden a los alcances COMPANY/BRANCH definidos en `DATA_MODEL_V1.md`.
- El responsable confirmó que `init` se aplicó exitosamente a `milo_dev` antes del cambio de sesión. No se volvió a verificar por falta de acceso al motor Docker; esto no implica una base vacía ni una migración pendiente.


## D-018 - Catalogo publico y visibilidad de precios

- Estado: Acordado para MILO V1.
- El catalogo de cada tenant siempre es publico; no existe una opcion para ocultarlo globalmente. Solo los productos publicados forman parte del catalogo. Se excluyen clientes, datos internos e inventario.
- Tenant.priceVisibility usa PUBLIC o AUTHENTICATED_CUSTOMERS y tiene default AUTHENTICATED_CUSTOMERS para nuevos registros. La migración no crea ni inicializa el tenant Milo Store; su valor inicial debe establecerse durante la inicialización de datos.
- En modo privado, solo una identidad autenticada vinculada a Customer autorizado/activo del mismo tenant puede recibir precios. UserProfile empresarial y CustomerAccessRequest no equivalen a esa identidad/autorizacion.
- Ver precios no concede permiso para comprar. Agregar lineas y confirmar pedidos se validan por separado en servidor; no se aprueba una matriz de permisos por accion.
- La aplicación tiene configuración y endpoint de Better Auth; el vínculo identidad-Cliente sigue pendiente. Se propone una referencia generica CustomerIdentity (tenantId, customerId, issuer, subject) con FK tenant-aware, con vínculo a Customer aún pendiente. Better Auth administra credenciales y sesiones; ver D-020.


## D-019 - Bloqueos de historia y ledger de inventario

- Estado: Acordado para integridad estructural de MILO V1; la migracion init create-only lo incorpora.
- OrderLine y cambios de identidad de ProductPresentation se coordinan bloqueando la fila de presentacion FOR UPDATE; stock writers y cambios de Product unit base bloquean la fila Product FOR UPDATE. Operaciones multi-fila deben adquirir locks en orden (tenantId,id) antes de leer.
- ProductPresentation conserva productId/unidad/dimension/factor despues de tener lineas historicas. Product conserva la unidad base mientras existan saldos o movimientos.
- StockMovement es append-only: se rechazan UPDATE, DELETE y TRUNCATE. No se define proceso de reverso.
- OrderLine permanece editable/eliminable hasta que se aprueben estados comerciales. La proteccion de snapshots cerrados depende de esa decision y de los casos de uso; no se agregan estados ni permisos por accion ahora.

## D-020 — Better Auth: identidad y sesiones, etapas 1 y 2

- **Estado:** implementación autorizada y preparada en código; migración aditiva generada sin aplicar, sin validación de integración contra PostgreSQL. La migración inicial fue aplicada exitosamente antes del cambio de sesión según confirmación del responsable; no se repite ni modifica y no se interpreta el acceso denegado a Docker como base vacía.
- Better Auth 1.7.18 administra identidad, credenciales y sesiones. MILO administra empresas, empleados, sucursales, roles y permisos. No se usa Organization. Esta decisión reemplaza la selección anterior de proveedor de autenticación; Supabase PostgreSQL/Storage no cambia por esta tarea.
- El paquete principal exporta `better-auth/adapters/prisma`, que reexporta su dependencia @better-auth/prisma-adapter; no se instala un adaptador adicional directamente. La versión instalada declara compatibilidad con Prisma 7, Next.js 16, React 19 y pg 8. Se conserva Prisma/adapter-pg 7.10.1. Se agrega server-only 0.0.1, utilizado tanto por Prisma como por auth.
- Modelos AuthUser, AuthSession, AuthAccount y AuthVerification, con IDs TEXT opacos. Email globalmente único. UserProfile.authUserId opcional y único, FK a AuthUser con ON DELETE RESTRICT y ON UPDATE RESTRICT. Cada perfil conserva un único tenant. Nunca vincular por email ni completar perfiles automáticamente. El hash password pertenece a Better Auth, nunca texto plano ni credenciales en modelos comerciales.
- `modelName` usa los delegates Prisma authUser/authSession/authAccount/authVerification; `@@map` determina las tablas SQL. `lib/auth.ts` reutiliza el Prisma Client existente. El handler oficial toNextJsHandler expone GET/POST con runtime Node.js.
- Registro público bloqueado con emailAndPassword.disableSignUp=true, efectivo tanto por HTTP como por API de servidor. No hay proveedores sociales; accountLinking está deshabilitado. No se implementan invitaciones: los empleados se incorporarán por invitación del OWNER o ADMIN. Proveedor de correo pendiente. Sin pantallas de login ni usuarios reales.
- Autenticación no concede autorización empresarial ni comercial. Los futuros casos de uso deben resolver UserProfile por session.user.id/authUserId y validar tenant/sucursales/permisos en servidor. Sin perfil, denegar acceso empresarial. UserProfile tampoco concede precios privados o compra: el vínculo Customer-identidad y su autorización siguen pendientes. El endpoint de autenticación no consulta modelos comerciales ni emite permisos.
- `.env.example` agrega BETTER_AUTH_URL y BETTER_AUTH_SECRET. `.env` permanece intacto. Las variables deben configurarse antes de usar autenticación; no se entrega un secreto real ni se configura correo. Para el build se usan variables temporales del proceso, sin persistirlas.
- Migración `20261109023000_add_better_auth` generada mediante diff del esquema anterior capturado frente al nuevo. No conecta a PostgreSQL ni necesita shadow database; agrega únicamente cuatro tablas, authUserId nullable, índices y FKs. No representa una verificación de drift ni de `_prisma_migrations`. Antes de aplicar en una etapa posterior, revisar historial/esquema reales con acceso restablecido. No se ejecuta migrate dev, deploy, reset ni db push.
- Referencias verificadas: [Prisma adapter](https://better-auth.com/docs/adapters/prisma), [Next.js](https://better-auth.com/docs/integrations/next) y [Email/password](https://better-auth.com/docs/authentication/email-password), contrastadas con exports, tipos e implementación de la versión instalada.
- Validaciones ejecutadas: prisma validate, prisma generate, lint, typecheck, build y git diff --check completados. El build final usa URL local y secreto aleatorio temporal en el proceso, sin persistirlos. test:auth pasa tres pruebas con transporte Prisma simulado: rechazo de registro por handler HTTP y API server-side sin acceso a datos; mapeo de los cuatro delegates; sesión de identidad sin UserProfile que no emite permisos ni consulta modelos comerciales. No son pruebas contra PostgreSQL. Se verificó por SHA-256 que .env e init permanecen idénticos y se compararon los 21 modelos comerciales contra el schema previo, con el vínculo autorizado como única diferencia. npm informó avisos de peers de plugins ESLint existentes; lint pasó y no se cambió esa herramienta.


## D-021 — Identidad y estructura pública de MILO

- Decisión aprobada: HenkoSoft es la desarrolladora, MILO la plataforma SaaS y Milo Store el primer tenant. Esta decisión reemplaza el nombre pendiente del SaaS; el panel mantiene una identidad visual global y los sitios comerciales pueden personalizarse mediante plantillas reutilizables, sin white-label completo.
- Institucional: /, /plataforma, /funcionalidades, /soluciones, /nosotros y /contacto. Portal comercial: /tiendas/milo-store. La URL se conserva mediante `app/(comercial)/tiendas/[slug]`. El slug selecciona únicamente contenido editorial público; no implementa resolución de Tenant en Prisma ni acceso a datos comerciales.
- /acceso presenta el estado del ingreso, sin formularios, alta, autenticación adicional ni paneles. La integración existente de Better Auth no cambia. Las capacidades se comunican como previstas/en desarrollo; no se presentan módulos como operativos.
- Layout raíz mínimo y grupo institucional con header/footer de MILO. El grupo comercial usa un shell y una plantilla mayorista en components/storefront, sin booleanos de identidad en los componentes institucionales. Milo Store conserva contenido, logo, SVG, WhatsApp, metadatos y apariencia azul/grafito/plateada; las variables --store-* se aplican solo bajo .storefront. El panel mantiene su identidad global.
- Navegación móvil con botón accesible y cierre por Escape, enlaces de página reales, salto al contenido, foco visible, respeto de movimiento reducido y metadatos específicos por página. Se reutilizan CSS, SVG y Tailwind 4, sin nuevas dependencias ni fuentes remotas.
- El WhatsApp existente se mantiene exclusivamente como contacto comercial de Milo Store. No se inventan datos de HenkoSoft, precios, planes, clientes o testimonios; el canal institucional queda explícitamente pendiente. No se configura un dominio ni se publica el sitio.
- Estado local confirmado en etapas anteriores: ambas migraciones aplicadas y Better Auth configurado/verificado con lecturas reales. Los estados de D-020 describen la preparación histórica y no implican que add_better_auth continúe pendiente. Esta tarea pública no modifica .env, Better Auth, Prisma, las migraciones ni PostgreSQL.
- Validación de esta etapa pública: lint, typecheck, build y git diff --check completados. Se regeneraron los tipos de rutas de Next tras trasladar la portada. Se verificaron por HTTP las ocho rutas y sobre el HTML del build final 142 enlaces internos, 12 anclas, un H1 por página, ausencia de formularios/IDs duplicados y noindex de /acceso. La vista visual/interactiva no pudo verificarse: la herramienta rechazó acceso a Chrome y la política bloqueó el servidor temporal de revisión. Build ejecutado con una URL HTTPS temporal de proceso para respetar las validaciones de producción, sin modificar .env. Los hashes de autenticación, Prisma, migraciones, .env, .env.example y dependencias permanecen intactos.

### D-021 — Fases 2 y 3: plantilla y registro editorial

- Implementación autorizada: contratos TypeScript públicos, plantilla wholesale y shell comercial reutilizables, layout/página dinámicos por slug, icono comercial conservado y validación server-side. Se retira la ruta fija anterior para evitar precedencia sobre [slug].
- Registro editorial server-only con una única entrada real: milo-store. Slug validado con Zod (minúsculas ASCII, dígitos y guiones simples, máximo 63 caracteres). Valores desconocidos o inválidos devuelven 404, sin fallback a otra tienda. dynamicParams=false y generateStaticParams limitan la generación a la lista editorial; los resolutores también validan layout, metadatos y ruta del icono.
- No hay tenantId, membresía, credenciales ni permisos en StorefrontConfig. El registro no consulta Prisma/PostgreSQL ni crea tenants. No debe usarse como autorización para operaciones privadas. No se habilitan catálogo, login, panel, registro de usuarios ni políticas de alta.
- Colores y contenidos son configuración editorial tipada existente en código, no campos nuevos de Tenant ni un constructor visual. La persistencia, administración y validación de personalización externa quedan para una etapa futura autorizada.
- Zod 4.6.7 ya estaba instalado por Better Auth y se declara ahora como dependencia directa para validar la entrada externa de la ruta. No se instala una biblioteca visual ni un paquete adicional.
- Validaciones de fases 2 y 3: lint, typecheck, build y git diff --check completados. Dos pruebas del registro pasan, incluida validación negativa de 25 entradas desconocidas/malformadas. Verificación HTTP: /tiendas/milo-store e icono 200; tiendas desconocidas, constructor, variante en mayúsculas e icono desconocido 404. Build con fallback=false para la página y un único slug prerenderizado. Se conservan 37 fragmentos de contenido comercial revisados, el título y el SVG; las 224 reglas CSS institucionales/compartidas permanecen iguales y las reglas comerciales extraídas están acotadas a .storefront. El build usa una URL HTTPS temporal de proceso sin modificar .env. No se consulta PostgreSQL. Hashes de autenticación, Prisma, migraciones, .env, .env.example, logo y páginas institucionales sin cambios.

### D-022 — Aplicación controlada verificada

El 2026-11-09 se confirmó la conexión a `127.0.0.1:5432/milo_dev` (PostgreSQL 17.11), las dos migraciones anteriores completas con checksums coincidentes y una única pendiente. Por autorización expresa se añadió BEGIN/COMMIT con lock_timeout=10s y statement_timeout=60s a la migración pendiente, conservando su DDL y cinco CHECK. Prisma 7.10.1 ejecutó únicamente add_tenant_storefront mediante migrate deploy.

Respaldo completo: evidencia local no versionada (84.775 bytes); pg_dump -Fc 17.11, pg_restore --list (191 entradas) y lectura completa sin restaurar, todos correctos. SHA-256: `d07f4fd25762bd24e0c7c8ef3cedbaf2e94532b405907922d1bec7c2c17d90a8`. Evidencia técnica en archivos .audit.json y .verified.json del mismo nombre base fuera del repositorio.

Verificados tabla vacía, dos enums, PK/índice único de slug, FK RESTRICT y cinco CHECK validados. Historial anterior intacto y huellas de esquema/datos de las 25 tablas previas coincidentes, incluidas las cuatro tablas Better Auth. migrate status al día, prisma validate correcto y diff real/schema vacío. Sin crear usuarios, tenants ni datos comerciales ni modificar .env, Docker o Better Auth. La edición/publicación de storefront y su autorización efectiva siguen pendientes.

## D-023 — Ingreso real y estructura inicial del panel empresarial

Implementado por autorización expresa: formulario real en /acceso mediante el cliente de Better Auth existente y cierre de sesión. La configuración y el handler Better Auth permanecen intactos, incluido disableSignUp=true; no hay registro público, OAuth, invitaciones ni recuperación de contraseña. Validación de formulario con Zod y validación independiente en servidor mediante Better Auth. Errores de credenciales genéricos, sin revelar existencia de cuenta ni propagar detalles del proveedor. Destinos de navegación fijos y del mismo origen.

El guard server-only reutilizable `lib/panel/access.ts` verifica sesión vigente en Better Auth sin cookie cache ni refresh desde RSC, resuelve UserProfile exclusivamente por authUserId y exige tenant existente/coherente. Consulta asignaciones por tenantId y userProfileId del servidor. OWNER/ADMIN conservan alcance COMPANY; MANAGER/SALES/TECHNICIAN/WAREHOUSE, BRANCH con sucursal de la misma empresa. Roles desconocidos, relaciones inconsistentes y errores de servicio deniegan acceso. Sin sesión redirige a /acceso; sin perfil/tenant muestra una negativa genérica y permite cerrar sesión. No usa email, encabezados o parámetros enviados por el navegador para determinar pertenencia.

El layout y la página /panel ejecutan el guard; React cache solo deduplica el render de una petición, sin caché compartida entre usuarios. Cada futura página, acción o endpoint protegido deberá invocarlo de nuevo y autorizar su operación. Esta primera pantalla solo admite consultar la propia cuenta, empresa y asignaciones; un perfil válido sin roles ve su cuenta y la ausencia de asignaciones, sin adquirir permisos operativos. No se infieren estados de Tenant.accountStatus, cuya semántica sigue pendiente. No se entregan tokens, credenciales ni datos fiscales, clientes, precios o inventario al shell del panel.

Sidebar responsive y topbar con identidad global MILO en azul, negro, gris y plateado. La personalización del tenant no modifica el panel. /acceso y /panel se renderizan dinámicamente y quedan fuera de indexación; el cierre invalida la sesión con Better Auth y realiza navegación completa para descartar el árbol privado del router. Solo cambió la página pública de acceso; el resto de páginas públicas, storefront, Prisma, migraciones y .env se preservan.

Verificación: 18 pruebas automatizadas con fixtures solo en memoria, incluido ingreso/cookie/cierre y registro bloqueado en el handler real, además de accesos permitidos/denegados del guard para seis roles, múltiples sucursales y cruces de tenant. Lint, typecheck y build con BETTER_AUTH_URL HTTPS temporal de proceso correctos. Comprobaciones HTTP de producción aislada sin PostgreSQL: /acceso 200, /panel anónimo o con identidad/rol/cookie falsificados redirige a /acceso, siete rutas públicas 200, tienda desconocida 404, registro bloqueado y correo malformado rechazado. Cache-Control del acceso: private/no-store. No se crearon usuarios, tenants ni sesiones reales. La comprobación visual en navegador no estuvo disponible por falta del host de automatización; no se probó un ingreso con credenciales reales.

## D-036 — Altura disponible y densidad del panel MILO

El panel usa un shell de 100dvh con sidebar y contenido desplazables de forma independiente; topbar y pie permanecen dentro de la altura disponible. El dashboard reduce espacios y estados vacíos, mantiene indicadores arriba, actividad al centro y accesos debajo, y aprovecha seis columnas de accesos en escritorio amplio. Las filas respetan la altura del contenido: pantallas pequeñas, texto largo o zoom pueden requerir desplazamiento interno sin recortar información ni acciones. En móvil el menú mantiene su apertura por botón y Escape, con altura limitada y scroll interno.

Los listados existentes tienen regiones desplazables enfocables por teclado y encabezados de tabla sticky. Se mantienen las rutas y formularios de productos. Este ajuste es exclusivamente de presentación; no cambia módulos disponibles, datos, permisos ni autenticación. Objetivo visual: dashboard sin scroll a 1920 × 1080 y zoom 100 %, conservando adaptación a 1366 × 768 y móvil. La comprobación visual y la medición de desbordamientos quedan pendientes porque el host de acceso al navegador no está disponible en este entorno.

## D-037 — Alta y edición de productos desde el listado

El listado administrativo abre un diálogo nativo amplio para alta/edición sin desmontar búsqueda, paginación ni contenedores desplazables. Los enlaces conservan sus destinos reales `/panel/productos/nuevo` y `/panel/productos/[id]` para acceso directo, recarga, apertura en otra pestaña y navegación sin JavaScript. El formulario compartido organiza Datos y Precios en pestañas accesibles, con Cancelar/Guardar fuera del cuerpo desplazable y opciones técnicas bajo Opciones avanzadas. La distribución habitual usa columnas compactas; configuraciones especiales, zoom y pantallas menores admiten scroll interno. No se añaden costos, impuestos ni listas de precios.

La carga bajo demanda valida el identificador con Zod y delega en las lecturas existentes, que verifican identidad, OWNER/ADMIN y tenant en servidor. Guardado, auditoría, locks, snapshots y versiones siguen en las acciones y servicios existentes. No se modifican datos, esquema ni autenticación. Guardar correctamente cierra el diálogo y refresca el listado en su URL actual, restaurando foco y desplazamiento hasta donde permitan los resultados. Cancelar, Escape, Atrás y la salida/recarga de la página advierten sobre cambios sin guardar; se impide cerrar durante una escritura. Los formularios avanzados conservan su guardado independiente: no se permite guardar uno descartando cambios pendientes de otro.

La verificación visual y de interacción real en navegador queda pendiente por indisponibilidad de su host; el ajuste no constituye una reproducción visual validada de las capturas anteriores, que no estaban disponibles en el contexto de esta tarea.

Los campos de precio habitual y por presentación muestran formato argentino (100.000,00) y completan dos decimales al salir del campo. La conversión de entrada localizada a decimal canónico usa cadenas exactas, sin Number ni redondeo; los separadores de miles mal formados y el exceso de precisión se rechazan. El servidor conserva su contrato decimal y validación Zod existentes. Los factores de conversión mantienen su formato y precisión actuales.
