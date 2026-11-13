# Arquitectura SaaS multi-tenant

> D-053 (2026-11-13): El sidebar de Compras coordina solo estado/control de UI con RecordWorkspace: Ingreso abre el modal existente y Consulta mantiene la lista; resaltado por ruta y estado. No se comparten datos de negocio ni se agrega caché. Ver [navegación y pruebas](PURCHASES_MODAL.md).

> D-052 (2026-11-13): Compras abre alta con RecordWorkspace/showModal sobre PurchaseList. La ruta ingresar y el alias nueva reutilizan el listado y la misma apertura inicial; Productos/Clientes conservan opciones predeterminadas. Ver [prueba modal real](PURCHASES_MODAL.md).

> D-051 (2026-11-13): Compras reutiliza pestañas MILO y el modal compartido; estimación local exacta sin IO ni caché, filas memoizadas y guardado de renglones en bloque dentro de la misma transacción. Se conservan permisos, locks, auditoría y recepción. Ver [mediciones, verificaciones y límites](PURCHASES_PERFORMANCE.md).

> D-050 (2026-11-12): Compras dispone de comprobante, categor?a e IVA manual: la migraci?n `20261112060000_purchase_document_details` fue aplicada con autorizaci?n expresa mediante Prisma Migrate a `127.0.0.1:5432/milo_dev`. El detector existente devuelve `documentReady=true`. Se mantienen autorizaci?n OWNER/ADMIN COMPANY, aislamiento y l?mites de N/C/pagos. Las notas anteriores de despliegue pendiente son hist?ricas. Ver [registro](DECISIONS.md#d-050--despliegue-autorizado-de-detalles-de-compras).

> D-049 (2026-11-12): Compras se organiza en Ingreso de Mercadería, N/C Proveedor (Carga), Consulta de Compras, Consulta de N/C y Pagos a Proveedores. Reutiliza MILO/RecordWorkspace/RecordEditor y autorización OWNER/ADMIN COMPANY. Ingreso/consulta V1 conservan transacciones, stock e idempotencia; N/C sin escrituras y pagos con consulta real de proveedores, sin ledger ni saldos. Metadatos e IVA manual preparados con migración adicional y fallback V1. Ver [contrato y límites](PURCHASES_MODULE_RESTRUCTURE.md).

> D-048 (2026-11-12): Compras V1 implementado bajo contrato aprobado [PURCHASES_V1_PROPOSAL.md](PURCHASES_V1_PROPOSAL.md). `/panel/compras`, modal/rutas directas, búsqueda/filtros/paginación y detalle; OWNER/ADMIN COMPANY y tenant resueltos en servidor. Borradores sin stock; recepción completa con bloqueo de documento/productos en orden estable, Decimal, movimientos/saldos/auditoría atómicos e idempotencia. Reutiliza el editor/pie compartidos. Migración `20261112010000_add_purchases` probada solo en base aislada; no aplicada a `milo_dev`. Esta actualización supera referencias históricas a Compras no implementado; pagos/devoluciones/fiscalidad siguen fuera de alcance.

> D-047: el singleton Prisma reutiliza clientes solo con constructor y delegados administrativos vigentes. Se corrigió la API de exportación afectada por metadatos antiguos y se recargó Next.js; PostgreSQL y datos permanecen intactos. Ver DECISIONS.md.

> D-046: Clientes/Proveedores comparten barra, XLSX y vista de impresión, con autorización/membresía/filtros existentes, respuestas privadas y confirmación de importación atómica. Sin servicios externos ni migraciones. Contrato: [ADMIN_DATA_TRANSFER_PROPOSAL.md](ADMIN_DATA_TRANSFER_PROPOSAL.md).

> D-045: Proveedores V1 dispone de listado/modal compartidos, OWNER/ADMIN COMPANY, aislamiento, concurrencia y auditoría. Migración `20261111235000_add_suppliers` autorizada y aplicada a milo_dev el 2026-11-11 mediante Prisma Migrate, con respaldo externo y verificación de integridad. Seis migraciones aplicadas, ninguna pendiente. Contrato: [SUPPLIERS_V1_PROPOSAL.md](SUPPLIERS_V1_PROPOSAL.md). No implementa Compras.

> D-044 (alcance corregido): [ADMIN_TABLES.md](ADMIN_TABLES.md) queda como referencia opcional de Clientes y Proveedores. El usuario retiró la obligación de repetir ese formato en otros listados actuales o futuros; no se modifican modelos, datos, permisos ni reglas comerciales.

> D-043 (2026-11-11): ampliación de Clientes aprobada e implementada. La migración 20261111043000_expand_customer_commercial_profile fue autorizada expresamente y aplicada mediante Prisma Migrate a 127.0.0.1:5432/milo_dev, tras respaldo externo verificable. Quedaron cinco migraciones aplicadas y ninguna pendiente; las huellas de los campos originales de todas las tablas coinciden y los nuevos campos son consultables. El esquema anterior conserva su fallback básico; la ampliación ya está habilitada en milo_dev. Ver [CUSTOMERS_V1_EXPANSION_PROPOSAL.md](CUSTOMERS_V1_EXPANSION_PROPOSAL.md).


> D-041: implementada la administración básica de Clientes con listado, búsqueda, paginación y modal compartido, solo OWNER/ADMIN COMPANY del tenant. Contacto v1 y alta REGISTERED sin autorización comercial; estados anteriores inalterados y JSON incompatible protegido. Concurrencia y auditoría transaccionales, sin cambios de esquema ni datos reales durante la tarea. Contrato aprobado: [CUSTOMERS_V1_PROPOSAL.md](CUSTOMERS_V1_PROPOSAL.md). Supera las referencias anteriores a Clientes sin implementar.

> D-040: Productos, Marcas y Categorías comparten el patrón de alta/edición modal y sus páginas directas, sin cambios de servicios, permisos, auditoría ni modelo. Clientes y Proveedores siguen sin alta/edición implementada. Contrato y alcance: [ADMIN_FORMS.md](ADMIN_FORMS.md).

> D-039: el plan de activación se suministra privadamente por variables MILO_ACTIVATION_*, sin datos personales ni identificadores reales en el código. Se conservan journals y evidencias fuera de Git; las referencias históricas a un plan fijo quedan superadas. No se ejecuta activación ni se modifican datos en esta preparación. Ver DECISIONS.md y scripts/activation/README.md.

> D-038: todo campo monetario actual y futuro usa `100.000,00` en la interfaz. Reutilizar formato/conversión compartidos y conservar decimales canónicos exactos y Zod en servidor. Norma global: [MONEY_FORMAT.md](MONEY_FORMAT.md); aplicada actualmente a precios habituales y por presentación, sin declarar auditadas otras pantallas.

> D-034: el singleton de desarrollo se reutiliza únicamente con el constructor generado actualmente cargado, evitando clientes con metadatos anteriores tras HMR. No se desconectan clientes reemplazados con solicitudes en curso. Inventario separa fallos de validación previos al commit de una confirmación incierta y conserva la reconciliación por UUID. Diagnóstico real de lectura y regresiones simuladas, sin cambios de datos/esquema. Ver DECISIONS.md.

> Estado D-033, 2026-11-10: migración de trazabilidad de inventario aplicada mediante migrate deploy autorizado; milo_dev tiene cuatro migraciones aplicadas y ninguna pendiente. Campos y CHECK verificados, datos anteriores conservados y respaldo completo validado. El requisito de esquema para los movimientos manuales está satisfecho; no se ejecutaron movimientos reales ni se alteró autenticación o infraestructura. Las referencias siguientes a migración pendiente son históricas. Evidencia y respaldo en DECISIONS.md.

### Inventario manual preparado (D-033)

Listado/historial y Server Actions de ingreso/ajuste en `lib/inventory`. OWNER/ADMIN COMPANY operan su tenant; WAREHOUSE opera sus BRANCH; MANAGER consulta las suyas, sin ampliar alcance de escritura. Revalidación en transacción, Zod, UUID estable, lock Product previo a cantidades y movimiento/saldo/auditoría atómicos; reconciliación por ID ante commit incierto. Dos campos de trazabilidad y dos CHECK en migración aditiva pendiente: el servicio bloquea escrituras en bases sin ella y mantiene lecturas compatibles. Servicio probado realmente en PostgreSQL aislado, incluida concurrencia/idempotencia/rollback; sin escrituras en milo_dev ni cambios de Better Auth. Ver D-033.

### Shell ERP y dashboard (D-032)

Panel con sidebar oscuro agrupado y contraíble, submenús Artículos/Administración, ruta activa, navegación móvil y cierre de sesión existente. Página Inicio comercial con componentes de presentación y `lib/panel/dashboard.ts` server-only: revalida membresía/OWNER-ADMIN COMPANY y cuenta Customer/Product del tenant en RepeatableRead, sin caché compartida. Los demás módulos permanecen deshabilitados; ventas/pedidos/gráfico usan estados vacíos. No hay selección activa de sucursal: solo alcance validado. Sin cambios de lógica comercial ni autenticación. Ver D-032.

### Administración de sucursales (D-031)

Módulo server-only `lib/branches` y Server Actions bajo `/panel/sucursales`, con listado/búsqueda/paginación, alta y edición de nombre. Guard por sesión/authUserId y autorización OWNER/ADMIN COMPANY revalidada dentro de la transacción. Lecturas por tenant en RepeatableRead; escrituras con allowlist, versiones y auditoría atómica en Serializable. Sidebar conserva identidad MILO y oculta el módulo a otros roles. Sin borrar sucursales, alterar relaciones/historial o implementar inventario. Ver D-031.

### Carga rápida de productos (D-030)

Alta/edición principal comercial con precio por unidad y detalles técnicos en «Opciones avanzadas». saveQuickProduct reúne Product, presentación Individual y WholesalePrice en la misma transacción protegida con auditoría, locks y versiones, reutilizando la persistencia exacta de precios. UN/COUNT existente es el default del alta habitual, sin fracciones; la configuración especial sigue explícita. En edición solo se usa una presentación individual inequívoca y habilitada o se crea al ingresar precio cuando no existe; casos ambiguos/especiales se conservan y administran en avanzado. Sin cambios de arquitectura, autenticación, esquema o inventario. Ver D-030.

### Marcas y presentaciones administrativas (D-029)

Brand dispone de CRUD sin borrado en `/panel/marcas`; la ficha de producto permite gestionar presentaciones y precios independientes. Server Actions delegan a servicios server-only con guard OWNER/ADMIN COMPANY y membresía revalidada en transacción. Presentaciones/precios usan locks Product→ProductPresentation y ReadCommitted para consultar historial después del lock, más tokens updatedAt y auditoría atómica; marcas reutilizan Serializable del catálogo. Solo se transportan strings decimales exactos. Sin cálculos de cantidades, stock, pedidos, API pública nueva o cambios de autenticación. D-029 amplía el estado de lectura de D-027.

> D-028: UnitOfMeasure ya dispone de las unidades compartidas aprobadas UN/COUNT (Unidad) y M/LENGTH (Metro). El alta administrativa puede seleccionarlas; no se cambió código, esquema, aislamiento, servicios ni reglas operativas de cantidades. Se insertaron solo ambas filas, atómicamente y sin modificar otros datos.

### Catálogo administrativo inicial (D-027)

Categorías/productos disponen de listados con búsqueda y paginación, alta y edición mediante Server Actions protegidas para OWNER/ADMIN COMPANY. La capa server-only `lib/catalog/service.ts` deriva tenant/perfil desde el guard y vuelve a comprobarlos dentro de la transacción. FKs relacionadas, versiones y auditoría se validan por tenant. Presentaciones/precios se entregan solo a esos administradores, como decimales exactos en lectura, sin rutas públicas ni caché compartida. No se editan unidades, conversiones o historial. Alta de producto bloqueada si no hay unidades existentes; no se crean datos de referencia. Ver D-027 en DECISIONS.md.

### Configuración de empresa funcional (D-026)

`/panel/empresa` usa Server Components y una Server Action con guard propio. Solo OWNER/ADMIN COMPANY pueden consultar/guardar. La capa server-only `lib/company/service.ts` vuelve a verificar perfil/roles del mismo tenant dentro de la transacción y solo actualiza commercialName más updatedAt generado por servidor. El evento mínimo de auditoría se confirma o revierte junto al cambio. Sidebar/topbar conservan MILO; sin Prisma en cliente, edición de storefront o módulos comerciales nuevos. Dirección, contacto y configuración regional/precios quedan en lectura; ver D-026 en DECISIONS.md.

> D-025, 2026-11-09: activación inicial completada y verificada en milo_dev mediante el CLI probado. Milo Store y responsable autorizado como OWNER/COMPANY sin sucursal; sin sesiones automáticas ni correo marcado como verificado. No cambia arquitectura ni permisos; primer ingreso manual pendiente. Las referencias a activación preparada describen etapas anteriores.

### Preparación local de activación (D-024)

Se incorporó un CLI fuera de HTTP para la activación única de Milo Store y su OWNER, con dry-run de solo lectura por defecto. Instancia Better Auth aislada y sin handler, con delegados limitados al mismo cliente transaccional Prisma; el singleton público no cambia. No hay infraestructura permanente nueva ni acceso comercial adicional. Diseño y evidencia de atomicidad en [scripts/activation/README.md](../scripts/activation/README.md). El rollback PostgreSQL real pasó en una base temporal autorizada, verificada vacía y eliminada. La activación real no se ejecutó.

> Estado actualizado D-023: `/acceso` ofrece ingreso real por correo/contraseña y `/panel` tiene estructura protegida empresarial. Solo se muestran cuenta, empresa y asignaciones reales autorizadas. Sin registro público, invitaciones, métricas ficticias ni módulos comerciales operativos. TenantStorefront permanece aplicado, sin integración editorial. Las referencias anteriores a ingreso informativo o login pendiente describen etapas previas.

## Preparación editorial persistida (D-022)

La futura configuración editorial pertenece a un tenant mediante una relación opcional 1:1 desde Tenant, sin relajar el aislamiento ni modificar Better Auth. Template WHOLESALE y política MANUAL no conceden permisos comerciales. El panel conserva la identidad global MILO.

El [contrato previsto](DATA_MODEL_V1.md#tenantstorefront--preparación-de-persistencia-editorial-d-022) distingue schemaVersion del JSON, revision para concurrencia y snapshots draft/published. Se acuerda publicación manual por OWNER/ADMIN del mismo tenant; autorización, validación Zod, comparación e incremento atómico de revision y lectura pública del snapshot se implementarán en otra etapa. La tabla y sus CHECK no implementan esos controles. El registro editorial server-only actual continúa aislado de Prisma; no se incorporan servicios, endpoints ni pantallas.

> Estado público vigente (D-021): MILO es la plataforma de HenkoSoft. Sitio institucional multipágina en `/`; Milo Store en `/tiendas/milo-store`; `/acceso` solo informa el estado del ingreso. Sin nuevos módulos, pantallas privadas ni cambios de datos. Las referencias históricas a una única landing quedan reemplazadas por esta estructura.

## Producto y estado

La arquitectura objetivo es una sola plataforma SaaS compartida por varias empresas (tenants), con código, aplicación e identidad visual global comunes y aislamiento lógico estricto de datos. Milo Store será el primer tenant y comenzará con el módulo de distribución mayorista definido en el README.

MILO es la marca de la plataforma, HenkoSoft su desarrolladora y Milo Store su primer tenant. Los sitios comerciales pueden personalizarse de forma acotada; el panel mantiene una interfaz global. No se implementa white-label completo. Las etapas 1 y 2 de Better Auth están autorizadas: modelos, configuración server-only, handler y migración aditiva sin aplicar; no se autorizan otros módulos.

## Stack y forma de despliegue

- Next.js App Router, React, TypeScript estricto y Tailwind CSS.
- PostgreSQL como base prevista. Se conservan Supabase PostgreSQL/Storage y Better Auth, Prisma ORM Community, shadcn/ui, Zod y GitHub según las decisiones existentes.
- Una aplicación modular monolítica; sin microservicios hasta que una necesidad concreta lo justifique.
- Docker/Compose opcionales para desarrollo.
- Cada tenant puede tener una o varias sucursales. No se fija una cantidad de depósitos ni se presupone una sucursal única.

## Capas y recorrido de una operación

```text
Navegador
  ├─ Superficie compartida de la plataforma
  - Catalogo publico: productos publicados; precios segun Tenant.priceVisibility
  ├─ Área privada: datos de la única empresa a la que pertenece el usuario
  └─ Administración SaaS: gestión de información propia de la plataforma
          ↓
  Entradas Next.js: validación + identidad + contexto de tenant + autorización
          ↓
  Casos de uso y reglas comunes
          ↓
  Adaptadores: Prisma/PostgreSQL, Better Auth y Supabase Storage
```

La UI, Route Handlers y Server Actions son entradas/presentación. Las reglas se ejecutan en casos de uso server-side, sin duplicar lógica comercial.

### Identidad y autorización

Better Auth 1.7.18 reutiliza el Prisma Client PostgreSQL de `lib/prisma.ts` desde `lib/auth.ts`, ambos protegidos con `server-only`. El adaptador se importa de `better-auth/adapters/prisma`; el paquete principal lo reexporta. `modelName` apunta a los delegates `authUser`, `authSession`, `authAccount` y `authVerification`; `@@map` conserva los nombres SQL `auth_*`. El handler oficial `toNextJsHandler` expone GET/POST en `/api/auth/[...all]`, con runtime Node.js.

Las identidades, credenciales y sesiones son globales; no contienen tenant, sucursal, roles ni permisos comerciales. MILO mantiene esos datos en UserProfile y las relaciones empresariales. `AuthUser.email` es globalmente único. `UserProfile.authUserId` es opcional, único y FK con `ON DELETE RESTRICT`: una identidad puede tener como máximo un perfil, perteneciente a una única empresa. Nunca vincular por email.

El registro público se rechaza en servidor mediante `emailAndPassword.disableSignUp: true`; no hay proveedores sociales ni Organization y se deshabilita la vinculación automática de cuentas. El alta de empleados será mediante invitación de OWNER/ADMIN, aún no implementada. El proveedor de correo sigue pendiente.

Una sesión solo acredita identidad. Antes de cualquier operación empresarial futura se debe consultar UserProfile por `session.user.id` como authUserId y autorizar tenant, sucursales y permisos en servidor, denegando si falta perfil. El vínculo a Customer y su autorización comercial siguen pendientes: ni AuthUser ni UserProfile conceden precios privados o compra. No hay endpoints comerciales en esta etapa.

## Aislamiento de tenants

- Cada registro de negocio propiedad de una empresa incluye `tenant_id` o una convención equivalente documentada y aplicada consistentemente.
- El servidor determina el tenant efectivo desde la identidad/membresía autorizada y el contexto de la solicitud. Nunca confía solamente en un `tenant_id` enviado por el cliente.
- Cada usuario pertenece a exactamente un tenant. La empresa administra sus usuarios y empleados; una identidad no cambia ni selecciona entre tenants.
- Los usuarios empleados pueden tener asignación a una o varias sucursales de su tenant. La asignación no cambia su pertenencia empresarial.
- Dueño y Administrador tienen alcance general a las sucursales dentro de su propio tenant. Este alcance no concede acceso a otra empresa.
- Roles confirmados: Dueño, Administrador, Encargado, Vendedor, Técnico y Depósito. Un usuario puede tener más de un rol; los roles operativos pueden asignarse por sucursal. Dueño y Administrador tienen alcance general en su empresa; los otros roles se limitan a sucursales asignadas.
- Dueño tiene control total de su empresa. Administrador ejerce administración general, sin transferir la propiedad ni eliminar al Dueño. Encargado supervisa sus sucursales asignadas y no administra usuarios ni modifica permisos. Vendedor realiza operaciones comerciales; Técnico corresponde al módulo de reparaciones y órdenes de servicio; Depósito opera inventario y movimientos de stock. No se especifican permisos adicionales.
- La administración central de HenkoSoft permanece separada de los roles de las empresas. Ningún usuario accede a datos de otra empresa.
- Toda lectura, búsqueda, modificación y borrado restringe su alcance al tenant autorizado. Las operaciones que cambian de tenant requieren verificar membresía y autorización de nuevo.
- Claves únicas y relaciones deben incluir tenant cuando sea necesario. Las claves foráneas compuestas deben impedir que un registro de un tenant apunte a clientes, productos u otros datos de otro tenant.
- Ningún usuario, incluido un operador de plataforma, obtiene acceso a datos de negocio de otro tenant. La administración SaaS se limita a información propia de la plataforma; debe mantenerse separada de los datos empresariales de los tenants.
- RLS puede aportar defensa adicional. Si Prisma usa credenciales que omiten RLS, el control server-side de la aplicación es obligatorio.
- Cachés y DTOs identifican claramente datos públicos/globales frente a datos privados tenant-scoped. No cachear datos privados compartidos entre tenants.

## Identidad visual y perfil de empresa

El panel administrativo y de ventas conserva la marca, paleta, tipografías, componentes y navegación globales de MILO. Los sitios comerciales usan plantillas reutilizables con identidad comercial y tokens visuales acotados a su subtree; no se habilita white-label completo.

El perfil de cada empresa contiene —en el alcance que se defina— nombre comercial, razón social, CUIT, información fiscal, dirección, contacto, logo, usuarios/empleados y datos comerciales. Su logo se usa en el sitio comercial y documentos pertenecientes al tenant, como presupuestos, comprobantes, reportes y documentos de venta; no cambia la interfaz global del panel. Los archivos y metadatos del logo quedan asociados al tenant y protegidos según su uso.

## Tenant inicial y módulo mayorista

Milo Store será el primer tenant de la plataforma. El catalogo publicado siempre sera publico. Tenant.priceVisibility define si los precios son PUBLIC o AUTHENTICATED_CUSTOMERS. Solo clientes autorizados/activos vinculados a una identidad externa autenticada del mismo tenant reciben precios privados. Compra se autoriza por separado y siempre en servidor.

Los casos de uso comerciales siguen pendientes. El sitio institucional de MILO es multipágina y el portal informativo de Milo Store anuncia el catálogo online como preparación.

El enum PriceVisibility permite PUBLIC y AUTHENTICATED_CUSTOMERS, por tenant; su default es AUTHENTICATED_CUSTOMERS y Milo Store inicia con ese valor. Empleados no reciben acceso por su UserProfile.

## Administración SaaS y disponibilidad por plan

La plataforma contempla administración central de empresas registradas, estado de cuenta y configuración de capacidades disponibles. Esta gestión no concede acceso a datos de negocio de las empresas. No se definieron todavía las operaciones detalladas, perfiles de operador ni permisos del panel central.

Los planes y suscripciones son modelo futuro. Podrán representar límites y módulos habilitados por tenant, con verificación server-side. No integrar pagos de suscripción, pasarelas ni automatizaciones de facturación en esta etapa. Los módulos potenciales son reparaciones/órdenes de servicio, ventas minoristas, inventario/productos, gestión de clientes y distribución mayorista. Esta lista expresa posibilidades de la plataforma, no autoriza diseñar o implementar ahora cada módulo.

## Seguridad e integridad

- Validar entrada externa con Zod en servidor; denegar por defecto; autenticar y autorizar cada operación.
- Comprobar identidad, membresía, tenant, estado de cuenta y permiso antes de acceder a datos privados.
- Prisma solo en servidor; no exponer secretos, credenciales ni service role.
- Datos personales, fiscales y comerciales requieren minimización, mínimo privilegio, protección de logs y política de retención antes de producción.
- Mantener datos tenant-scoped fuera de HTML público, metadatos, respuestas públicas, service worker y cachés compartidas.
- En el módulo mayorista, precios y totales se calculan en servidor; movimientos de stock son persistentes y el saldo no puede ser negativo.

## Decisiones pendientes

Evolucionar los activos visuales de MILO; onboarding/alta inicial del tenant y asociación de identidades; permisos específicos por acción dentro de cada rol y representación técnica de asignaciones por sucursal; separación operativa de la administración central de HenkoSoft; campos fiscales requeridos y retención; límites y modelo de entitlements por plan; estados, suspensión, exportación y cierre de tenant; políticas RLS y credenciales de Prisma; almacenamiento, acceso y versiones del logo; y momento de implementar administración central, planes y suscripciones.


## Politica aprobada de catalogo, precios y compra

El catalogo del tenant siempre permanece publico para productos publicados, imagenes, descripciones, categorias, marcas y presentaciones. No existe una bandera de visibilidad global del catalogo; isPublished solo controla cada producto. Las consultas publicas excluyen Customer, StockBalance, StockMovement y datos internos.

Tenant.priceVisibility ofrece PUBLIC y AUTHENTICATED_CUSTOMERS, por tenant, con default AUTHENTICATED_CUSTOMERS; Milo Store usa ese valor inicialmente. En modo privado, la autorizacion se deriva server-side de una identidad autenticada externa vinculada al Customer del mismo tenant y de su estado comercial aprobado/activo. Un UserProfile empresarial no es un Customer. CustomerAccessRequest pendiente no concede acceso.

Precio y compra son decisiones separadas. PUBLIC no habilita compras. Agregar una linea y confirmar un pedido requieren verificacion server-side de tenant, identidad, Customer autorizado/activo y permiso comercial de compra. No se define aqui una matriz de permisos por accion.

Existe configuración de Better Auth, pero no identidad vinculada a Customer ni endpoints de catálogo. Antes de implementar acceso privado se necesita una referencia de identidad generica, tenant-scoped, con issuer/subject y FK compuesta a Customer; Better Auth administra la identidad y las credenciales, y el vínculo con Customer continúa pendiente.

Nunca serializar precios privados en respuestas anonimas, HTML, RSC, metadatos ni caches compartidas. Las respuestas privadas deben evitar cache compartida; cualquier cache publica con precios PUBLIC debe aislar su clave por tenant y configuracion. No cachear datos de inventario en el catalogo.


## Bloqueos de integridad para operaciones futuras

La migracion inicial serializa cambios de ProductPresentation frente a escrituras de OrderLine con SELECT FOR UPDATE sobre la fila padre; aplica el mismo patron a Product frente a inserciones de StockBalance/StockMovement y cambios de unidad base. En operaciones de aplicacion se debe adquirir el lock antes de leer la unidad o preparar snapshots, y tomar varias filas en orden estable (tenantId,id) dentro de una misma transaccion. El trigger protege el orden de escritura; no reemplaza la lectura posterior al lock ni el reintento de conflictos.

StockMovement es append-only en PostgreSQL: UPDATE, DELETE y TRUNCATE se rechazan. OrderLine conserva edicion mientras se define el ciclo de vida del pedido; la aplicacion tendra que proteger snapshots despues de que exista un estado comercial aprobado. No hay estados comerciales aprobados ni flujos comerciales implementados.

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
