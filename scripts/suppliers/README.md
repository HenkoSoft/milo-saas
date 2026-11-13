# Pruebas aisladas de Proveedores V1

Contrato aprobado: [SUPPLIERS_V1_PROPOSAL.md](../../docs/SUPPLIERS_V1_PROPOSAL.md), D-045.

Ejecutar `node scripts/suppliers/test-postgres.mjs --run-isolated`.
El script lee `.env` sin modificarlo, exige origen local `milo_dev` y conecta
exclusivamente a `postgres` para crear su propia base `milo_supplier_test_<hex>`.
Luego conecta solo a esa base aislada. No abre conexión a `milo_dev`, no ejecuta
Docker ni aplica migraciones en la base real.

En la base nueva vacía aplica el SQL exacto de las cinco migraciones anteriores,
crea fixtures sintéticos con correos `.invalid`, prueba el estado pendiente y
aplica exclusivamente allí `20261111235000_add_suppliers`. Verifica que ninguna
fila de las tablas previas cambia al aplicar la migración y que los clientes de
prueba permanecen intactos durante todas las operaciones de Proveedores.

La integración usa el servicio real con Prisma y PostgreSQL, sustituyendo solo
la frontera de sesión. Cubre persistencia de campos, alta mínima, CUIT/IVA,
OWNER/ADMIN, otros roles, tenant cruzado, membresía revocada, numeración por
empresa, búsqueda/paginación, control de versión, no-op, concurrencia, borrado
permitido/protegido, auditorías retenidas y rollback de alta/edición/borrado si
falla la auditoría. Las relaciones de compra se simulan mediante tablas de
fixtures solo en la base aislada, sin agregar modelos de compra a la aplicación.

La eliminación toma el bloqueo de tabla de DELETE antes de la primera lectura
de su transacción, bloquea la fila y deniega cualquier FK entrante no revisada.
Esto mantiene estable la comprobación de referencias frente a la creación
concurrente de una FK. Se prueban tanto una referencia comercial no confirmada
como una FK CASCADE creada concurrentemente: los proveedores y referencias se
conservan. Referencia del comportamiento de bloqueo: [PostgreSQL 17, ADD FOREIGN KEY](https://www.postgresql.org/docs/17/sql-altertable.html).

Ante un fallo, el script informa solo etapa, código y nombre de su base temporal;
conserva esa base para inspección y no repara ni reintenta automáticamente. Al
pasar, desconecta sus clientes y elimina únicamente la base cuyo nombre, marca
de propiedad y ausencia de conexiones externas verificó.

La nueva migración crea solo Supplier, SupplierCounter y sus índices,
restricciones y trigger. No modifica filas existentes ni las migraciones previas.
**Autorizada y aplicada a milo_dev el 2026-11-11 mediante Prisma Migrate**,
con respaldo externo verificable y datos anteriores intactos. El script de este
directorio sigue limitado a la base aislada. En bases donde falte la migración, las rutas
informan la migración pendiente y bloquean formularios/mutaciones, sin simular
un listado vacío.

No existen compras, deudas, saldos, condiciones de pago automáticas ni
desactivación de proveedores en este módulo. Una futura relación comercial exige
su propio contrato y revisar los bloqueos de borrado antes de habilitarla.
