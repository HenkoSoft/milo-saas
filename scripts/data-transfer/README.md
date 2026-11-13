# Pruebas aisladas de Excel e impresión de MILO

Diagnóstico D-047: si la API conserva metadatos de un cliente Prisma anterior a un modelo nuevo, la lectura puede fallar aunque las pruebas en procesos nuevos pasen. La caché comprueba constructor y delegados actuales; al incorporar modelos corresponde generar el cliente y recargar Next.js. No resolverlo ejecutando migraciones innecesarias ni cambiando datos. Los fallos de descarga registran solo campos técnicos permitidos y tienen un mensaje propio, sin exponer SQL, valores o credenciales.

Contrato aprobado: [ADMIN_DATA_TRANSFER_PROPOSAL.md](../../docs/ADMIN_DATA_TRANSFER_PROPOSAL.md), D-046. No se agregan ni aplican migraciones.

Ejecutar explícitamente `node scripts/data-transfer/test-postgres.mjs --run-isolated`.
El script lee `.env` sin modificarlo, exige origen local `milo_dev` y se conecta
exclusivamente a `postgres` para crear su propia base `milo_transfer_test_<hex>`.
Verifica el nombre, que esté vacía y su propiedad; aplica las seis migraciones
existentes solamente allí. No abre una conexión a `milo_dev` ni ejecuta Docker.

Usa sesiones simuladas y el servicio/Prisma/PostgreSQL reales con fixtures
sintéticos. Comprueba XLSX de ida/vuelta, exportación filtrada de todas las páginas,
permisos/revocación, aislamiento, vista previa sin escrituras, altas atómicas,
validación fiscal, coincidencias, cambios entre análisis/confirmación, numeración,
repetición de operación, concurrencia y rollback de filas/contador/auditoría.
Conserva estados/JSON histórico y todos los campos originales de las fichas semilla.
La exportación excesiva genera error visible, sin truncar a 5.000 silenciosamente.

Al pasar, desconecta sus clientes y elimina solo la base cuyo nombre, marca de
propiedad y ausencia de conexiones externas comprobó. Si falla, informa etapa,
código y nombre de su base para revisión; no fuerza reparación, restauración ni
reintentos. Nunca importar archivos de usuarios ni probar escrituras sobre datos
reales como parte de este script.

`npm test` cubre XLSX/ZIP y la interfaz React/DOM con fixtures en memoria, sin
conexiones a PostgreSQL. Rechaza fórmulas, conversiones numéricas ambiguas, columnas
ocultas/desconocidas, archivos excesivos, tamaños ZIP falseados, XML con entidades,
macros y enlaces externos. Preserva ceros iniciales y texto literal. La plantilla
está vacía; IVA/documentos continúan usando los contratos existentes.

Límites V1: 5 MiB comprimidos, 32 MiB descomprimidos, 256 entradas ZIP y 500 filas
por importación. Exportación/impresión: hasta 5.000 resultados de la búsqueda,
incluyendo todas sus páginas. Altas únicamente; las fichas existentes nunca se
actualizan desde Excel. Las coincidencias exactas se omiten y los conflictos
impiden todo el lote. Los campos históricos informativos no crean JSON heredado.

ExcelJS 4.4.0 y yauzl 3.4.0 se ejecutan localmente, con licencias MIT. El override
de uuid 11.1.1 se limita a ExcelJS, que utiliza la API v4 compatible, para evitar
una dependencia con aviso de seguridad; no se aplica `npm audit fix --force`.

«Imprimir PDF» abre una vista privada A4 horizontal y el diálogo de impresión del
navegador, donde el usuario puede guardar como PDF. No es una descarga automática
de un PDF generado por el servidor. Las pruebas DOM no acreditan paginación o
dimensiones visuales del documento en un navegador real.
