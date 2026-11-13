# Ampliación comercial de Clientes V1 y eliminación segura

Estado: contrato aprobado explícitamente el 2026-11-11. Implementación probada en base aislada y migración aplicada posteriormente a milo_dev con autorización expresa, respaldo externo verificado y comprobación de integridad. Cinco migraciones aplicadas y ninguna pendiente. Sustituye solo las limitaciones de campos y borrado de D-041. Las instrucciones de aislamiento siguientes describen la preparación y las pruebas; la aplicación real fue una operación posterior autorizada.

## Relevamiento realizado

Customer contiene id, tenantId, contactData JSONB, status y timestamps. La relación comercial entrante existente es WholesaleOrder(tenantId, customerId), con ON DELETE RESTRICT. AuditEvent guarda entityType/entityId como referencia lógica, sin FK a Customer; sus FKs de tenant y actor son RESTRICT. Se verificó este metadato mediante una conexión PostgreSQL read-only, sin leer ni cambiar fichas comerciales.

El módulo actual ya tiene listado, búsqueda, paginación, alta/edición con cuatro campos en contactData versión 1, rutas directas, control optimista y auditoría. La ampliación no se limita al botón de edición y deberá preservar ese funcionamiento y los cambios pendientes del repositorio.

## Modelo propuesto

Todos los nuevos datos fiscales y de contacto son columnas tipadas nullable; no hacer obligatorios documentos o IVA en el alta inicial. No reemplazar ni borrar contactData y no modificar status, IDs, timestamps históricos ni relaciones existentes durante la migración, salvo la asignación del nuevo código comercial.

| Datos | Columnas propuestas y límites |
| --- | --- |
| Identificación comercial | commercialCode único por tenant e inmutable; legalName y contactName, hasta 200 caracteres cada uno. |
| Documento | documentType DNI/CUIT y documentNumber normalizado, opcionales como pareja. Sin unicidad fiscal inferida. |
| IVA | vatCondition opcional, seleccionada de valores de referencia documentados de ARCA. No implica comprobación de inscripción ni facturación. |
| Contacto telefónico | phone, mobilePhone y whatsapp, hasta 50 caracteres cada uno; sin envío de mensajes ni integraciones. |
| Contacto digital | email hasta 254 e instagram hasta 100; sin vincular identidad por correo ni consultar redes externas. |
| Domicilio | address hasta 400, postalCode hasta 20, city/province/country hasta 100 cada uno. No completar datos históricos por inferencia. |
| Observaciones | internalNotes hasta 2000 caracteres; texto plano interno con saltos de línea, sin HTML ni copia en logs/auditoría. |

Las altas nuevas requieren razón social/denominación o nombre de contacto. Para una ficha anterior, conservar su nombre de presentación contactData v1 como fallback, sin asumir que es una razón social fiscal. La migración no interpreta ni traslada JSON previo. La lectura hace fallback de nombre, correo, teléfono y dirección solo para el contrato v1 compatible; las nuevas columnas prevalecen una vez completadas explícitamente. El JSON desconocido permanece intacto y nunca se devuelve completo al navegador. La adaptación de campos nuevos no autoriza sobrescribir ese JSON.

## Código automático por tenant

- Formato propuesto: C000001, C000002, etc.; el relleno mínimo de seis dígitos no limita una secuencia mayor.
- Una tabla de contador con PK tenantId y FK RESTRICT a Tenant mantiene el último número. Incremento y alta en la misma transacción; unicidad (tenantId, commercialCode). Nunca aceptar el código o contador desde el navegador.
- No reutilizar códigos de clientes eliminados. La numeración es administrativa: no prometer ausencia de huecos ni numeración fiscal.
- La migración futura asigna códigos a clientes existentes de forma determinista por tenant, createdAt e id, y deja preparado el contador. Esta modificación solo se probará sobre fixtures en una base aislada durante la tarea. No aplicarla a milo_dev.

## Validación y autorización

OWNER/ADMIN COMPANY siguen siendo los únicos roles que modifican Clientes; resolver tenant y membresía por authUserId en servidor y revalidarlos dentro de cada transacción. Mantener el status anterior de cada cliente; las altas conservan REGISTERED sin aprobación comercial ni acceso a precios o compras.

