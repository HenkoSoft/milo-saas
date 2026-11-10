# Roadmap de la plataforma SaaS

> D-039: el plan de activación se suministra privadamente por variables MILO_ACTIVATION_*, sin datos personales ni identificadores reales en el código. Se conservan journals y evidencias fuera de Git; las referencias históricas a un plan fijo quedan superadas. No se ejecuta activación ni se modifican datos en esta preparación. Ver DECISIONS.md y scripts/activation/README.md.

> D-038: cada nueva implementación o modificación de un campo monetario debe cumplir [MONEY_FORMAT.md](MONEY_FORMAT.md): punto de miles, coma de centavos y dos decimales (`100.000,00`). Aplicado a precios habituales y por presentación; revisar la coherencia del área en cada etapa, sin dar por auditada toda la aplicación ni ampliar el alcance de módulos futuros.

> D-034: corregida la reutilización del cliente antiguo en Next dev y la clasificación de errores de validación como commits inciertos. Confirmados ausencia de ingreso/parcialidad y lectura correcta después del cambio. Regresiones simuladas sin escrituras; no se ejecutó el ingreso original ni un movimiento real de verificación. El alcance operativo y las restricciones de D-033 no cambian. Ver DECISIONS.md.

> Estado D-033, 2026-11-10: completada la aplicación controlada de la migración de inventario a milo_dev, con respaldo íntegro, cuatro migraciones al día y datos existentes conservados. Ya no está pendiente ese requisito de esquema. No se registraron movimientos reales desde el panel ni se incorporaron funcionalidades adicionales; fracciones/conversiones y demás alcance pendiente no cambian. Las referencias siguientes a autorización futura de esa migración son históricas. Ver DECISIONS.md.

### Inventario manual preparado y probado (D-033)

Implementados consulta/historial, ingreso y ajuste sumar/restar con motivo, referencia opcional, idempotencia, concurrencia y auditoría atómica. Roles aprobados: OWNER/ADMIN COMPANY y WAREHOUSE BRANCH operan; MANAGER BRANCH solo consulta; SALES/TECHNICIAN sin acceso. PostgreSQL aislado validó flujos completos, rollback y commit incierto. Pendiente aplicar la migración aditiva autorizada solo para preparación/pruebas: milo_dev conserva su esquema/datos y las escrituras están bloqueadas allí. Fracciones, conversiones, transferencias, reversos automáticos, ventas y pedidos siguen pendientes. Ver D-033.

### Panel ERP y dashboard comercial (D-032)

Implementados sidebar agrupado/contraíble y responsive, submenús autorizados, cierre de sesión y dashboard con totales reales tenant-scoped de clientes registrados y productos para OWNER/ADMIN. Ventas del día, pedidos de hoy, gráfico semanal y últimas ventas quedan explícitamente pendientes, sin datos simulados. No hay nuevas rutas de módulos comerciales ni selector de sucursal activa; los accesos rápidos apuntan solo a módulos implementados/autorizados. Sin escrituras o cambios de modelo; pruebas de datos/permisos simuladas. Ver D-032.

### Sucursales administrativas (D-031)

Implementados listado/búsqueda/paginación, alta y edición de nombre en `/panel/sucursales` para OWNER/ADMIN COMPANY, con navegación responsive, Zod, aislamiento, control de concurrencia y auditoría transaccional. No se crean sucursales durante la implementación; persistencia y rollback se prueban en memoria. El modelo no admite dirección, contacto ni estado. Continúan pendientes asignaciones de empleados, inventario y comprobación de integración PostgreSQL del módulo. Sin borrado o cambios de historial. Ver D-031.

### Carga comercial rápida (D-030)

Implementado formulario principal simple con precio y alta atómica de ficha/presentación individual/precio usando UN existente. Edición compatible sin reinterpretar productos especiales ni elegir arbitrariamente una presentación; unidades, factores, cajas y packs en «Opciones avanzadas». Sin stock inicial ni modificaciones reales de productos durante esta implementación. Pruebas de persistencia/rollback en memoria; integración PostgreSQL, reglas operativas de fracciones/redondeos e inventario siguen pendientes. D-030 amplía D-029.

