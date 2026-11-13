# Proveedores V1 — contrato de datos, acceso e interfaz

Estado: contrato aprobado explícitamente el 2026-11-11. Implementado y probado en base aislada; migración 20261111235000_add_suppliers aplicada posteriormente a milo_dev mediante Prisma Migrate con autorización expresa, respaldo externo verificado y datos anteriores intactos. Seis migraciones aplicadas y ninguna pendiente. Las instrucciones de aislamiento siguientes describen la preparación/pruebas; la aplicación real fue una operación posterior autorizada.

## Relevamiento y dependencias

- Rama verificada: `main`. Hay cambios anteriores pendientes que deben conservarse; no realizar commits ni pushes.
- No existe un modelo `Supplier` en el esquema Prisma actual. La inspección de metadatos PostgreSQL en una transacción de solo lectura confirmó que tampoco existen `public.suppliers`, `public.supplier_counters` ni tablas con nombres de proveedores o compras. No se consultaron fichas comerciales para este relevamiento.
- El esquema dispone de Tenant, Customer, WholesaleOrder, StockMovement y AuditEvent, pero no de un módulo de compras ni relaciones tipadas hacia proveedores. Los movimientos de inventario existentes no identifican un Supplier; no reinterpretar sus referencias libres ni vincular registros históricos.
- Clientes ofrece el patrón reutilizable: `RecordWorkspace`, `RecordEditor`, `EditorTabs`, `EditorTabPanel`, `EditorFooter`, `TableEditAction` y conservación de URL/scroll mediante `useRecordListRefresh`. Seguir [ADMIN_FORMS.md](ADMIN_FORMS.md) y [ADMIN_TABLES.md](ADMIN_TABLES.md).
- Proveedores figura como pendiente en el sidebar. Su enlace operativo deberá respetar los permisos efectivos, sin habilitar Compras.

## Modelo propuesto

Crear Supplier y SupplierCounter, ambos propiedad de un tenant. No modificar Customer ni sus registros, Better Auth, `.env`, Docker o las cinco migraciones anteriores.

Supplier tendrá `id` UUID, `tenantId` UUID obligatorio, `commercialNumber` entero positivo obligatorio, `createdAt` y `updatedAt`, además de estos campos:

| Campo | Contrato |
| --- | --- |
| `legalName` | Razón social, hasta 200 caracteres, opcional si hay nombre comercial. |
| `commercialName` | Nombre comercial, hasta 200 caracteres, opcional si hay razón social. |
| `cuit` | CUIT opcional; once dígitos canónicos y verificador válido cuando se complete. |
| `vatCondition` | Condición frente al IVA opcional; reutilizar el catálogo ya documentado en Clientes, sin consultas a padrones. |
| `contactName` | Nombre de contacto, hasta 200 caracteres, opcional. |
| `phone`, `whatsapp` | Teléfono y WhatsApp independientes, hasta 50 caracteres cada uno, opcionales. No agregar un celular separado que no fue solicitado. |
| `email` | Correo válido cuando se complete, hasta 254 caracteres, opcional. |
| `address` | Dirección, hasta 400 caracteres, opcional. |
| `postalCode` | Código postal, hasta 20 caracteres, opcional. |
| `city`, `province`, `country` | Localidad, provincia y país, hasta 100 caracteres cada uno, opcionales y sin valores personales predeterminados. |
| `internalNotes` | Observaciones internas, texto plano hasta 2.000 caracteres, opcional; admite saltos de línea. |

Requerir únicamente razón social o nombre comercial no vacío. El contacto no reemplaza automáticamente esos campos. Las cadenas opcionales vacías se guardan como null; rechazar controles, longitudes excesivas y claves ajenas al contrato mediante Zod estricto. No agregar aprobación comercial, identidad autenticable, estados ficticios de activación, saldos, deudas, cuentas corrientes, crédito o condiciones de pago automatizadas.

### Código y aislamiento estructural

- Código visible `P000001`: prefijo P y número con mínimo seis dígitos, único dentro de la empresa e inmutable. El navegador no asigna ni modifica el número.
- SupplierCounter usa `tenantId` como clave primaria y `lastNumber` como entero no negativo. El incremento y el alta forman una única transacción; no reciclar códigos de proveedores borrados.
- Supplier conserva claves únicas `(tenantId, id)` y `(tenantId, commercialNumber)`, FK a Tenant con RESTRICT y restricciones de número positivo, CUIT e IVA. El trigger de inmutabilidad protege tenant y número comercial.
- Las futuras relaciones de compras deberán usar `(tenantId, supplierId)` con FK compuesta a Supplier y borrado RESTRICT. No crear ahora compras, movimientos, documentos ni relaciones simuladas en el modelo de aplicación.

## Acceso, concurrencia y auditoría

Solo OWNER/ADMIN con alcance COMPANY y sin sucursal en esa asignación pueden listar, consultar, crear, editar y eliminar proveedores de su propia empresa. Resolver identidad, perfil, tenant y roles desde la sesión en servidor y volver a comprobar la membresía dentro de la transacción. Los roles operativos, asignaciones incompatibles y administración central sin membresía válida quedan denegados.

Filtrar todas las lecturas y escrituras por tenant. Usar lecturas coherentes y transacciones Serializable para mutaciones, con control optimista por `tenantId/id/updatedAt`, sin reintentos automáticos de escrituras ni sobreescritura de conflictos. Un guardado sin cambios no modifica timestamps ni agrega auditoría.

Registrar SUPPLIER_CREATED, SUPPLIER_UPDATED y SUPPLIER_DELETED en AuditEvent con `entityType = Supplier`, ID lógico, actor y tenant, dentro de la misma transacción que la operación. No copiar datos fiscales, contacto u observaciones a los eventos o logs. Conservar las auditorías aun después de un borrado físico autorizado; cualquier fallo de auditoría revierte la mutación.

