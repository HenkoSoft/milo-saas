# Registro de decisiones de Milo Store SaaS

Este registro distingue **Acordado**, **Previsto** y **Pendiente**. Las instrucciones vigentes del propietario reemplazan decisiones anteriores solo donde existe contradicción. La documentación resultante requiere aprobación antes de desarrollar cambios multi-tenant.

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
