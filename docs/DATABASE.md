# Diseño conceptual de datos multi-tenant

> D-039: el plan de activación se suministra privadamente por variables MILO_ACTIVATION_*, sin datos personales ni identificadores reales en el código. Se conservan journals y evidencias fuera de Git; las referencias históricas a un plan fijo quedan superadas. No se ejecuta activación ni se modifican datos en esta preparación. Ver DECISIONS.md y scripts/activation/README.md.

> D-038: `100.000,00` es el formato obligatorio de interfaz para todos los importes actuales y futuros. La persistencia mantiene decimales exactos y moneda según el modelo existente; no guarda separadores localizados ni cambia esquema, precisión o datos. Ver [MONEY_FORMAT.md](MONEY_FORMAT.md).

> D-034: la investigación del ingreso fallido confirmó con READ ONLY cero movimientos, saldos y auditorías de inventario de Milo Store en ese momento. La estructura migrada era correcta; el fallo provenía de un cliente antiguo en memoria. Se corrigió la caché de aplicación y el diagnóstico, sin SQL de escritura, regeneración o cambios de esquema/migraciones. Ver DECISIONS.md.

> Estado D-033, 2026-11-10: aplicada exclusivamente `20261109220000_add_inventory_manual_trace` a milo_dev tras respaldo verificable y comprobación de compatibilidad. Dos columnas nullable y dos CHECK validados; cuatro migraciones al día, diff Prisma vacío y datos anteriores de las 27 tablas conservados. No hubo cambios en otras tablas salvo la entrada estándar del historial Prisma. Las referencias siguientes a migración pendiente describen la preparación. Ver DECISIONS.md para respaldo/evidencia.

### Inventario manual y migración pendiente (D-033)

Preparada, sin aplicar a milo_dev, la migración `20261109220000_add_inventory_manual_trace`: agrega reason VARCHAR(1000), sourceReference VARCHAR(200) nullable y CHECKs acotados a MANUAL_RECEIPT/MANUAL_ADJUSTMENT. Conserva historial, PK UUID, FKs y triggers append-only/no negativo; no crea documentos ni reinterpreta sourceOrderId. Operaciones con Decimal exacto, incremento firmado y movimiento/auditoría en transacción bajo lock Product; UUID estable evita duplicados y permite reconciliar commits inciertos. Verificados ingreso, ajuste, idempotencia, aislamiento, concurrencia y rollback en PostgreSQL temporal, eliminada con fingerprints coincidentes. Escrituras bloqueadas donde falten campos/CHECK validados; milo_dev intacto. Ver D-033.

### Agregados de lectura del dashboard (D-032)

Sin DDL ni escrituras. Total clientes = COUNT de Customer del tenant, todos los estados; no implica cliente aprobado. Total productos = COUNT de Product del tenant, publicados y no publicados. Solo OWNER/ADMIN COMPANY, con membresía revalidada y lecturas RepeatableRead; errores no se convierten en cero. No se agregan pedidos como ventas, montos, estados comerciales nuevos o filtros de una sucursal activa inexistente. Pruebas del transporte simuladas. Ver D-032.

### Uso administrativo de Branch (D-031)

Sin DDL/migraciones ni datos nuevos durante la implementación. Branch se crea con tenantId resuelto en servidor y nombre; solo name/updatedAt pueden actualizarse, con comparación de versión y auditoría en una transacción Serializable. No se inventa unicidad de nombre. FKs tenant-aware/RESTRICT de Tenant, UserRoleAssignment, WholesaleOrder, StockBalance y StockMovement permanecen intactas. No hay borrado ni escrituras en tablas relacionadas. Persistencia/rollback probados en memoria, sin integración PostgreSQL de esta etapa. Ver D-031.

### Persistencia de carga rápida (D-030)