Validar con Zod: longitudes, controles, correo y documento. DNI admite formato numérico de hasta ocho cifras, no cero; CUIT exige once cifras y dígito verificador módulo 11. Permitir solo separadores documentales explícitos antes de normalizar; no eliminar letras ni corregir números inválidos. Tipo y número deben estar ambos presentes o ambos ausentes. La validación local de formato/dígito no acredita identidad, CUIT existente ni condición fiscal; no llamar a servicios de ARCA. Los datos fiscales permanecen opcionales para registrar un cliente.

## Eliminación física propuesta: distinción que requiere aprobación

1. Botón de papelera con el estilo de MILO, nombre accesible, teclado y confirmación explícita. Cancelar no realiza ninguna escritura. El servidor vuelve a autorizar, comprobar versión y referencias; no confía en una indicación de la tabla.
2. Una transacción bloquea la fila Customer del tenant y vuelve a comprobar membresía. Verifica pedidos, referencias protegidas y metadatos FK esperados; ante una relación desconocida o un cambio de esquema, deniega el borrado hasta revisión. Las FKs RESTRICT actúan además como defensa frente a inserciones concurrentes.
3. Historial comercial o referencias protegidas bloquean la eliminación. No borrar pedidos, ventas, cobros, documentos ni ningún registro relacionado, ni cambiar a un estado de desactivación inexistente. Fichas con JSON histórico incompatible quedan protegidas del borrado hasta revisar su contrato.
4. **Las auditorías administrativas CUSTOMER_CREATED y CUSTOMER_UPDATED no bloquean por sí solas el borrado:** se conservan íntegramente mediante su referencia lógica. Otras auditorías del cliente que indiquen operaciones o acciones desconocidas sí lo bloquean. No borrar auditorías en cascada ni reescribirlas.
5. Si no hay historial comercial ni referencias protegidas, borrar físicamente la fila con tenantId/id/updatedAt y agregar CUSTOMER_DELETED en la misma transacción, con auditoría mínima sin datos fiscales/contacto. Si falla la auditoría, se revierte el borrado. No reciclar el código comercial.

Esta distinción evita una acción Eliminar ficticia: todas las altas actuales generan una auditoría, por lo que bloquear por cualquier auditoría impediría borrar incluso una ficha recién registrada sin operaciones comerciales. La propuesta permite conservar esa trazabilidad sin eliminar el historial.

## Formulario y compatibilidad de despliegue

Reutilizar RecordWorkspace, RecordEditor, EditorTabs y EditorFooter con Datos, Datos comerciales y Observaciones. Código de solo lectura, campos en grilla compacta, foco/teclado/Escape y cambios pendientes; Guardar/Cancelar fuera del cuerpo desplazable. En pantallas menores o contenido extenso, scroll interno. Conservar rutas directas, búsqueda, página y scroll del listado.

Mientras la nueva migración no esté aplicada, detectar explícitamente el esquema anterior: mantener el módulo básico de lectura/alta/edición donde siga siendo compatible y bloquear los campos nuevos y Eliminar con un mensaje real de migración pendiente. No enviar escrituras que dependan de columnas ausentes ni presentar la ampliación como operativa en milo_dev.

## Migración revisable y pruebas aisladas

Preparar una migración aditiva con transacción, límites de espera, columnas nullable, código/contador y restricciones tenant-aware, sin recrear tablas ni eliminar datos. Conservar las cuatro migraciones previas byte a byte.

La prueba PostgreSQL debe crear una base exclusivamente de pruebas con nombre/identificador únicos, verificar destino y propiedad, aplicar allí las migraciones y probar con fixtures sintéticos: compatibilidad de filas anteriores/estados/JSON, aislamiento, altas y códigos concurrentes por tenant, edición, DNI/CUIT, rechazo por historial, eliminación permitida, rollback de auditoría y carrera entre referencia y borrado. Nunca crear fixtures ni ejecutar migraciones sobre milo_dev. Conservar evidencia fuera del repositorio y limpiar únicamente la base temporal de propiedad comprobada.

Ejecutar Prisma validate, lint, typecheck, pruebas, build HTTPS temporal y git diff --check. No modificar Better Auth, Docker o .env; no commits ni pushes.

## Referencias de validación

- [ARCA: documentación de servicios de factura electrónica](https://www.arca.gob.ar/ws/documentacion/ws-factura-electronica.asp), como referencia del catálogo de condiciones de IVA; no se integra facturación ni autorización de comprobantes.
- [ARCA/AFIP: consulta de constancia de inscripción](https://seti.afip.gov.ar/padron-puc-constancia-internet/jsp/Constancia.jsp), que especifica CUIT de once dígitos. La consulta no será ejecutada desde MILO en esta etapa.
