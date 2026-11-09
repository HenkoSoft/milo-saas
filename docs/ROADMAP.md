# Roadmap de la plataforma SaaS

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
