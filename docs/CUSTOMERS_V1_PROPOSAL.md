# Contrato aprobado de administración básica de Clientes V1

Aprobado explícitamente por el responsable en esta conversación el 2026-11-11, antes de implementar datos o acceso. Se conserva el contrato presentado para revisión.

Customer tiene UUID, tenantId, contactData JSONB nullable, status String y timestamps; su relación con pedidos usa (tenantId, customerId). No tiene sucursal, saldo, crédito ni identidad autenticable. No modificar Prisma ni migraciones.

- Acceso exclusivo de OWNER/ADMIN COMPANY, con identidad, tenant y rol revalidados en servidor y dentro de las transacciones. Sin permisos nuevos para roles operativos.
- contactData versión 1: objeto estricto con schemaVersion=1, name obligatorio (1–200), email opcional válido (hasta 254), phone opcional (hasta 50) y address opcional (hasta 400). Recortar extremos y rechazar controles con Zod en servidor. Sin CUIT, datos fiscales, credenciales ni notas adicionales.
- Altas con status=REGISTERED fijado por servidor: «Registrado — sin autorización comercial». No concede acceso a precios, compra, identidad ni solicitudes. No editar estados; preservar literalmente los existentes.
- Sin unicidad inferida de correo, teléfono o nombre. Sin vinculación por email, eliminación ni modificación de pedidos/historial.
- Sin migración automática de JSON previo. contactData=null puede completarse explícitamente conservando su estado; JSON incompatible o versiones desconocidas quedan protegidos contra sobrescritura, con advertencia y sin exponer el JSON completo.
- Listado por tenant, 25 filas por página, búsqueda por nombre/correo/teléfono de fichas versión 1 y orden estable. Registros históricos visibles en el listado general sin reinterpretar su contenido.
- Modales RecordWorkspace/RecordEditor y rutas directas `/panel/clientes/nuevo` y `/panel/clientes/[id]`. Conservar foco, Escape, aviso de cambios pendientes y URL/scroll del listado.
- Concurrencia optimista por updatedAt, filtro tenantId/id/updatedAt, fechas crecientes y sin reintento automático.
- Escritura y AuditEvent mínimos en una transacción Serializable: tenant, actor, acción CUSTOMER_CREATED/CUSTOMER_UPDATED, tipo Customer e ID. Sin contacto en auditoría/logs; fallo de auditoría revierte todo; sin cambios no se escribe ni audita.
- Pruebas en memoria/DOM sin crear clientes reales: permisos, aislamiento, validaciones, fichas históricas, concurrencia, persistencia/rollback y comportamiento del modal. Validar lint, typecheck, pruebas, build HTTPS temporal y git diff --check.

No incluye aprobación comercial, autorregistro, solicitudes, cuenta corriente, crédito ni nuevas entidades. La revisión visual se informa separadamente cuando el entorno no permite un navegador.