### Marcas y presentaciones administrativas (D-029)

Implementados listado/búsqueda/alta/edición de marcas, gestión de presentaciones en ficha de producto, habilitación y precio mayorista separado. OWNER/ADMIN COMPANY, Zod, decimales exactos, control de concurrencia e historial y auditoría transaccional; pruebas con transporte simulado sin datos reales nuevos. Precios cero o positivos autorizados. Pendientes integración PostgreSQL de este módulo, semántica de precios negativos (bloqueados) y reglas de cantidades fraccionarias/conversión/redondeo. Sin stock, pedidos, ventas ni exposición pública de catálogo/precios. Este avance reemplaza la lectura exclusiva indicada en D-027.

> D-028: resuelto el bloqueo por catálogo de unidades vacío: se aprobaron y cargaron únicamente UN/COUNT (Unidad) y M/LENGTH (Metro). El alta de productos ya tiene unidades disponibles; no se crearon productos o presentaciones ni se adelantaron reglas de conversión, fracciones o redondeo. Las referencias al bloqueo anterior describen el estado previo a esta carga.

### Categorías y productos administrativos (D-027)

Implementados listados/búsqueda/paginación y alta/edición de categorías y fichas de producto para OWNER/ADMIN COMPANY, con validación, aislamiento, concurrencia y auditoría atómica. El alta de productos exige unidades compartidas existentes y selección explícita del fraccionamiento; actualmente milo_dev carece de unidades, así que queda bloqueada hasta aprobar/cargar ese vocabulario, sin seeds inventados. Marcas se seleccionan, presentaciones/precios se consultan y las operaciones pendientes de fracciones/conversión/redondeo permanecen deshabilitadas. No hay borrado, movimientos de stock, pedidos ni ventas. Pruebas con datos solo en memoria; sin modificar datos reales.

### Primer módulo administrativo (D-026)

Implementados consulta autorizada y guardado de nombre comercial en `/panel/empresa`, con navegación MILO responsive, Zod, mensajes de resultado, aislamiento, control de concurrencia y auditoría mínima atómica. Dirección y contacto siguen en lectura hasta definir sus contratos; no se editan moneda, locale, zona horaria ni precios. Las pruebas de persistencia se ejecutan con transporte simulado, sin escribir datos reales. Siguen pendientes logo, storefront/publicación, contratos fiscales/contacto y demás módulos; esta etapa no los habilita.

> D-025, 2026-11-09: activación real única de Milo Store y responsable autorizado como OWNER completada y verificada. Dry-run complete, journal committed y repetición bloqueada. Falta el primer ingreso/cierre manual del responsable desde /acceso; no se habilitaron módulos nuevos. Las referencias a autorización pendiente de activación son históricas.

### Preparación local de activación (D-024)

Preparados script de uso único, dry-run predeterminado, contraseña interactiva oculta y validaciones. Rollback PostgreSQL real aprobado en las cuatro etapas sobre una base temporal autorizada, verificada vacía y eliminada. milo_dev intacta, respaldo actualizado verificado y dry-run ready sin intento previo. Queda obtener autorización expresa para activar y luego verificar ingreso/cierre reales del responsable. Ver [procedimiento](../scripts/activation/README.md).

> Estado actualizado D-023: `/acceso` ofrece ingreso real por correo/contraseña y `/panel` tiene estructura protegida empresarial. Solo se muestran cuenta, empresa y asignaciones reales autorizadas. Sin registro público, invitaciones, métricas ficticias ni módulos comerciales operativos. TenantStorefront permanece aplicado, sin integración editorial. Las referencias anteriores a ingreso informativo o login pendiente describen etapas previas.

## Etapa acotada: persistencia editorial (D-022)

