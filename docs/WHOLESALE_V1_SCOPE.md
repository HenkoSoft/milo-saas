# Alcance funcional — Módulo Mayorista V1

> Estado público vigente (D-021): MILO es la plataforma de HenkoSoft. Sitio institucional multipágina en `/`; Milo Store en `/tiendas/milo-store`; `/acceso` solo informa el estado del ingreso. Sin nuevos módulos, pantallas privadas ni cambios de datos. Las referencias históricas a una única landing quedan reemplazadas por esta estructura.

## Propósito y estado actual

Este documento define el alcance funcional del módulo Mayorista V1 de MILO SaaS, cuyo primer tenant es Milo Store. El alcance conserva las decisiones aprobadas del producto mayorista y se limita a las nueve áreas indicadas aquí. No incorpora módulos minoristas ni de reparaciones.

El portal informativo de Milo Store se encuentra en `/tiendas/milo-store`; conserva el contacto por WhatsApp y la explicación de aprobación manual. `/` pertenece al sitio institucional multipágina de MILO. El catálogo interactivo, precios privados, administración, inventario, carrito, pedidos y gestión de clientes siguen sin interfaz operativa. Lo incluido en V1 es alcance aprobado, no funcionalidad ya disponible.

Las referencias a WhatsApp describen el enlace de contacto existente; no implican una integración API. Los pedidos contemplan los medios manuales aprobados, sin pasarela ni procesamiento automático. Este documento no autoriza desarrollo ni cambios de servicios.

## Alcance por área

### 1. Empresas y configuración comercial

**Incluido en V1**

- Los datos comerciales pertenecen al tenant y quedan aislados de los demás tenants.
- Configuración inicial de Milo Store: Argentina, ARS, español y zona `America/Argentina/Buenos_Aires`.
- El perfil de empresa contempla nombre comercial, razón social, CUIT/datos fiscales, dirección, contacto y logo, según la decisión multi-tenant vigente.

**Pendiente**

- Implementar la consulta y administración del perfil en la aplicación.
- Definir campos obligatorios, validaciones y políticas de acceso/retención que siguen pendientes en las decisiones del SaaS.
- Definir si el logo se utiliza en documentos dentro del módulo Mayorista V1; el uso futuro del logo no extiende por sí solo el alcance funcional de este módulo.

**Fuera de alcance por ahora**

- Administración de planes, suscripciones, límites comerciales y cobros de suscripción.

### 2. Usuarios y sucursales

**Incluido en V1**

- Cada usuario pertenece a una única empresa; cada empresa administra sus propios usuarios y empleados.
- Una empresa puede tener una o varias sucursales. Un empleado puede tener acceso asignado a una o varias sucursales.
- Dueño y Administrador tienen alcance general dentro de su empresa. Los roles operativos respetan las sucursales asignadas.
- Los roles empresariales acordados son Dueño, Administrador, Encargado, Vendedor, Técnico y Depósito; un empleado puede tener varios y los operativos pueden variar por sucursal.
- Aplican los límites acordados para Dueño, Administrador y Encargado en `docs/DECISIONS.md`. Ningún usuario accede a datos de otra empresa. La administración central de HenkoSoft está separada.

**Pendiente**

- Completar la interfaz de ingreso, invitaciones de empleados por OWNER/ADMIN, administración de usuarios y asignaciones. Las etapas 1 y 2 incorporaron modelos, vínculo authUserId, configuración server-only y handler de Better Auth; la migración aditiva ya fue aplicada y la inicialización local fue verificada con lecturas. No hay registro público ni Organization. Proveedor de correo pendiente.
- Definir permisos específicos por acción para los roles, sin alterar sus límites y alcances ya aprobados.
- Definir detalles operativos de las sucursales que todavía no se hayan acordado.

**Fuera de alcance por ahora**

- Acceso de un mismo usuario a más de una empresa.
- Acceso entre empresas o mezcla de los roles empresariales con la administración central de HenkoSoft.
- Operaciones de roles ajenas al alcance mayorista. El rol Técnico no incorpora reparaciones ni órdenes de servicio a V1.

### 3. Catálogo de productos

**Incluido en V1**

- Productos de repuestos y productos para celulares con SKU, nombre, descripción, fotos, categoría, marca y estado de publicación.
- Cada producto tiene una unidad base de inventario y puede tener múltiples presentaciones de venta, cada una con nombre, unidad y factor de conversión a la unidad base. Ejemplos: unidad individual, caja de 10 unidades, metro y rollo de 100 metros.
- Una presentación puede habilitarse o deshabilitarse para nuevas ventas sin borrar su historial.
- Catálogo siempre público para productos publicados, imágenes, descripciones, categorías, marcas y presentaciones; no exponer datos internos, clientes ni inventario. No existe una opción para ocultar todo el catálogo.
- Búsqueda básica y ficha de producto.
- Precios/costos no se incluyen en respuestas públicas, incluso si el acceso a precios privados aún no está implementado.

