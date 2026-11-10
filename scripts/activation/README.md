# Activación local controlada

La activación inicial del entorno ya fue completada. No repetirla. Los datos personales, identificadores reales, journals y evidencias permanecen fuera del repositorio. Este documento describe el CLI; no autoriza su ejecución.

## Configuración privada obligatoria

Node 24.16+, Better Auth 1.7.18 y Prisma 7.10.1. El comando es `npm run activation:tenant`. El plan se carga explícitamente del entorno mediante Zod; no hay valores personales predeterminados ni generación automática de identificadores.

Variables requeridas:

- `MILO_ACTIVATION_ID`: UUID estable de la operación.
- `MILO_ACTIVATION_TENANT_ID`: UUID reservado de empresa.
- `MILO_ACTIVATION_PROFILE_ID`: UUID reservado del perfil.
- `MILO_ACTIVATION_ASSIGNMENT_ID`: UUID reservado de asignación.
- `MILO_ACTIVATION_OWNER_ROLE_ID`: UUID reservado para OWNER si no existe.
- `MILO_ACTIVATION_COMPANY_NAME`: nombre comercial autorizado.
- `MILO_ACTIVATION_OWNER_NAME`: nombre autorizado del responsable.
- `MILO_ACTIVATION_OWNER_EMAIL`: correo autorizado del responsable.

Mantener los UUID originales de una operación existente. No regenerarlos, cambiar el plan ni borrar journals para sortear un intento anterior. Un plan ausente, incompleto o inválido detiene el CLI antes de abrir una conexión; los errores no imprimen sus valores. No ingresar contraseñas mediante variables de entorno, argumentos o archivos. Los valores regionales conservan Argentina, ARS, es-AR, America/Argentina/Buenos_Aires y precios privados por defecto; no habilitan nuevas políticas de acceso.

El CLI puede leer la configuración local existente de `.env` sin modificarla. No copiar los valores reales a ejemplos, pruebas, documentación o commits. Los tests proporcionan un plan sintético independiente en memoria y nunca lo usan como valor por defecto del CLI.

## Controles de ejecución

Sin argumentos o con `--dry-run` solo inspecciona mediante conexión read-only; nunca solicita contraseña ni escribe journal. Se limita al destino local aprobado de desarrollo y verifica cuatro migraciones completas con sus checksums, restricciones e índices. No aplica migraciones ni crea infraestructura. La ayuda `--help` no necesita un plan ni abre conexiones.

La ejecución real exige autorización separada, respaldo verificado, estado ready y `--execute --confirm=<UUID de la operación>`. La contraseña se solicita solo en una terminal privada, sin eco, con confirmación y longitud 8–128. Sin registros públicos, OAuth, sesiones automáticas ni proveedor de correo.

Los nuevos journals se crean de forma exclusiva en `.local/activation-<UUID>.jsonl`, ignorados por Git. Se detectan también archivos anteriores del mismo UUID con otros prefijos en ese directorio; no se renombran ni eliminan. Un intento existente bloquea la ejecución automática y exige revisión. Los journals no contienen contraseñas, hashes, tokens ni URLs de conexión.

## Atomicidad e identidad

Se mantienen la transacción Serializable, el advisory lock y la comprobación del mismo xid/pid antes y después de las escrituras. El adaptador privado de identidad solo permite lecturas y la creación de AuthUser/AuthAccount dentro de esa transacción; no puede crear sesiones, actualizar, borrar, hacer upsert ni abrir otra transacción. La configuración pública de Better Auth no cambia.

Se crea un perfil por authUserId retornado y verificado y una asignación OWNER/COMPANY sin sucursal. No se adoptan identidades por correo ni se promueven usuarios existentes. No se crean productos, clientes, pedidos, stock ni storefronts. Un estado parcial, conflicto o confirmación de commit incierta impide el reintento automático; conservar la evidencia privada y reconciliar antes de otra autorización.

## Pruebas

`npm run test:activation` ejecuta las pruebas disponibles. Las de transporte simulado verifican validación del plan, roles, identidad, rollback y commit incierto sin acceso a PostgreSQL. La integración real sigue siendo opt-in mediante una base aislada explícitamente autorizada; no ejecutarla como parte de una revisión de privacidad o publicación.
