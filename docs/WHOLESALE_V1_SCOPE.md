# Alcance funcional — Módulo Mayorista V1

> D-053 (2026-11-13): La corrección de navegación de Compras no amplía alcance: conserva borradores, recepción explícita, permisos, inventario e idempotencia. Ingreso y Consulta son recorridos de presentación del mismo módulo. Ver [navegación y pruebas](PURCHASES_MODAL.md).

> D-052 (2026-11-13): Compras conserva alcance y permisos. La corrección de apertura modal no habilita operaciones nuevas ni modifica datos de negocio. La modalidad nativa se verifica con React real y fixtures de memoria. Ver [prueba modal real](PURCHASES_MODAL.md).

> D-051 (2026-11-13): El ajuste visual y de rendimiento de Compras no amplía funcionalidad: conserva borrador, recepción, tenant y autorización. No habilita venta, deuda, fiscalidad ni pagos. Ver [mediciones, verificaciones y límites](PURCHASES_PERFORMANCE.md).

> D-050 (2026-11-12): Comprobante, categor?a e IVA manual de Compras quedan disponibles tras aplicar exclusivamente la octava migraci?n autorizada a `milo_dev`, con respaldo externo y conservaci?n de datos verificados. Ocho migraciones aplicadas y ninguna pendiente. No ampl?a el alcance aprobado, autorizaci?n comercial de Customer, fiscalidad, N/C ni pagos. Las notas anteriores de despliegue pendiente son hist?ricas. Ver [registro](DECISIONS.md#d-050--despliegue-autorizado-de-detalles-de-compras).

> D-049 (2026-11-12): reorganización administrativa de Compras en cinco destinos MILO. Continúa operativo V1 (séptima migración aplicada previamente), con referencia libre, borrador y recepción; la extensión de comprobante/categoría/IVA manual espera despliegue autorizado de la octava migración probada aislada. N/C sin operaciones; pagos permite consultar proveedores reales y bloquea cuenta corriente/pagos. No modifica autorización de Customer ni habilita venta, deuda, devolución o pago. Ver [contrato](PURCHASES_MODULE_RESTRUCTURE.md).

> D-048 (2026-11-12): Compras administrativas a proveedores implementadas en código según [PURCHASES_V1_PROPOSAL.md](PURCHASES_V1_PROPOSAL.md): OWNER/ADMIN COMPANY, borrador sin stock y recepción completa transaccional en la sucursal seleccionada. Esta operación no es la compra mayorista del Customer ni modifica su autorización comercial, precios de venta o visibilidad del catálogo. No marca pagos ni crea documentos fiscales. Migración probada únicamente en base aislada; no aplicada a `milo_dev`. Las referencias históricas a ausencia de Compras administrativas quedan superadas por este alcance acotado; devoluciones, pagos y automatizaciones no están implementados.

> D-047: la corrección del cliente Prisma de exportación no amplía permisos ni alcance mayorista. Mantiene la descarga aislada por tenant y no modifica clientes, proveedores ni autorizaciones comerciales.

> D-046: transferencia Excel e impresión de fichas en Clientes/Proveedores, con OWNER/ADMIN COMPANY y tenant de sesión. Importar no aprueba clientes, concede precios privados ni habilita compras. No agrega reglas de crédito, facturación o módulos; pruebas de escritura solo aisladas. Contrato: [ADMIN_DATA_TRANSFER_PROPOSAL.md](ADMIN_DATA_TRANSFER_PROPOSAL.md).

> D-045: Proveedores V1 administra fichas empresariales; su estructura fue autorizada y aplicada a milo_dev el 2026-11-11, con respaldo externo y datos previos intactos. Sin compra operativa ni acceso comercial por registrar un proveedor. Las referencias anteriores a Proveedores pendiente quedan superadas por [SUPPLIERS_V1_PROPOSAL.md](SUPPLIERS_V1_PROPOSAL.md).

> D-044 (alcance corregido): [ADMIN_TABLES.md](ADMIN_TABLES.md) queda como referencia opcional de Clientes y Proveedores. El usuario retiró la obligación de repetir ese formato en otros listados actuales o futuros; no se modifican modelos, datos, permisos ni reglas comerciales.

> D-043 (2026-11-11): ampliación de Clientes aprobada e implementada. La migración 20261111043000_expand_customer_commercial_profile fue autorizada expresamente y aplicada mediante Prisma Migrate a 127.0.0.1:5432/milo_dev, tras respaldo externo verificable. Quedaron cinco migraciones aplicadas y ninguna pendiente; las huellas de los campos originales de todas las tablas coinciden y los nuevos campos son consultables. El esquema anterior conserva su fallback básico; la ampliación ya está habilitada en milo_dev. Ver [CUSTOMERS_V1_EXPANSION_PROPOSAL.md](CUSTOMERS_V1_EXPANSION_PROPOSAL.md).


> D-041: implementada la administración básica de Clientes con listado, búsqueda, paginación y modal compartido, solo OWNER/ADMIN COMPANY del tenant. Contacto v1 y alta REGISTERED sin autorización comercial; estados anteriores inalterados y JSON incompatible protegido. Concurrencia y auditoría transaccionales, sin cambios de esquema ni datos reales durante la tarea. Contrato aprobado: [CUSTOMERS_V1_PROPOSAL.md](CUSTOMERS_V1_PROPOSAL.md). Supera las referencias anteriores a Clientes sin implementar.

> D-040: Productos, Marcas y Categorías comparten el patrón de alta/edición modal y sus páginas directas, sin cambios de servicios, permisos, auditoría ni modelo. Clientes y Proveedores siguen sin alta/edición implementada. Contrato y alcance: [ADMIN_FORMS.md](ADMIN_FORMS.md).

> D-039: el plan de activación se suministra privadamente por variables MILO_ACTIVATION_*, sin datos personales ni identificadores reales en el código. Se conservan journals y evidencias fuera de Git; las referencias históricas a un plan fijo quedan superadas. No se ejecuta activación ni se modifican datos en esta preparación. Ver DECISIONS.md y scripts/activation/README.md.

> D-038: los importes monetarios actuales y futuros del módulo, incluidos precios y totales cuando corresponda implementarlos, deben usar `100.000,00`. Norma global en [MONEY_FORMAT.md](MONEY_FORMAT.md). La presentación no habilita nuevas listas de precios, costos, impuestos, pagos, monedas ni reglas comerciales; aplicado actualmente a los campos de precio habitual y por presentación.

> D-034: el ingreso que mostraba resultado incierto falló por un cliente en memoria anterior a la migración, no por una modificación del contrato comercial. La investigación READ ONLY no encontró movimientos/saldos/auditorías de inventario de Milo Store. Caché y diagnóstico corregidos, sin recrear solicitudes ni datos; idempotencia, alcance por sucursal y reglas operativas conservados. Ver DECISIONS.md.

> Estado D-033, 2026-11-10: migración de trazabilidad aplicada de forma controlada a milo_dev; sus dos campos y dos CHECK quedaron verificados y las cuatro migraciones están al día. Respaldo completo validado y datos anteriores intactos. No se crearon movimientos ni se amplió el alcance mayorista. La aplicación no constituye una prueba de movimiento real desde el panel; las referencias siguientes a migración pendiente son históricas. Ver DECISIONS.md para la evidencia.

### Inventario manual preparado (D-033)

`/panel/inventario` consulta productos/saldos por sucursal e historial. `/ingresar` suma cantidades enteras en unidad base; `/ajustar` suma/resta con motivo obligatorio; referencia real opcional. Movimiento, incremento de saldo y auditoría atómicos, con UUID estable y lock de Product. OWNER/ADMIN COMPANY y WAREHOUSE BRANCH operan; MANAGER BRANCH consulta; SALES/TECHNICIAN sin acceso. Flujos completos/idempotencia/concurrencia/rollback probados realmente en PostgreSQL aislado. La migración de trazabilidad solo se preparó y probó: operaciones bloqueadas en milo_dev hasta autorización posterior de aplicación. Sin reservas, conversiones, fracciones, transferencias o ventas/pedidos. Ver D-033.

### Panel ERP y dashboard (D-032)

Inicio incorpora conteos reales del tenant de clientes registrados (todos los estados) y productos (publicados o no) para OWNER/ADMIN COMPANY. No concede acceso comercial ni aprobación. Ventas, pedidos, gráfico semanal y últimas ventas muestran estados vacíos; no se implementan operaciones o cifras simuladas. Sidebar agrupa Artículos/Administración con enlaces reales autorizados; los demás módulos figuran Próximamente. Alcance/sucursales asignadas se muestran sin inventar una sucursal activa. Ver D-032.

### Sucursales administrativas (D-031)

`/panel/sucursales` incorpora listado, búsqueda, paginación, alta y edición del nombre de sucursales reales del tenant autenticado. Solo OWNER/ADMIN COMPANY, con Zod, concurrencia y auditoría atómica. Branch no tiene dirección/contacto/estado; se conservan IDs y relaciones, sin borrado, asignaciones, stock ni cambios de historial. Pruebas de persistencia/rollback simuladas, sin crear sucursales en PostgreSQL. Ver D-031.

### Carga rápida de productos (D-030)

Alta/edición principal con nombre, SKU, descripción, categoría, marca opcional y precio de venta. Alta habitual por UN/COUNT con presentación individual factor 1 y precio explícito cero o positivo, en una transacción auditada. En edición se reutiliza una única individual habilitada o se crea si falta y se ingresa precio; casos ambiguos/especiales permanecen en «Opciones avanzadas». Se conservan las presentaciones adicionales y los productos existentes, sin migrarlos. Sin stock inicial, cálculos de fracciones/redondeos, ventas o pedidos. Pruebas en memoria sin datos reales nuevos; ver D-030.

### Marcas y presentaciones administrativas (D-029)

`/panel/marcas` permite listado, búsqueda, alta y edición; `/panel/productos/[id]` permite gestionar presentaciones, habilitación y precios separados. Solo OWNER/ADMIN COMPANY del tenant resuelto en servidor, con decimales exactos, concurrencia, historial protegido y auditoría atómica. Sin precio ni factor implícitos; precios cero o positivos autorizados. Negativos bloqueados y pendientes de definición, al igual que los cálculos de fracciones/conversión/redondeo. Pruebas de persistencia simuladas, sin generar datos reales. D-029 amplía D-027; no implementa catálogo público, stock, pedidos ni ventas.

> D-028: cargadas únicamente las unidades base aprobadas UN/COUNT (Unidad) y M/LENGTH (Metro). El alta de productos ya dispone de opciones; no se crearon productos, categorías, marcas, presentaciones u otros datos comerciales. El alcance y las reglas operativas pendientes no cambian. Las referencias a alta bloqueada por ausencia de unidades son históricas.

### Catálogo administrativo inicial (D-027)

`/panel/categorias` y `/panel/productos` permiten administración básica tenant-scoped por OWNER/ADMIN COMPANY, con búsqueda, alta y edición de fichas. Marcas existentes seleccionables; presentaciones y precios en lectura. Sin unidades base cargadas el alta de productos se deshabilita; no se inventa su vocabulario ni se generan datos. Los valores operativos de fracciones/conversiones/redondeos siguen pendientes y no se calculan. No hay eliminación, stock, pedidos, ventas ni cambios al storefront público. Ver D-027 en DECISIONS.md.

### Configuración de empresa inicial (D-026)

La administración básica del perfil tiene ahora `/panel/empresa`: OWNER/ADMIN COMPANY pueden consultar su empresa y editar el nombre comercial. Dirección y contacto permanecen de lectura por contratos pendientes; también son de lectura moneda, locale, zona horaria y priceVisibility. Validación, aislamiento y auditoría mínima del cambio implementados sin alterar Prisma ni permisos de otros módulos. No se habilitan edición de precios, datos fiscales, storefront, logo, catálogo, inventario o pedidos. Pruebas del guardado realizadas en memoria, sin crear o modificar datos reales de empresa.

> D-025, 2026-11-09: Milo Store y responsable autorizado como OWNER/COMPANY sin sucursal quedaron activados. No se crearon productos, clientes, pedidos ni otros datos comerciales, ni se amplió el alcance mayorista. Sin sesiones automáticas y emailVerified=false; primer ingreso manual pendiente. Las referencias a activación sin ejecutar describen etapas anteriores.

### Preparación local de activación (D-024)

Se preparó un [CLI local de uso único](../scripts/activation/README.md) para Milo Store y su primer OWNER, sin ejecutar el alta. Sobre milo_dev solo se realizó dry-run read-only; no se crean tenants, identidades, roles ni sesiones. El rollback PostgreSQL real pasó en una base temporal autorizada, verificada vacía y eliminada. Registro público deshabilitado y alcance mayorista intacto; no se habilitan precios, compra ni nuevos módulos.

> Estado actualizado D-023: `/acceso` ofrece ingreso real por correo/contraseña y `/panel` tiene estructura protegida empresarial. Solo se muestran cuenta, empresa y asignaciones reales autorizadas. Sin registro público, invitaciones, métricas ficticias ni módulos comerciales operativos. TenantStorefront permanece aplicado, sin integración editorial. Las referencias anteriores a ingreso informativo o login pendiente describen etapas previas.

## Preparación editorial sin funcionalidad operativa (D-022)

TenantStorefront representa configuración editorial futura aislada por tenant: plantilla WHOLESALE, política MANUAL, borrador y snapshot publicado JSONB, fecha y revisión para concurrencia. El [contrato previsto](DATA_MODEL_V1.md#tenantstorefront--preparación-de-persistencia-editorial-d-022) y la publicación manual por OWNER/ADMIN están documentados; autorización, validación, edición y publicación efectivas siguen pendientes. La migración ya se aplicó; el portal sigue usando el registro editorial existente.

Esto no incorpora catálogo operativo, panel, login, endpoints ni autorregistro. No cambia Tenant.priceVisibility, el acceso a precios privados, la autorización separada de compra ni las restricciones comerciales/Better Auth existentes.

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

- Alta, edición y estado de publicación de fichas implementados en el panel (D-027); el alta exige unidades existentes. Administración de presentaciones implementada en D-029. Consulta pública, búsqueda/ficha pública e imágenes siguen pendientes.
- Definir detalles de búsqueda y presentación que no estén especificados en el alcance acordado.

**Fuera de alcance por ahora**

- Importación o exportación de productos en archivos.
- Funciones de catálogo no incluidas en la definición aprobada; no inferir filtros u opciones adicionales.

### 4. Categorías y marcas

**Incluido en V1**

- Asociar categoría y marca a los productos del catálogo.
- Mantener esos datos dentro del tenant correspondiente.

**Pendiente**

- Administración básica de categorías implementada (D-027); administración de marcas implementada (D-029) y seleccionable en productos.
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

- Administración del precio independiente por presentación implementada (D-029). Consulta comercial privada para clientes pendiente.
- Definir detalles de edición y presentación que no estén especificados.

**Fuera de alcance por ahora**

- Listas diferenciadas por cliente o condiciones de precio no aprobadas.
- Costos o precios incluidos en consultas públicas.

### 6. Clientes mayoristas

**Implementado en D-041:** administración básica de fichas en `/panel/clientes`, búsqueda, paginación, alta/edición modal y rutas directas. Solo OWNER/ADMIN COMPANY del tenant; nombre, correo, teléfono y dirección en contactData v1. Altas REGISTERED sin autorización comercial; estados previos inalterados y JSON histórico incompatible protegido. Sin modificar el esquema ni crear datos reales durante la implementación.

**Incluido en V1**

- Solicitud de acceso y aprobación manual por la empresa.
- No hay autorregistro ni acceso automático a precios.
- Administración básica de clientes mayoristas. Solo los clientes aprobados y activos acceden a precios y compra.
- La landing actual ofrece contacto por un enlace directo a WhatsApp para solicitar acceso; esto no equivale a una integración API.

**Pendiente**

- Implementar el flujo de solicitud, revisión y aprobación comercial; el alta administrativa no lo sustituye.
- Definir estados operativos adicionales a REGISTERED y campos adicionales al contrato mínimo de contacto aprobado en D-041.
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

- Activar el módulo manual mediante aplicación controlada de la migración pendiente, con autorización posterior. Código y pruebas aisladas completos en D-033; milo_dev no fue migrado.
- Movimientos por pedidos/ventas, cantidades fraccionarias, conversiones y reversos automáticos siguen pendientes.

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
