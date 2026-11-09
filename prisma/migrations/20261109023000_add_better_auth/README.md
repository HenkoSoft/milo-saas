# add_better_auth — preparada sin aplicar

SQL generado por Prisma 7.10.1 mediante comparación local de esquemas:

```text
prisma migrate diff --from-schema <copia del schema anterior a Better Auth> --to-schema prisma/schema.prisma --script --output prisma/migrations/20261109023000_add_better_auth/migration.sql
```

No se usó una base vacía como origen. La copia se capturó antes de editar los 21 modelos existentes. El diff incorpora únicamente cuatro tablas de autenticación, authUserId nullable en user_profiles, índices y FKs; no elimina ni recrea restricciones, triggers o datos comerciales. La migración init no se modificó.

La aplicación previa de init fue confirmada por el responsable. Este diff no verifica el estado real de PostgreSQL, drift o _prisma_migrations. Antes de aplicar esta migración en una etapa posterior, se debe recuperar acceso al entorno existente y revisar su historial y esquema reales. Esta tarea no aplica ninguna migración ni crea datos.