## Eliminación segura y compras futuras

1. Papelera accesible con tooltip, nombre contextual, teclado y confirmación explícita de una acción permanente. Cancelar no escribe.
2. El servidor valida confirmación, ID y versión; autoriza desde sesión, bloquea la fila Supplier y vuelve a comprobar membresía, versión e historial antes del borrado.
3. Actualmente no hay relaciones de compras o movimientos hacia Supplier. Verificar los metadatos de FK entrantes y denegar ante cualquier relación nueva o no revisada, incluso si usa CASCADE. Esto impide que una evolución del esquema haga inseguro el borrado. No borrar dependencias ni realizar cascadas.
4. SUPPLIER_CREATED y SUPPLIER_UPDATED administrativos se conservan y no bloquean por sí solos. Cualquier otra auditoría del proveedor bloquea el borrado por historial protegido o desconocido.
5. Solo sin referencias protegidas ni historial incompatible, borrar físicamente y agregar SUPPLIER_DELETED atómicamente. No implementar una desactivación sin contrato ni campo aprobado.

El bloqueo por referencias se probará con relaciones sintéticas únicamente en la base aislada. No presentar como implementado un módulo real de compras inexistente. Al agregar compras en una etapa futura se deberán revisar explícitamente las comprobaciones de historial y las FKs, conservando el bloqueo mientras no exista esa revisión.

## Interfaz y navegación

Actualización visual posterior solicitada por el usuario: alta y edición presentan todos los campos existentes en una única vista compacta, sin pestañas. Código de solo lectura en la primera fila junto a razón social/contacto, domicilio y datos fiscales en filas, observaciones al final y Guardar/Cancelar fijos. Reemplaza únicamente la organización en pestañas de la propuesta inicial; no modifica el modelo, permisos, servicios ni validaciones. Web, Rubro y Fax de la captura requieren un alcance de datos separado y no forman parte del modelo implementado.

- Rutas `/panel/proveedores`, `/panel/proveedores/nuevo` y `/panel/proveedores/[id]`, con el mismo formulario reutilizado en modal y páginas directas.
- Tabla compacta de 25 registros por página, orden estable por creación/ID y búsqueda por código, razón social, nombre comercial, CUIT, contacto, teléfono, WhatsApp y correo. Sin filtros ni ordenamiento aparentes que no estén implementados.
- Columnas iniciales: Código, Razón social, Nombre comercial, Dirección, Contacto, Teléfono, CUIT y Acciones. Datos ausentes «—», CUIT visible con guiones y valores canónicos intactos. No confundir teléfono con celular ni razón social con contacto.
- Nuevo proveedor y Editar abren el modal compartido. Datos: nombres, contacto y domicilio; Datos comerciales: CUIT e IVA; Observaciones: texto interno. Diseño de tres columnas cuando el ancho lo permita, sin pestañas vacías ni campos comerciales inventados.
- Pie Guardar/Cancelar fijo, foco, Escape, confirmación por cambios pendientes, estados de error/conflicto sin descartar valores, y rutas directas operativas para recarga/enlaces.
- Guardar o eliminar con éxito refresca el mismo listado conservando búsqueda, filtros existentes, página y scroll hasta donde permitan los resultados. Mantener tabla con desplazamiento interno y encabezados visibles, sin desbordar toda la página.
- Mantener el diseño y los controles de MILO a 1920 × 1080; en pantallas menores permitir scroll interno. No ocultar datos o botones para ajustar altura/ancho.
- Las observaciones internas se cargan solo en la ficha autorizada, no en el listado.
- Incorporar el enlace Proveedores al sidebar únicamente para OWNER/ADMIN COMPANY. Antes de aplicar la migración, mostrar un aviso real de estructura pendiente y bloquear formularios/mutaciones; no simular un listado vacío ni crear datos.

## Migración y comprobaciones

Preparar una migración aditiva para Supplier/SupplierCounter, índices, restricciones y trigger. La relación inversa en Tenant es solo metadato Prisma; no alterar filas de Tenant ni de Customer. Conservar byte a byte las cinco migraciones anteriores, Better Auth y `.env`.

Probar el SQL únicamente en una base PostgreSQL temporal de propiedad verificada, con destino explícito, fixtures sintéticos y limpieza limitada a esa base. No ejecutar migraciones, altas, ediciones o borrados sobre `milo_dev`. La aplicación real de la nueva migración requerirá autorización posterior independiente.

Criterios de aceptación:

- OWNER y ADMIN autorizados; otros roles, suplantación de tenant, revocación de membresía y cruces de empresa rechazados.
- Alta mínima, persistencia de todos los campos, CUIT opcional/verificador, límites, controles, correo, IVA y claves desconocidas cubiertos por pruebas.
- Numeración independiente por tenant, unicidad/inmutabilidad y concurrencia; conflictos sin pérdida de cambios ni reintentos automáticos.
- Borrado permitido sin historial, auditorías retenidas, bloqueo por relaciones/historial/versión y rollback de alta/edición/borrado si falla la auditoría.
- Apertura/cierre, teclado, pestañas, foco, Escape, confirmaciones y conservación del estado del listado en pruebas de interfaz.
- Prisma validate, lint, typecheck, pruebas, build con HTTPS temporal de proceso y `git diff --check`. Informar los límites de la comprobación visual real; no confundir DOM con validación de dimensiones.

Esta aprobación autoriza el contrato de datos y acceso descrito para desarrollar el módulo y probar su migración en aislamiento. No autoriza aplicar la migración a `milo_dev`, desarrollar Compras, modificar datos reales ni publicar cambios en Git.
