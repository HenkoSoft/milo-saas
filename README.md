# MILO — Plataforma de HenkoSoft

La plataforma será un SaaS multiempresa con una sola aplicación y marca global. Cada empresa tendrá sus propios usuarios y datos, aislados del resto. Milo Store será el primer tenant y utilizará inicialmente el módulo de tienda mayorista de repuestos y productos para celulares.

La plataforma se identifica como MILO y es desarrollada por HenkoSoft. Milo Store es el primer tenant y tiene su portal comercial en `/tiendas/milo-store`. El panel administrativo y de ventas conserva una interfaz global de MILO. Los sitios comerciales admiten personalización acotada mediante plantillas compartidas; no se implementa white-label completo.

## Estado del repositorio

El sitio institucional de MILO ocupa `/`, `/plataforma`, `/funcionalidades`, `/soluciones`, `/nosotros` y `/contacto`. El contenido mayorista de Milo Store está en `/tiendas/milo-store`. `/acceso` informa que el ingreso de usuarios todavía no está disponible; no contiene un login ni registro. Hay layouts y navegación responsive compartidos, metadatos por página y recursos SVG locales. El portal comercial usa una plantilla mayorista reutilizable en `app/(comercial)/tiendas/[slug]`, con contratos públicos, registro editorial server-only limitado a `milo-store` y CSS acotado; no resuelve un Tenant de Prisma. Las capacidades comerciales se describen como alcance previsto, sin operaciones de negocio habilitadas.

Estado local confirmado en las etapas anteriores: init y add_better_auth aplicadas, variables locales de Better Auth configuradas e inicialización/lecturas verificadas sin crear identidades. Esta tarea modifica solo la superficie pública; no toca autenticación, base ni migraciones.

## Primer módulo: distribución mayorista de Milo Store

- El alcance V1 comprende los nueve ámbitos definidos en [Alcance Mayorista V1](docs/WHOLESALE_V1_SCOPE.md): empresa, usuarios/sucursales, catálogo, categorías/marcas, lista general mayorista, clientes, pedidos, inventario y consultas.
- Incluye catalogo publicado siempre visible, precios configurables por tenant, compra solo con autorizacion comercial, inventario con movimientos y stock no negativo, y pagos manuales.
- El esquema Prisma representa unidad base, presentaciones con conversión y precio mayorista propios y snapshots en pedidos. Los casos de uso comerciales todavía no están implementados.
- La solicitud se aprueba manualmente y no hay autorregistro. La landing tiene un enlace saliente a WhatsApp, sin integración API.
- El producto debe ser mobile-first; PWA instalable solo si no agrega complejidad significativa.

El tenant inicial se configura en Argentina, en ARS, español y zona `America/Argentina/Buenos_Aires`. Cada empresa puede tener una o varias sucursales; no se fija aquí una cantidad de depósitos.

## Capacidades futuras de la plataforma

La plataforma podrá ofrecer módulos de reparaciones/órdenes de servicio, ventas minoristas, inventario y productos, gestión de clientes y distribución mayorista. La disponibilidad por tenant podrá depender de planes. No se implementan ahora todos esos módulos, ni pagos de suscripción o integraciones de pago. La operación detallada de sucursales queda por definir; la plataforma admite una o varias sucursales por empresa.

La administración SaaS podrá gestionar empresas y estados de cuenta. El modelo futuro incluye planes, suscripciones, límites y módulos habilitados. Su alcance operativo y momento de implementación están pendientes.

## Tecnologías y entorno

Next.js 16, React 19, TypeScript estricto, Tailwind CSS, PostgreSQL 17, Prisma ORM Community 7.10.1 y Better Auth 1.7.18. Se conservan las decisiones de Supabase PostgreSQL/Storage, shadcn/ui, Zod y GitHub. Docker Desktop/WSL2 y Compose soportan el PostgreSQL local existente. No cambiar tecnologías ni contratar servicios pagos sin autorización.

## Desarrollo local actual

Requisitos: Node.js compatible con Next.js y npm.

```sh
npm install
npm run dev
```