Preparados modelo opcional 1:1 por tenant, enums WHOLESALE/MANUAL, borrador/snapshot JSONB, fecha y revisión positiva, slug global canónico y migración SQL aditiva con CHECK. No se crea contenido; la migración autorizada ya se aplicó a PostgreSQL local. El [contrato de formato y publicación](DATA_MODEL_V1.md#tenantstorefront--preparación-de-persistencia-editorial-d-022) está documentado como previsto.

Aplicación y verificación contra PostgreSQL local completadas. Quedan para autorización posterior: validadores Zod y compatibilidad JSONB, resolución de tenant, autorización OWNER/ADMIN, edición con control optimista, publicación manual atómica, consumo público del snapshot y reglas de cambios de slug/template/política. No hay panel ni endpoints nuevos; el portal continúa con su registro editorial. Esta preparación no habilita registro abierto, precios ni compra.

> Estado público vigente (D-021): MILO es la plataforma de HenkoSoft. Sitio institucional multipágina en `/`; Milo Store en `/tiendas/milo-store`; `/acceso` solo informa el estado del ingreso. Sin nuevos módulos, pantallas privadas ni cambios de datos. Las referencias históricas a una única landing quedan reemplazadas por esta estructura.

La plataforma será multi-tenant desde su base. Milo Store es el primer tenant y su módulo inicial tiene el alcance descrito en `docs/WHOLESALE_V1_SCOPE.md`. Existen sitio institucional multipágina, portal comercial informativo, esquema comercial tenant-aware y configuración/endpoint de Better Auth; catálogo y casos de uso operativos no están implementados. La implementación de las etapas 1 y 2 de Better Auth está autorizada.

Estado de autenticación: cuatro modelos globales y vínculo opcional/único authUserId a UserProfile, configuración server-only, handler oficial y registro público bloqueado. Ambas migraciones se aplicaron y Better Auth se configuró/verificó mediante lecturas en etapas anteriores. Siguen pendientes la interfaz de ingreso, las invitaciones de OWNER/ADMIN y el proveedor de correo. No se implementan invitaciones, login UI, Organization ni autorizaciones comerciales en esta tarea.

## 1. Aprobación y decisiones base

**Objetivo:** validar el modelo SaaS y cerrar decisiones necesarias para empezar con tenants.

**Criterios:** documentación del producto coherente y aprobada; alcance del primer tenant y plataforma acordados; nombre/marca global definido o explícitamente diferido; decisiones pendientes de identidad, aislamiento y operación clasificadas; autorización explícita para implementar.

## 2. Núcleo multi-tenant y acceso

**Objetivo:** implementar una única aplicación compartida que pueda determinar y aislar el tenant de cada operación.

**Criterios:** tenant y pertenencia de cada usuario a una única empresa representados; `tenant_id` coherente en datos de negocio; sucursales de la empresa y asignación de empleados a una o varias sucursales contempladas; roles acordados representados con roles múltiples por usuario y roles operativos variables por sucursal; Dueño y Administrador con alcance general dentro de su empresa y demás roles limitados a sucursales asignadas; contexto y autorización resueltos en servidor; relaciones y restricciones impiden referencias cruzadas; los permisos permanecen dentro del tenant y administración central separada; migraciones versionadas; verificaciones negativas de aislamiento entre tenants. RLS puede añadirse como defensa complementaria. No definir permisos específicos por acción fuera de una decisión posterior.

## 3. Administración de empresas y perfil del tenant

**Objetivo:** registrar el primer tenant Milo Store y soportar datos propios de las empresas.

**Criterios:** administración central puede identificar empresas y gestionar información propia de plataforma y estado de sus cuentas con permisos auditables, sin acceso a datos de negocio de los tenants; tenant mantiene nombre comercial/legal, CUIT/datos fiscales, dirección, contacto y logo según los campos aprobados; la empresa administra sus usuarios/empleados y sucursales; el logo puede asociarse a documentos propios y no cambia la UI compartida.

## 4. Módulo mayorista inicial

**Objetivo:** habilitar el alcance actual de tienda para el tenant Milo Store sobre el núcleo compartido.

**Criterios:** completar el alcance de `docs/WHOLESALE_V1_SCOPE.md`; conservar solicitud/aprobacion manual, catalogo publicado siempre publico, precios controlados por Tenant.priceVisibility, precio privado solo para Customer autenticado/autorizado/activo del mismo tenant, compra autorizada por separado, inventario con movimientos persistentes y saldo no negativo, y aislamiento tenant/sucursal. No asumir decisiones pendientes.

## 5. Carrito, pedidos y pagos manuales

**Objetivo:** operar la compra online del primer tenant.

**Criterios:** carrito y pedidos online; importes calculados en servidor; transferencia y efectivo con registro/confirmación manual según el alcance acordado; datos y movimientos asociados al tenant; administración básica; datos privados no compartidos entre tenants ni almacenados en cachés comunes. Sin pasarelas ni procesamiento automático de pagos.

## 6. Validación de seguridad y privacidad

**Objetivo:** verificar el aislamiento y los flujos del primer módulo.

**Criterios:** controles por tenant en lecturas/escrituras; intentos IDOR y referencias cruzadas; no exponer precios cuando priceVisibility=AUTHENTICATED_CUSTOMERS; revisar acceso a datos sensibles; secretos solo servidor; logs y cache sin fugas cross-tenant; respaldo y restauracion antes de produccion.

## 7. Publicación comercial

**Objetivo:** operar la plataforma con proveedor y controles aptos para uso comercial.

**Criterios:** hosting y costo autorizados; uso comercial, límites, backups/restauración y seguridad revisados; estado de empresas y soporte operativo definidos; aprobación expresa para publicar. No asumir que un plan gratuito es suficiente.

## Modelo futuro, fuera de la implementación inicial

- Planes, suscripciones, límites y habilitación de módulos por tenant. No pagos automáticos ni integraciones ahora.
- Capacidades de reparaciones/órdenes de servicio, ventas minoristas, inventario/productos, gestión de clientes y distribución mayorista como módulos que la plataforma podrá ofrecer; no diseñar cada módulo todavía.
- Detalles operativos de sucursales y depósitos que aún no estén definidos; la posibilidad de múltiples sucursales por empresa y las asignaciones de acceso ya están acordadas.

Estos elementos no amplían el alcance del primer tenant ni autorizan su implementación. Su análisis requiere una decisión y etapa posteriores.


## Seguridad de catalogo, precios e identidad de cliente

La configuracion tenant-scoped priceVisibility (PUBLIC/AUTHENTICATED_CUSTOMERS) esta modelada en Prisma y en la migracion inicial create-only. La aplicación previa de `init` fue confirmada por el responsable; falta volver a verificar el historial real de PostgreSQL.

Antes de habilitar precios privados o compra se debe completar y validar la integración de Better Auth, vincular de forma tenant-aware la identidad autenticada a Customer y definir los estados comerciales necesarios. El catalogo publicado permanece publico. El servidor debe separar la lectura de precios de la autorizacion para agregar/confirmar pedidos; la politica PUBLIC nunca habilita compras por si sola.

Validar que no se serialicen precios privados en JSON publico, endpoints, HTML/RSC, metadatos o caches compartidas. No hay rutas comerciales en el scaffold actual, por lo que estas comprobaciones quedan para la implementacion de esos casos de uso.


## Integridad historica y concurrencia

La migracion init create-only incorpora locks compartidos de filas padre, checks de integridad, proteccion de identidad de presentaciones y ledger StockMovement append-only. La prueba con dos sesiones independientes en un PostgreSQL temporal confirma que ambos ordenes de concurrencia se serializan para OrderLine/ProductPresentation y StockMovement/Product. Antes de habilitar casos de uso, implementar locks multi-fila ordenados antes de leer unidades, transacciones atomicas y manejo/reintento de conflictos.

Sigue pendiente definir ciclo de vida/estados de pedido y en que momento se congelan snapshots de OrderLine. No congelar pedidos en preparacion ni crear etiquetas de estado sin aprobacion.


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
