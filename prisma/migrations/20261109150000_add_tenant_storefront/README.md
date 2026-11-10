# add_tenant_storefront — preparada, sin aplicar

Generada con Prisma 7.10.1 mediante comparación de dos archivos locales:

```text
prisma migrate diff --from-schema <snapshot del schema de main anterior a TenantStorefront> --to-schema prisma/schema.prisma --script --output prisma/migrations/20261109150000_add_tenant_storefront/migration.sql
```

El snapshot se capturó antes de editar y coincide con `git show HEAD:prisma/schema.prisma` de la base de este cambio. No se usó una base vacía, una conexión datasource ni un shadow database como origen. Durante la generación se reemplazó DATABASE_URL solo en el proceso por una URL local inaccesible (`127.0.0.1:1`); `.env` no se modificó.

El SQL generado crea dos enums, una tabla, su PK, un índice único global de slug y una FK a tenants con RESTRICT. Se agregaron manualmente cinco CHECK sobre la tabla nueva: slug ASCII canónico de 1 a 63 caracteres, revisión positiva, borrador objeto JSONB, publicación objeto JSONB si existe y pareja published/publishedAt ambos nulos o ambos presentes. JSON `null` no equivale a SQL NULL y se rechaza como documento.

Es exclusivamente aditiva: no modifica tablas existentes, migraciones anteriores, restricciones comerciales ni Better Auth; no contiene DML, backfill, DROP, renombres ni recreación de objetos previos. La relación inversa opcional de Tenant no genera una columna en tenants. No crea tenants ni configura el portal Milo Store.

El contrato previsto y los límites de concurrencia/publicación se documentan en [DATA_MODEL_V1.md](../../../docs/DATA_MODEL_V1.md#tenantstorefront--preparación-de-persistencia-editorial-d-022) y D-022 de [DECISIONS.md](../../../docs/DECISIONS.md).

No se ejecutó este SQL contra PostgreSQL ni se comprobó drift o `_prisma_migrations`. Antes de una aplicación autorizada hay que revisar el esquema/historial reales y verificar las restricciones en PostgreSQL. Los CHECK personalizados no aparecen en `prisma migrate diff` entre archivos: deben conservarse y revisarse al preparar futuras migraciones. `revision > 0` no implementa por sí solo control optimista; faltan los casos de uso server-side y su autorización.

## Verificación local ejecutada

- `prisma validate` y `prisma generate` con DATABASE_URL temporal local inaccesible: correctos, sin usar PostgreSQL.
- `npm run lint`, `npm run typecheck`, `npm run build` y `git diff --check`: correctos. Build con BETTER_AUTH_URL=`https://build.milo.invalid` y DATABASE_URL local inaccesible solo en el proceso, restauradas al finalizar; `.env` intacto.
- Snapshot comparado con el schema previo de HEAD; los 28 bloques anteriores conservan su contenido salvo la relación inversa opcional en Tenant. Solo se agregan TenantStorefront y sus dos enums. Todos los archivos versionados de migraciones anteriores conservan su contenido.
- Diff regenerado entre archivos locales: coincide exactamente con la parte generada del SQL. Auditoría estática: seis sentencias exclusivamente aditivas, cinco CHECK, sin DML ni alteraciones de objetos existentes. Esto no sustituye una prueba de ejecución en PostgreSQL.

## Aplicaci?n controlada ? 2026-11-09

Aplicada exclusivamente a `127.0.0.1:5432/milo_dev` con Prisma 7.10.1 migrate deploy, despu?s de verificar que era la ?nica pendiente. Se conservaron las seis sentencias DDL aditivas y se agreg? una transacci?n expl?cita BEGIN/COMMIT con SET LOCAL lock_timeout='10s' y statement_timeout='60s'. Se verific? que el diff vivo coincidiera con la parte generada del SQL antes de ejecutar.

Respaldo completo y evidencia en `D:\projects\milo-backups\milo_dev_pre_tenant_storefront_20261109T184052Z_a7f588.dump` y archivos .audit.json/.verified.json del mismo nombre base. El archivo se cre? sin sobrescribir respaldos anteriores, con pg_dump -Fc 17.11; pg_restore --list (191 entradas) y lectura completa sin restaurar finalizaron correctamente. Tama?o: 84.775 bytes. SHA-256: `d07f4fd25762bd24e0c7c8ef3cedbaf2e94532b405907922d1bec7c2c17d90a8`.

Post-verificaci?n: tabla vac?a; dos enums, dos ?ndices, FK y cinco CHECK instalados/validados; historial previo sin cambios y nueva entrada completa con checksum coincidente. Huellas de esquema y datos de las 25 tablas previas, funciones y archivos protegidos coinciden con el estado previo. migrate status al d?a, prisma validate correcto y migrate diff real/schema vac?o. No se modificaron migraciones anteriores, .env, Docker ni Better Auth ni se crearon datos de negocio.