Sin DDL ni cambios de datos durante la implementación. El nuevo flujo guarda ficha, presentación individual UN/COUNT factor 1 y precio explícito en una transacción ReadCommitted con auditoría atómica. Unidad/dimensión y moneda se validan desde la base; en edición se bloquea Product y la presentación elegida, se controlan los tres updatedAt y se preservan identidad e historial. Un precio cero explícito se distingue de ausencia de precio. Las configuraciones ambiguas o especiales se conservan para edición avanzada. No se escriben StockBalance/StockMovement ni se migran productos existentes. Pruebas nuevas solo con transporte en memoria. Ver D-030.

### Persistencia administrativa de marcas y presentaciones (D-029)

Sin cambios de esquema/migraciones. Brand, ProductPresentation y WholesalePrice se escriben con allowlists tenant-scoped, control de versión y AuditEvent mínimo en la misma transacción. FKs compuestas de producto/unidad/dimensión y factor positivo conservados. Presentaciones con historial mantienen su identidad; bloqueo Product→ProductPresentation coordina lectura de historial y escritura bajo ReadCommitted, con tiempo de espera acotado. Precio separado con moneda real comprobada y sin valor implícito; se conserva exactitud Decimal(18,2)/(18,3). Pruebas de persistencia/rollback en memoria, sin escrituras en milo_dev ni verificación de integración PostgreSQL de este módulo. Ver D-029; supera la lectura exclusiva de D-027.

> D-028: cargadas y verificadas en milo_dev únicamente las unidades compartidas `UN / Unidad / COUNT` y `M / Metro / LENGTH`, en una transacción Prisma y sin sobrescrituras. Tres migraciones al día; demás tablas y datos existentes sin cambios. No hubo cambios de esquema. Las referencias a cero unidades corresponden al estado previo.

### Catálogo administrativo inicial (D-027)

Sin cambios de esquema o migraciones. Categorías y productos se crean/editan con tenantId derivado en servidor, FKs tenant-aware, unicidad SKU por tenant, concurrencia por updatedAt y auditoría en la misma transacción Serializable. Solo cambian metadatos autorizados; base/dimensión/fraccionamiento existentes, presentaciones, precios y tablas históricas permanecen intactos. Prisma Decimal se serializa con escala 3/2 sin Number ni cálculos. No hay eliminación. La inspección de lectura encontró cero unidades compartidas en milo_dev; no se cargaron unidades ni productos ficticios. Pruebas de persistencia/rollback simuladas, sin escrituras sobre datos reales.

### Configuración de empresa funcional (D-026)

Sin cambios de esquema/migraciones. commercialName opcional se edita mediante una transacción Serializable tenant-scoped con control optimista por updatedAt. Se registra AuditEvent con actor del mismo tenant, action TENANT_COMMERCIAL_NAME_UPDATED y referencia lógica al Tenant actualizado; sin copiar datos de contacto o valores comerciales. Un fallo del evento revierte la actualización. Dirección/contactData conservan sus contratos pendientes y no se escriben; moneda/locale/zona/priceVisibility solo se consultan. Pruebas de persistencia/rollback del módulo realizadas en memoria, sin alterar milo_dev.

> D-025, 2026-11-09: activación inicial completada en milo_dev con un tenant, una identidad/cuenta credential, un perfil y una asignación OWNER/COMPANY sin sucursal. Solo se añadió la definición OWNER faltante. Journal committed, dry-run complete y sin cambios ajenos al alta autorizada; esquema/migraciones intactos. Las referencias a preparación sin datos son históricas.

### Preparación local de activación (D-024)

El [CLI de activación](../scripts/activation/README.md) valida destino local milo_dev, PostgreSQL 17, historial/checksums de las tres migraciones y restricciones relevantes con una conexión read-only. Sobre milo_dev se ejecutó únicamente dry-run: ready, sin intento previo, sin cambios de esquema o datos. El rollback real de la transacción Serializable pasó en las cuatro etapas sobre una base temporal autorizada, migrada, verificada vacía y eliminada. Se comprobó el mismo xid/pid en las escrituras Better Auth. Respaldo de milo_dev actualizado y verificado; activación real aún no ejecutada.