**Pendiente**

- Implementar alta, edición y publicación administrativa, consulta pública, búsqueda y ficha.
- Definir detalles de búsqueda y presentación que no estén especificados en el alcance acordado.

**Fuera de alcance por ahora**

- Importación o exportación de productos en archivos.
- Funciones de catálogo no incluidas en la definición aprobada; no inferir filtros u opciones adicionales.

### 4. Categorías y marcas

**Incluido en V1**

- Asociar categoría y marca a los productos del catálogo.
- Mantener esos datos dentro del tenant correspondiente.

**Pendiente**

- Implementar administración de categorías y marcas junto con la administración básica de productos.
- Definir los campos y reglas de mantenimiento que no estén especificados.

**Fuera de alcance por ahora**

- Taxonomías, jerarquías u operaciones avanzadas no aprobadas.

### 5. Precios mayoristas

**Incluido en V1**

- Una lista general de precios mayoristas para productos del tenant, en ARS para Milo Store.
- La lista general guarda un precio mayorista independiente por presentación de venta.
- Tenant.priceVisibility configura precios como PUBLIC (cualquier visitante) o AUTHENTICATED_CUSTOMERS (identidad autenticada vinculada a Customer autorizado/activo del mismo tenant). El valor predeterminado y el valor inicial de Milo Store son AUTHENTICATED_CUSTOMERS.
- El catalogo publicado permanece publico; el servidor entrega precios segun Tenant.priceVisibility y no serializa precios privados para visitantes ni clientes no autorizados.

**Pendiente**

- Implementar la administración y consulta privada de la lista.
- Definir detalles de edición y presentación que no estén especificados.

**Fuera de alcance por ahora**

- Listas diferenciadas por cliente o condiciones de precio no aprobadas.
- Costos o precios incluidos en consultas públicas.

### 6. Clientes mayoristas

**Incluido en V1**

- Solicitud de acceso y aprobación manual por la empresa.
- No hay autorregistro ni acceso automático a precios.
- Administración básica de clientes mayoristas. Solo los clientes aprobados y activos acceden a precios y compra.
- La landing actual ofrece contacto por un enlace directo a WhatsApp para solicitar acceso; esto no equivale a una integración API.

**Pendiente**

- Implementar el flujo de solicitud, revisión y administración en la aplicación.
- Definir los datos exactos del cliente y los estados operativos que no estén decididos.
- Definir si el acceso seguirá iniciándose exclusivamente por WhatsApp o si tendrá otro canal aprobado.

**Fuera de alcance por ahora**

- Autorregistro de clientes.
- Gestión de clientes minoristas.

### 7. Pedidos y ventas

**Incluido en V1**

- Carrito y creación de pedidos online por clientes mayoristas autorizados y activos.
- Administración básica de pedidos.
- Precio e importe total determinados en servidor; el cliente no establece valores financieros.
- Cada línea conserva snapshots de la presentación, cantidad pedida, factor de conversión, cantidad equivalente en unidad base, precio e importe.
- Registro y confirmación manual de transferencia y efectivo, según el alcance mayorista aprobado. No se procesan pagos automáticamente.

**Pendiente**

- Implementar carrito, creación y administración de pedidos, y registro/confirmación manual.
- Definir estados detallados y reglas operativas no especificados en las decisiones existentes.

**Fuera de alcance por ahora**

- Ventas minoristas.
- Pasarelas, cobros automáticos e integraciones de pago.
- Funciones avanzadas de devoluciones o reembolsos.

### 8. Inventario y stock

**Incluido en V1**

- Inventario sencillo con entradas, salidas y ajustes registrados.
- El saldo y los movimientos se expresan exclusivamente en la unidad base del producto, con independencia de la presentación utilizada para vender.
- Cada cambio de stock queda respaldado por un movimiento persistente.
- El stock no puede ser negativo.
- Actualizar saldo y registrar el movimiento correspondiente en una transacción protegida contra concurrencia.
- Los datos y las operaciones quedan dentro del tenant y respetan el alcance de sucursal del usuario.

**Pendiente**

- Implementar la administración de inventario y la consulta de movimientos necesaria para gestionarlo.
- Definir los detalles de asociación con sucursales en operaciones concretas que no estén acordados.

**Fuera de alcance por ahora**

