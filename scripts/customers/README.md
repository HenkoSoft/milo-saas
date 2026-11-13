# Verificación aislada de Clientes

Contrato aprobado: `docs/CUSTOMERS_V1_EXPANSION_PROPOSAL.md` (D-043).

Ejecutar explícitamente `node scripts/customers/test-postgres.mjs --run-isolated`.
El script lee la configuración local sin modificar `.env`; exige un origen local
`milo_dev`, pero se conecta exclusivamente a `postgres` para crear su propia base
`milo_customer_test_<identificador aleatorio>` y luego a esa base. No abre conexión
a `milo_dev`, no inicia Docker y no ejecuta comandos Prisma contra la base real.

Aplica las cuatro migraciones históricas y la nueva migración SQL exacta solo en
la base aislada, con fixtures sintéticos y correos `.invalid`. Prueba compatibilidad
antes/después, conservación de estado/JSON/timestamps, persistencia comercial,
código por tenant, OWNER/ADMIN, aislamiento, validación, concurrencia, borrado sin
historial, bloqueo por pedidos/JSON/referencia desconocida/auditoría, retención de
auditorías y rollback. Incluye una referencia comercial no confirmada concurrente
con el borrado y comprueba que ninguna fila protegida se pierde.

Al pasar, desconecta los clientes y elimina únicamente la base creada, verificando
su nombre, marca de propiedad y ausencia de otras conexiones. Ante fallos conserva
la base identificada para revisión; nunca elimina ni restaura otras bases.

La migración `20261111043000_expand_customer_commercial_profile` fue **autorizada y aplicada a milo_dev el 2026-11-11 mediante Prisma Migrate**,
con respaldo externo y verificación de integridad. El script de pruebas de este
directorio sigue limitado a una base aislada. El SQL asigna números a clientes históricos
determinísticamente por tenant/createdAt/id; el SQL no
traslada JSON a columnas ni altera aprobación o relaciones. Es transaccional y
limita tiempos de espera; necesita planificar una ventana por el bloqueo de tabla
y revisar volumen antes de aplicarlo. Los CHECK y el trigger inmutable complementan
el esquema Prisma; commercialNumber nullable en Prisma por compatibilidad de
compilación tiene un CHECK PostgreSQL que exige número positivo no nulo.

Sin la migración, el módulo básico continúa operativo y muestra aviso; los campos
ampliados y Eliminar no se habilitan. Un estado parcial o restricciones ausentes
produce error y no permite escrituras. No hay listas de precios, crédito,
desactivación, envío de WhatsApp ni validación fiscal en línea.