> Estado actualizado D-023: `/acceso` ofrece ingreso real por correo/contraseña y `/panel` tiene estructura protegida empresarial. Solo se muestran cuenta, empresa y asignaciones reales autorizadas. Sin registro público, invitaciones, métricas ficticias ni módulos comerciales operativos. TenantStorefront permanece aplicado, sin integración editorial. Las referencias anteriores a ingreso informativo o login pendiente describen etapas previas.

## Persistencia editorial preparada (D-022)

`TenantStorefront` usa tenantId UUID como PK/FK RESTRICT a tenants; la relación inversa es opcional y no agrega una columna a tenants. Slug VARCHAR(63) único global, enums WHOLESALE/MANUAL, draft JSONB obligatorio, published JSONB y publishedAt opcionales, revision inicial 1 positiva y timestamps según convención. Cinco CHECK cubren slug ASCII canónico, revisión positiva, ambos documentos objeto y pareja de publicación coherente. No hay datos ni defaults de contenido editorial.

La migración `20261109150000_add_tenant_storefront` compara el schema anterior con el nuevo, ambos locales; solo crea enums, tabla, índice y restricciones de la nueva tabla. No se modificaron migraciones previas; la nueva migración se aplicó con autorización expresa. Los CHECK se añadieron al SQL porque Prisma no los expresa en el schema. Historial, checksums, drift y CHECK verificados en la aplicación controlada de D-022. Ver [contrato y publicación previstos](DATA_MODEL_V1.md#tenantstorefront--preparación-de-persistencia-editorial-d-022) y [procedencia del SQL](../prisma/migrations/20261109150000_add_tenant_storefront/README.md).

> Estado público vigente (D-021): MILO es la plataforma de HenkoSoft. Sitio institucional multipágina en `/`; Milo Store en `/tiendas/milo-store`; `/acceso` solo informa el estado del ingreso. Sin nuevos módulos, pantallas privadas ni cambios de datos. Las referencias históricas a una única landing quedan reemplazadas por esta estructura.

## Estado

Este documento establece la convencion de aislamiento y las entidades de datos. El esquema Prisma esta en `prisma/schema.prisma`; la migracion init se genero en modo create-only y está aplicada según confirmación del responsable.

El alcance funcional del primer tenant se define en [WHOLESALE_V1_SCOPE.md](WHOLESALE_V1_SCOPE.md). Las entidades están declaradas en el esquema inicial; esto no significa que los flujos comerciales estén implementados ni que las restricciones SQL pendientes estén aplicadas.

La plataforma prevé una aplicación y una base PostgreSQL compartidas. El repositorio incorpora Prisma ORM 7.10.1, el adaptador PostgreSQL y Better Auth 1.7.18. Existe configuración local de PostgreSQL 17; no se comprobó conexión desde esta sesión. Esta etapa no configura Supabase, Storage ni RLS.

## Identidad global y migración aditiva

Se agregan AuthUser, AuthSession, AuthAccount y AuthVerification, tablas globales `auth_users`, `auth_sessions`, `auth_accounts` y `auth_verifications`, sin tenant_id: gestionan identidad/credenciales/sesiones de Better Auth, nunca datos comerciales. Sus IDs son texto opaco generado por Better Auth; los IDs comerciales existentes siguen siendo UUID.

AuthUser contiene email globalmente único. AuthSession y AuthAccount referencian AuthUser con borrado en cascada; AuthAccount conserva el hash de contraseña administrado por Better Auth, nunca texto plano, y tiene unicidad providerId/accountId. UserProfile agrega authUserId nullable y único con FK a AuthUser e `ON DELETE RESTRICT`/`ON UPDATE RESTRICT`. No se vinculan registros por email ni se completan perfiles existentes automáticamente. El perfil conserva tenantId obligatorio.

`20261108225754_init` fue aplicada previamente según confirmación del responsable. El historial real y los checksums fueron verificados en la etapa de aplicación controlada. `20261109023000_add_better_auth` se generó con `prisma migrate diff --from-schema <schema anterior capturado> --to-schema prisma/schema.prisma --script`, sin base ni shadow database. Solo agrega cuatro tablas, una columna nullable, índices y FKs; no modifica `init`, no borra datos ni recrea restricciones comerciales. Fue aplicada posteriormente con respaldo previo verificado; migrate status y el diff final no detectaron diferencias. La comparación inicial entre esquemas no sustituye esas verificaciones de la base real.

## Convención de tenant

`Tenant` es la empresa cliente de la plataforma. Toda entidad de negocio propiedad de un tenant llevará `tenant_id` como FK a `Tenant.id`, con el mismo tipo, nombre y semántica en las tablas. Excepciones globales (por ejemplo, planes SaaS) se documentarán expresamente y no usarán `tenant_id` salvo que el dato sea propiedad de una empresa.

Las consultas se limitan al tenant autorizado en servidor. Las restricciones de unicidad y las relaciones entre filas tenant-scoped deben incluir `tenant_id` cuando corresponda. Usar FKs compuestas para evitar relaciones entre datos de empresas distintas. No basta con IDs aleatorios o filtros en la UI como aislamiento.

## Entidades conceptuales del tenant y el módulo inicial

| Área | Entidades conceptuales | Alcance |
|---|---|---|
| Empresa | `Tenant` | Nombre comercial, razón social, CUIT, datos fiscales, dirección, contacto, logo y estado de cuenta según los campos que se aprueben. El logo se destina a documentos de la empresa, no al tema visual del SaaS. |
| Usuarios, roles y sucursales | `UserProfile`, `Branch`, asignaciones de rol | Cada usuario pertenece a exactamente un tenant; la empresa administra sus usuarios/empleados. Un empleado puede tener varios roles. Los roles operativos pueden estar asociados a sucursales mediante asignaciones conceptuales, permitiendo roles diferentes por sucursal. Dueño y Administrador tienen alcance general dentro del tenant; Encargado, Vendedor, Técnico y Depósito respetan las sucursales asignadas. La relación debe impedir asignaciones a sucursales de otro tenant. No se definen permisos por acción ni tablas finales. |
| Clientes mayoristas | `Customer`, `CustomerAccessRequest` | Compradores del tenant de distribución mayorista y solicitudes de acceso con aprobación manual. No confundir estos clientes con la empresa tenant. |
| Catálogo | `Product`, `ProductPresentation`, `UnitOfMeasure`, `Category`, `Brand`, `ProductImage` | Productos, SKU, nombre/descripción, unidad base de inventario, presentaciones de venta, clasificación, publicación e imágenes. `UnitOfMeasure` es un catálogo global compartido, sin unidades personalizadas por tenant ni listado definitivo todavía. |
| Precios | `WholesalePrice` | Una lista general mayorista por tenant, con un precio independiente por presentación de venta. |
| Inventario | `StockBalance`, `StockMovement` | Saldo operativo y ledger de entradas, salidas y ajustes registrados por tenant, con sucursal cuando aplique. |
| Pedidos | `WholesaleOrder`, `OrderLine`, `OrderStatusEvent` | Pedidos y líneas con snapshots; estados e historial del tenant. |
| Pagos | `PaymentRecord` | Registro y confirmación manual asociados a pedidos del tenant. |
| Auditoría | `AuditEvent` | Actor, fecha, tenant/alcance y acción sensible. Distinguir acciones tenant-scoped y operaciones de plataforma; la administración central no accede por ello a datos de negocio de tenants. |

Estos son nombres conceptuales, no nombres de tablas ya implementadas. No agregar modelos para módulos futuros antes de aprobar su etapa.

## Datos globales de plataforma

Los planes y suscripciones se documentan como entidades globales futuras, por ejemplo `Plan` y `Subscription`, que se relacionan con un tenant. Los límites y módulos disponibles podrían expresarse en configuración de plan o entitlements. No se define aún la forma final, ciclo de vida, facturación ni procesamiento de pagos de suscripción.

El catálogo de capacidades potenciales puede incluir reparaciones/órdenes de servicio, venta minorista, inventario/productos, gestión de clientes y distribución mayorista. Esta lista no requiere crear ahora las tablas de cada módulo.

## Reglas de integridad

- Cada registro empresarial, incluida cada presentación, tiene `tenant_id`; `UnitOfMeasure` es un catálogo global compartido sin tenant.
- Al leer o escribir, validar en servidor membresía, tenant efectivo, permiso y estado de la cuenta. El navegador no determina el tenant autorizado.
- Cada usuario pertenece a un solo tenant. La empresa administra sus usuarios y empleados; no existe acceso de usuario a datos de otro tenant.
- Una asignación de empleado puede vincularlo a varias sucursales, siempre dentro de su tenant. Un administrador autorizado puede acceder a todas las sucursales de su empresa. El alcance de sucursal no cruza ni altera el tenant.
- Roles acordados: Dueño (control total de su empresa); Administrador (administración general, sin transferir propiedad ni eliminar al Dueño); Encargado (supervisa sucursales asignadas, sin administrar usuarios ni modificar permisos); Vendedor (operaciones comerciales); Técnico (reparaciones y órdenes de servicio); Depósito (inventario y movimientos de stock). Técnico refiere a un módulo de plataforma futuro, no amplía V1 de Milo Store.
- Dueño y Administrador tienen alcance general dentro de su tenant. Los roles operativos respetan las sucursales asignadas; un usuario puede tener más de un rol y los roles operativos pueden variar según sucursal.
- La administración central de HenkoSoft se mantiene separada de los roles empresariales. No se deriva de ella acceso a datos de negocio de empresas.
- Las restricciones únicas tenant-scoped incluyen `tenant_id` cuando la unicidad deba ser independiente por empresa (por ejemplo, SKU). Las relaciones validan que ambos lados pertenezcan al mismo tenant.
- El registro de una solicitud mayorista no crea por sí solo una cuenta autorizada. La aprobación es manual.
- El catalogo publico aplica Tenant.priceVisibility en servidor; los precios privados no se seleccionan ni serializan para solicitudes anonimas/no autorizadas.
- El inventario se almacena y controla exclusivamente en la unidad base del producto; `StockBalance` y `StockMovement` no se expresan en presentaciones de venta.
- Cada variación de stock crea un movimiento persistente; movimiento y saldo se actualizan en una transacción protegida contra concurrencia. Nunca permitir saldo negativo ni edición directa.
- Las presentaciones se pueden deshabilitar para nuevas ventas sin borrar registros ni su historia. Cada presentación puede tener su propio precio en la lista general.
- La unidad base y la unidad de cada presentación deben pertenecer a la misma dimensión; el schema lo modela mediante FKs compuestas hacia el catálogo compartido y desde la presentación hacia el producto.
- Los pedidos preservan snapshots de producto/SKU, presentación/unidad, cantidad, factor de conversión, cantidad equivalente en unidad base, precio e importe. Precio y total se calculan en servidor.
- Pedido y pago tienen estados separados. Los registros manuales de pago conservan actor, fecha, importe, moneda y referencia disponible.
- Datos de identidad, fiscales, contacto y logo se minimizan y protegen según políticas de acceso y retención pendientes.
- Usar tipos decimales exactos para dinero y cantidades y moneda ARS en el tenant inicial; timestamps UTC; FKs, restricciones y migraciones Prisma versionadas. El schema Prisma fija `DECIMAL(18,2)` para importes/precios y `DECIMAL(18,3)` para cantidades/factores; la aplicación previa de init fue confirmada por el responsable.
- Prisma opera exclusivamente en servidor. RLS puede complementar el aislamiento, no reemplazar autorización de aplicación si la conexión lo omite.
- El schema Prisma modela precio por presentación (`ProductPresentation`) y snapshots extendidos de líneas. Las precisiones están declaradas en el schema y en el SQL de la migración `init`; esta está aplicada según confirmación del responsable a PostgreSQL.
- Prisma no representa directamente los cinco `CHECK` ni los dos índices únicos parciales incluidos en el SQL de `init`: códigos de rol por alcance, coherencia entre alcance y sucursal, stock no negativo, factor de conversión positivo y cantidades/factores/equivalente base positivos; unicidad de asignaciones globales y por sucursal. Su aplicación previa fue confirmada por el responsable; no se verificó nuevamente contra PostgreSQL.
- La migración `init` también incluye triggers para impedir cambiar la identidad de una presentación referenciada por líneas y la unidad base de un producto con saldo o movimiento, además de coordinar bloqueos para las escrituras relacionadas. La migración está preparada y auditada y aplicada previamente según confirmación del responsable. La inmutabilidad de snapshots históricos depende de los casos de uso; no se agrega una regla condicional a estados de pedido todavía no definidos.
- La actualización de `StockBalance` y la inserción de `StockMovement` deben ejecutarse en una transacción, protegidas de concurrencia y de saldo negativo. Los casos de uso normales no deben editar los snapshots históricos de `OrderLine`.

## Pendientes antes del esquema final

- Permisos específicos por acción dentro de los roles acordados y su representación técnica; la pertenencia única del usuario al tenant y el alcance de sucursales ya están acordados.
- Cómo se separan empleados/membresías de clientes mayoristas que compran.
- Permisos específicos por acción y representación técnica final de roles/asignaciones; no alterar las reglas de alcance ya acordadas ni habilitar acceso de usuarios a datos de negocio de otros tenants.
- Campos fiscales obligatorios, validación/formato de CUIT y datos de contacto; unicidad y retención.
- Si el logo se almacena como objeto Supabase Storage, permisos de lectura, versiones y uso en documentos.
- Estado de cuenta, suspensión, baja, exportación/retención y eliminación de un tenant.
- Diseño de planes, suscripciones, límites y habilitación de módulos; no pagos automáticos en esta etapa.
- Política concreta de RLS, rol de conexión Prisma y controles de tenant en cada caso de uso.
- Unicidad de SKU y estados de pedidos/pagos en el tenant inicial.
- Detalles del modelo de sucursales y de la asignación de sucursales a operaciones concretas, sin alterar las cardinalidades acordadas.
- Unidades que se cargarán en el catálogo estándar, ámbito de `allowsFractionalQuantity` y reglas de redondeo de cantidad × factor.
- Protección definitiva de snapshots de `OrderLine` según el ciclo de vida que se apruebe; los triggers de `init` ya protegen identidad de presentaciones y unidad base, pero no congelan ni impiden eliminar líneas.
- Si `WholesaleOrder` conservará un snapshot de datos de contacto del cliente y qué datos incluiría.
- Estrategia de integridad y consulta de `AuditEvent.entityType`/`entityId`, que hoy es una referencia polimórfica sin FK específica.
- Prisma ya carga `.env` desde `prisma.config.ts`; faltan las variables operativas de Better Auth, sin modificar credenciales existentes.
- Los códigos técnicos de `RoleDefinition` (`OWNER`, `ADMIN`, `MANAGER`, `SALES`, `TECHNICIAN`, `WAREHOUSE`) y sus alcances están aprobados y reflejados en el SQL de `init`.


## PostgreSQL local con Docker Compose

Este entorno local usa Docker Desktop con integración WSL2 y Docker Compose, además de Node.js/npm para la aplicación y Prisma 7.10.1. La imagen oficial fijada es `postgres:17.11`; el contenedor se llama `milo-postgres`. El puerto 5432 se publica solo en `127.0.0.1`, con volumen persistente `milo_postgres_data`.

La configuración y credenciales locales están en `.env` (ignorado por Git). Si todavía no existe, copie `.env.example` a `.env` y reemplace la contraseña de ejemplo por una contraseña local aleatoria. Mantenga `POSTGRES_DB`, `POSTGRES_USER` y `POSTGRES_PASSWORD` alineados con `DATABASE_URL`. Prisma lee `.env` desde `prisma.config.ts` y usa `DATABASE_URL` en el formato PostgreSQL con `schema=public`.

Desde la raíz del repositorio:

```sh
docker compose up -d
docker compose ps
docker compose logs -f postgres
```

Detener el servicio y conservar los datos: `docker compose down`. El volumen persiste aunque el contenedor se elimine y se vuelva a crear. `docker compose down -v` elimina el volumen y, por tanto, todos los datos locales.

El esquema Prisma puede validarse con `npx prisma validate`; esa validación no comprueba conexión, no aplica migraciones ni crea tablas.


## Visibilidad de precios por tenant

Tenant tiene PriceVisibility (PUBLIC, AUTHENTICATED_CUSTOMERS) con default AUTHENTICATED_CUSTOMERS para nuevos registros. `init` crea el enum y la columna no nula con default; se aplicó previamente según confirmación del responsable a PostgreSQL y no crea ni inicializa el tenant Milo Store. Su valor inicial deberá establecerse durante la inicialización de datos.

El catalogo publicado siempre es publico y no hay configuracion para ocultarlo por completo. PUBLIC permite incluir precios en una consulta publica autorizada para ese tenant; AUTHENTICATED_CUSTOMERS exige identidad autenticada vinculada al Customer autorizado/activo de la misma empresa. Un empleado o una solicitud pendiente no califican. Los precios se filtran en servidor y no se guardan en caches compartidas con identidad de usuario.

El esquema actual no vincula autenticacion con Customer. La dependencia futura propuesta es una referencia CustomerIdentity tenant-scoped con issuer y subject opacos, FK compuesta (tenantId, customerId) y unicidad del subject dentro de su emisor/tenant. Better Auth es el proveedor seleccionado; el vínculo Customer-identidad sigue pendiente y no concede acceso por sí solo.


## Bloqueos, historial y limites

Los triggers de init coordinan escritores mediante locks de fila FOR UPDATE sobre la fila padre compartida: OrderLine y cambios protegidos de ProductPresentation usan la presentacion; StockBalance/StockMovement y cambio de unidad base usan el producto. El cambio del padre consulta historial dentro de la transaccion despues de obtener su row lock. En escrituras con multiples entidades la aplicacion debe bloquear todas las filas padre por (tenantId,id) ascendente, leer despues de bloquear y mantener la transaccion hasta guardar. El caso de uso debe manejar deadlock/serialization retry; no hay casos de uso de stock/pedido implementados aun.

StockMovement rechaza UPDATE, DELETE y TRUNCATE. OrderLine permanece editable/eliminable para permitir pedidos en preparacion. Como los estados comerciales estan pendientes, la BD no congela snapshots por estado; esa proteccion se debe definir junto con el ciclo de vida y aplicarse en casos de uso antes de habilitar pedidos historicos.


### Storefront editorial reutilizable (D-021, fases 2 y 3)

El portal /tiendas/milo-store ahora se sirve mediante app/(comercial)/tiendas/[slug], con plantilla mayorista y componentes comerciales reutilizables. Solo existe la entrada editorial milo-store; no corresponde a una creación, carga o consulta de Tenant. Personalización visual acotada al storefront y panel con identidad global de MILO. No cambian el esquema, los permisos, el alcance mayorista ni el acceso comercial.

### D-022 — Aplicación controlada verificada

El 2026-11-09 se confirmó la conexión a `127.0.0.1:5432/milo_dev` (PostgreSQL 17.11), las dos migraciones anteriores completas con checksums coincidentes y una única pendiente. Por autorización expresa se añadió BEGIN/COMMIT con lock_timeout=10s y statement_timeout=60s a la migración pendiente, conservando su DDL y cinco CHECK. Prisma 7.10.1 ejecutó únicamente add_tenant_storefront mediante migrate deploy.

Respaldo completo: evidencia local no versionada (84.775 bytes); pg_dump -Fc 17.11, pg_restore --list (191 entradas) y lectura completa sin restaurar, todos correctos. SHA-256: `d07f4fd25762bd24e0c7c8ef3cedbaf2e94532b405907922d1bec7c2c17d90a8`. Evidencia técnica en archivos .audit.json y .verified.json del mismo nombre base fuera del repositorio.

Verificados tabla vacía, dos enums, PK/índice único de slug, FK RESTRICT y cinco CHECK validados. Historial anterior intacto y huellas de esquema/datos de las 25 tablas previas coincidentes, incluidas las cuatro tablas Better Auth. migrate status al día, prisma validate correcto y diff real/schema vacío. Sin crear usuarios, tenants ni datos comerciales ni modificar .env, Docker o Better Auth. La edición/publicación de storefront y su autorización efectiva siguen pendientes.

## Ingreso y panel empresarial (D-023)

Implementado por autorización expresa: formulario real en /acceso mediante el cliente de Better Auth existente y cierre de sesión. La configuración y el handler Better Auth permanecen intactos, incluido disableSignUp=true; no hay registro público, OAuth, invitaciones ni recuperación de contraseña. Validación de formulario con Zod y validación independiente en servidor mediante Better Auth. Errores de credenciales genéricos, sin revelar existencia de cuenta ni propagar detalles del proveedor. Destinos de navegación fijos y del mismo origen.

El guard server-only reutilizable `lib/panel/access.ts` verifica sesión vigente en Better Auth sin cookie cache ni refresh desde RSC, resuelve UserProfile exclusivamente por authUserId y exige tenant existente/coherente. Consulta asignaciones por tenantId y userProfileId del servidor. OWNER/ADMIN conservan alcance COMPANY; MANAGER/SALES/TECHNICIAN/WAREHOUSE, BRANCH con sucursal de la misma empresa. Roles desconocidos, relaciones inconsistentes y errores de servicio deniegan acceso. Sin sesión redirige a /acceso; sin perfil/tenant muestra una negativa genérica y permite cerrar sesión. No usa email, encabezados o parámetros enviados por el navegador para determinar pertenencia.

El layout y la página /panel ejecutan el guard; React cache solo deduplica el render de una petición, sin caché compartida entre usuarios. Cada futura página, acción o endpoint protegido deberá invocarlo de nuevo y autorizar su operación. Esta primera pantalla solo admite consultar la propia cuenta, empresa y asignaciones; un perfil válido sin roles ve su cuenta y la ausencia de asignaciones, sin adquirir permisos operativos. No se infieren estados de Tenant.accountStatus, cuya semántica sigue pendiente. No se entregan tokens, credenciales ni datos fiscales, clientes, precios o inventario al shell del panel.

Sidebar responsive y topbar con identidad global MILO en azul, negro, gris y plateado. La personalización del tenant no modifica el panel. /acceso y /panel se renderizan dinámicamente y quedan fuera de indexación; el cierre invalida la sesión con Better Auth y realiza navegación completa para descartar el árbol privado del router. Solo cambió la página pública de acceso; el resto de páginas públicas, storefront, Prisma, migraciones y .env se preservan.

Verificación: 18 pruebas automatizadas con fixtures solo en memoria, incluido ingreso/cookie/cierre y registro bloqueado en el handler real, además de accesos permitidos/denegados del guard para seis roles, múltiples sucursales y cruces de tenant. Lint, typecheck y build con BETTER_AUTH_URL HTTPS temporal de proceso correctos. Comprobaciones HTTP de producción aislada sin PostgreSQL: /acceso 200, /panel anónimo o con identidad/rol/cookie falsificados redirige a /acceso, siete rutas públicas 200, tienda desconocida 404, registro bloqueado y correo malformado rechazado. Cache-Control del acceso: private/no-store. No se crearon usuarios, tenants ni sesiones reales. La comprobación visual en navegador no estuvo disponible por falta del host de automatización; no se probó un ingreso con credenciales reales.