- Funciones de inventario avanzadas no aprobadas para V1.
- Importación y exportación mediante archivos.

### 9. Consulta de pedidos y operaciones

**Incluido en V1**

- Administración básica para consultar y gestionar pedidos.
- Persistencia de movimientos de stock para registrar entradas, salidas y ajustes.
- Consultas limitadas a la empresa y al alcance de sucursales correspondiente; ningún usuario consulta operaciones de otra empresa.

**Pendiente**

- Implementar vistas de consulta para administración.
- Definir si los clientes consultan sus propios pedidos desde la tienda y qué operaciones, además de pedidos y movimientos de inventario, requieren una pantalla de consulta.

**Fuera de alcance por ahora**

- Reportes, estadísticas o tableros avanzados.
- Consultas de operaciones de otros tenants.

## Decisiones aún necesarias

- Campos obligatorios, validación y administración en pantalla del perfil comercial de la empresa.
- Uso del logo en documentos dentro del módulo Mayorista V1.
- Permisos específicos por acción para los roles aprobados.
- Detalles no acordados de mantenimiento de productos, categorías, marcas y precios.
- Códigos del vocabulario de unidades, productos que admiten cantidades fraccionarias y reglas de redondeo. Prisma e init ya declaran `DECIMAL(18,2)` para importes y `DECIMAL(18,3)` para cantidades/factores; la aplicación previa de init fue confirmada por el responsable y no se revalidó en esta sesión.
- Tratamiento de modificaciones a datos de presentaciones ya referenciadas por pedidos; los pedidos conservarán snapshots históricos de los valores usados.
- Datos y estados del cliente y del pedido, y detalle operativo de las confirmaciones manuales.
- Visibilidad del historial de pedidos para clientes y pantallas para consultar operaciones/movimientos.
- Asociación de operaciones de inventario y pedidos a sucursales concretas.

Las decisiones pendientes de esta lista no amplían el alcance aprobado ni permiten asumir funciones adicionales.


## Decisiones aprobadas de visibilidad y compra

El catalogo de cada empresa siempre es publico. La publicacion de productos sigue siendo individual; no hay una opcion global para ocultar el catalogo. Se pueden consultar productos publicados, imagenes, descripciones, categorias, marcas y presentaciones. El catalogo nunca incluye clientes, datos internos ni movimientos de inventario.

Tenant.priceVisibility admite PUBLIC y AUTHENTICATED_CUSTOMERS, con valor predeterminado AUTHENTICATED_CUSTOMERS. La visibilidad es independiente por tenant; Milo Store inicia con AUTHENTICATED_CUSTOMERS. PUBLIC habilita la consulta de precios por cualquier visitante. AUTHENTICATED_CUSTOMERS exige identidad autenticada vinculada al Customer autorizado y activo de esa misma empresa. La mera autenticacion de un empleado, una solicitud pendiente o un Customer de otro tenant no concede acceso.

Ver precios no habilita comprar. La capacidad de agregar al pedido y confirmar la operacion se valida separadamente en servidor. Con precios publicos, un visitante puede ver precios y no puede comprar. No hay una matriz completa de permisos por accion aprobada.

La aplicación tiene configuración y endpoint de Better Auth; las rutas de catálogo y el vínculo Customer-identidad siguen pendientes. Antes de habilitar precios privados se requiere una identidad externa autenticada asociada a un Customer mediante una referencia generica tenant-scoped (issuer/subject y FK compuesta tenantId/customerId), con Better Auth seleccionado y vínculo Customer-identidad todavía pendiente. La solicitud de acceso no crea ni autoriza esa vinculacion.


## Reglas complementarias de historial

Una presentacion con lineas referenciadas conserva productId, unidad, dimension y factor; puede renombrarse o deshabilitarse y puede crearse otra presentacion. Product no cambia unidad base si existe StockBalance o StockMovement. StockMovement es append-only en PostgreSQL (sin UPDATE, DELETE ni TRUNCATE).

OrderLine conserva snapshots, pero sigue editable mientras no se haya definido el ciclo de vida y los estados del pedido. No se inventan estados ni se congela la preparacion; las reglas para congelar la historia siguen pendientes.


### Storefront editorial reutilizable (D-021, fases 2 y 3)

El portal /tiendas/milo-store ahora se sirve mediante app/(comercial)/tiendas/[slug], con plantilla mayorista y componentes comerciales reutilizables. Solo existe la entrada editorial milo-store; no corresponde a una creación, carga o consulta de Tenant. Personalización visual acotada al storefront y panel con identidad global de MILO. No cambian el esquema, los permisos, el alcance mayorista ni el acceso comercial.