Abrí `http://localhost:3000`. Para las validaciones configuradas, usá `npm run lint`, `npm run typecheck` y `npm run build`. `npm run prisma:validate` y `npm run prisma:generate` requieren que `DATABASE_URL` esté definida; la validación del schema no conecta a la base.

Prisma ya declara `DECIMAL(18,2)` para importes y `DECIMAL(18,3)` para cantidades/factores, y carga `.env` desde `prisma.config.ts`. Siguen pendientes los códigos del catálogo de unidades, redondeos, ciclo de vida de pedidos, snapshots de contacto y auditoría polimórfica.

### Better Auth: etapas 1 y 2

Better Auth administra identidad, credenciales y sesiones. MILO conserva empresas, empleados, sucursales, roles y permisos. Email globalmente único; vínculo opcional y único por `UserProfile.authUserId`, nunca por email, con FK `ON DELETE RESTRICT`. Una sesión no otorga acceso empresarial ni acceso a precios privados o compra.

El registro público está bloqueado en servidor con `emailAndPassword.disableSignUp: true`. No se usa Organization ni proveedores sociales. Las invitaciones de OWNER/ADMIN, el proveedor de correo y las pantallas de login siguen pendientes.

Antes de ejecutar autenticación, configurar `BETTER_AUTH_URL` y un `BETTER_AUTH_SECRET` aleatorio de al menos 32 caracteres en el entorno local. `.env.example` documenta las variables; esta tarea no modifica `.env`. No hay secreto de respaldo configurado por MILO. Ambas migraciones ya fueron aplicadas y verificadas en etapas anteriores; el desarrollo público no ejecuta migraciones. Pruebas sin PostgreSQL: `node --test tests/auth-boundary.test.mjs`.

## Aislamiento y seguridad

Cada dato de negocio debe quedar ligado a un tenant, normalmente mediante `tenant_id`. Cada usuario pertenece a una única empresa, que administra sus usuarios y empleados. Un empleado puede tener asignación a una o varias sucursales de esa empresa; un administrador autorizado puede acceder a todas las sucursales de su empresa. Las operaciones resuelven tenant, sucursal aplicable y permisos en servidor; no confían en el tenant ni el alcance enviados por el navegador. El acceso y los permisos nunca salen de la empresa del usuario, y ningún usuario accede a datos de otra empresa. Las relaciones y restricciones impiden referencias cruzadas. La administración SaaS gestiona información de plataforma y no amplía el acceso a los datos de negocio de una empresa.

La politica de precios depende de priceVisibility por tenant; los precios privados nunca se filtran a visitantes no autorizados, HTML, RSC, metadatos ni caches compartidas.

## Documentación

- [Instrucciones permanentes](AGENTS.md)
- [Arquitectura](docs/ARCHITECTURE.md)
- [Roadmap](docs/ROADMAP.md)
- [Diseño conceptual de datos](docs/DATABASE.md)
- [Modelo Mayorista V1 y restricciones pendientes](docs/DATA_MODEL_V1.md)
- [Registro de decisiones](docs/DECISIONS.md)


### PostgreSQL local

El entorno de desarrollo puede usar PostgreSQL local mediante Docker Compose. Consulte [docs/DATABASE.md](docs/DATABASE.md) para los requisitos, configuración de `.env`, comandos de inicio/estado/logs/detención y persistencia. Prisma 7 carga `.env` desde `prisma.config.ts`.


### Catalogo y precios en MILO V1

El catalogo por tenant siempre sera publico para productos publicados, imagenes, descripciones, categorias, marcas y presentaciones. La visibilidad de precios se configura por empresa: PUBLIC o AUTHENTICATED_CUSTOMERS (valor inicial y predeterminado). Milo Store comienza con precios privados para clientes autenticados, autorizados y activos de su tenant. Consultar precios no autoriza a comprar; la compra se valida aparte en servidor. La configuración server-only y el endpoint de Better Auth están implementados; no hay endpoints comerciales ni integración de autenticación validada contra PostgreSQL.


### Integridad de inventario e historial

La migracion inicial create-only protege cambios de unidad frente a escrituras concurrentes con locks de fila. StockMovement es append-only. Las reglas para congelar snapshots de OrderLine esperan la definicion de estados/ciclo de vida de pedidos. La migracion está aplicada según confirmación del responsable.
