# Arquitectura SaaS multi-tenant

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
