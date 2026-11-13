# Clientes y Proveedores — Excel e impresión/PDF V1

Estado: contrato aprobado explícitamente por el usuario el 2026-11-11 para ambos módulos, antes de implementar datos/acceso. Implementación preparada con pruebas de escritura exclusivamente en una base aislada. No crear ni modificar registros reales durante el desarrollo. Sin commits ni pushes.

## Relevamiento y alcance

Clientes y Proveedores ya tienen modelos operativos, OWNER/ADMIN COMPANY, filtros/búsqueda, paginación, formularios compartidos, validación fiscal, control de versión y auditoría transaccional. No hay importador/exportador de Excel ni vista de impresión implementados. No se detectaron dependencias de Excel o PDF en package.json.

Agregar a ambos listados: Nuevo (con atajo F4), Importar Excel, Exportar Excel e Imprimir PDF. Mantener componentes, colores, foco y accesibilidad de MILO. Las capturas orientan las funciones; no imponen su paleta ni una norma general para otros módulos.

Esta etapa no agrega campos de negocio ni requiere migraciones: utilizar Customer, Supplier, sus contadores y AuditEvent actuales. Conservar estados de aprobación, JSON histórico, Better Auth, las seis migraciones existentes y `.env`. Web, Rubro y Fax siguen fuera del modelo actual de Proveedores.

## Archivos Excel y plantilla

- Formato real `.xlsx`, con una hoja de datos identificada como Clientes o Proveedores, encabezados documentados y estables por módulo. El archivo exportado y la plantilla comparten formato.
- Plantilla vacía, con encabezados e instrucciones sin filas ficticias. No incluir tenantId, IDs internos, versiones, roles, credenciales ni estados de autorización.
- Exportar los campos comerciales editables del módulo, incluido el código visible y las observaciones internas. El permiso de descarga es el mismo OWNER/ADMIN del tenant; no introducir acceso público a esos datos.
- Clientes: Código, Razón social, Nombre de contacto, Tipo de documento, Número de documento, Condición frente al IVA, Teléfono, Celular, WhatsApp, Correo electrónico, Instagram, Dirección, Código postal, Localidad, Provincia, País y Observaciones internas. Conservar el nombre histórico compatible mediante una columna informativa «Nombre registrado», sin convertirlo en razón social fiscal ni sobrescribir JSON.
- Proveedores: Código, Razón social, Nombre comercial, CUIT, Condición frente al IVA, Contacto, Teléfono, WhatsApp, Correo electrónico, Dirección, Código postal, Localidad, Provincia, País y Observaciones internas.
- Códigos, documentos, teléfonos y códigos postales se exportan como texto, conservando ceros iniciales. La plantilla identifica esos campos como texto; rechazar conversiones ambiguas que hayan perdido información.
- IVA utiliza los valores documentados del selector existente, con equivalencia explícita entre etiqueta y código técnico; no inferir condición fiscal. CUIT/DNI se validan con los contratos existentes, sin consultas a padrones ni correcciones automáticas del verificador.
- Escribir contenido como texto, sin fórmulas ejecutables ni hipervínculos activos derivados de datos. No evaluar fórmulas al importar; rechazarlas con su fila/campo.

## Exportación e impresión

- Exportar todos los resultados de la búsqueda/filtros actuales del tenant, incluyendo todas las páginas, en el orden estable del listado. La interfaz indicará ese alcance; no limitar silenciosamente a las 25 filas visibles.
- Límite inicial de exportación/impresión: 5.000 registros. Si se supera, pedir acotar la búsqueda; no truncar silenciosamente.
- «Imprimir PDF» abre una vista privada imprimible en otra pestaña y ofrece el diálogo del navegador para imprimir o guardar como PDF. No representa una descarga automática de un PDF generado en servidor en esta versión.
- Vista de impresión con identidad MILO, empresa actual, título, fecha/filtro y columnas del listado correspondiente, sin botones de edición ni observaciones internas. A4 horizontal, encabezados repetidos y texto legible que pueda ocupar varias líneas; sin recortar datos para hacerlos entrar.
- No cargar automáticamente una descarga ni abrir el diálogo de impresión al entrar al listado. La acción requiere activación del usuario y conserva la página/búsqueda/scroll originales.
- Resolver tenant/permiso en cada petición y lectura server-side. Respuestas privadas y sin caché compartida; archivos generados en memoria, sin subir información a servicios externos ni dejar copias de archivos de usuarios en el repositorio.

## Importación: vista previa y confirmación

1. Diálogo compartido con descarga de plantilla, selector `.xlsx`, límites visibles, análisis y Cancelar. Abrirlo no escribe datos. Conservar foco, teclado, Escape y el listado original.
2. Límite inicial: 5 MiB comprimidos y 500 filas de datos por archivo; límite adicional de 32 MiB descomprimidos y 256 entradas ZIP. Exportaciones mayores pueden dividirse antes de importar. Validar archivo/contenedor en servidor antes de aceptar el contenido; rechazar archivos cifrados, macros, enlaces externos, estructura inesperada, fórmulas y encabezados duplicados/desconocidos.
3. Normalizar únicamente según los contratos ya aprobados: espacios exteriores, separadores permitidos del documento y vacíos opcionales. Zod valida cada fila completa. No convertir documentos, códigos o teléfonos con parseFloat ni asignar valores fiscales predeterminados.
4. Mostrar una vista previa paginada con conteos de filas nuevas, coincidencias omitidas y errores por fila/campo. No mostrar un «Importado» antes de confirmar el guardado real. No registrar los valores fiscales/contacto/texto libre en logs.
5. Importación de **altas**, sin actualización ni eliminación masiva. Código vacío significa alta con código automático del tenant. Código informado debe corresponder a una ficha de la empresa actual y coincidir con sus datos exportables: se omite; un código desconocido o con datos modificados bloquea la importación, sin buscar datos en otro tenant.
6. Sin código, una coincidencia exacta de todos los campos exportables del tenant se omite para evitar reimportaciones idénticas. Si un documento fiscal ya existe pero los datos difieren, mostrar conflicto y pedir resolverlo antes de importar. Esta comprobación conservadora del importador no crea unicidad fiscal global ni modifica las reglas de los formularios manuales.
7. Detectar duplicados dentro del propio archivo. Omitir filas exactamente repetidas y bloquear documentos iguales con datos incompatibles. No asumir que nombres iguales representan necesariamente el mismo registro.
8. La columna Nombre registrado de Clientes es informativa para fichas históricas ya existentes: no permite fabricar JSON histórico ni suplantar una razón social/nombre de contacto para un alta nueva. No sobrescribir fichas protegidas ni sus estados.
9. Si hay errores o conflictos, no guardar ninguna fila. Al confirmar, reenviar/revalidar el archivo y comprobar que la vista previa sigue correspondiendo al contenido, tenant y datos actuales. Un cambio exige revisar una nueva vista previa.
10. Guardar el lote completo en una única transacción Serializable: revalidar membresía, comprobar coincidencias, asignar números mediante los contadores existentes, crear filas y auditorías mínimas por alta y lote. Un fallo revierte datos, contador y auditoría; no dejar una importación parcial ni ejecutar reintentos automáticos.
11. Identificador de operación y verificación de contenido para reconocer la repetición de una confirmación ya completada, sin duplicar altas tras un resultado de red incierto. Usar AuditEvent existente como constancia transaccional, sin almacenar el archivo ni crear una tabla nueva. Una reutilización del identificador con contenido diferente se rechaza.
12. Altas de Clientes mantienen REGISTERED y no conceden precios privados, compras o identidad autenticable. Altas de Proveedores no habilitan compras, saldos o crédito. No vincular identidades por correo.
13. Al guardar con éxito, cerrar el diálogo y refrescar el mismo listado conservando filtros, búsqueda, página y scroll hasta donde permitan los nuevos resultados. Ante conflicto/error, mantener el diálogo y el archivo disponibles para revisión, sin anunciar éxito ni reenviar automáticamente.

## Acceso y privacidad

OWNER/ADMIN COMPANY del tenant son los únicos autorizados para plantilla, exportación, impresión, análisis y confirmación de importación. Resolver identidad por sesión/authUserId y revalidar perfil, tenant y roles dentro de las lecturas/transacciones. El navegador y el archivo no deciden tenant, IDs, roles, estados o códigos asignados.

Los controles se aplican también invocando rutas/acciones directamente, con sesiones revocadas, archivos manipulados o IDs de operación ajenos. No ampliar el acceso del administrador central a los datos de negocio de otros tenants.

Auditar las altas del lote con los mismos eventos de creación que las altas manuales y una constancia mínima del lote. Los eventos del lote no contienen datos personales ni reemplazan las auditorías de cada registro; conservan el comportamiento del borrado protegido existente. Descargas e impresión se restringen al tenant y no modifican fichas comerciales.

## Dependencias y comprobaciones

Agregar bibliotecas locales de código abierto para XLSX y validación acotada del contenedor ZIP, sujetas a verificar versiones/licencias y dependencias antes de instalar. ExcelJS y yauzl son las opciones relevadas; no usar servicios pagos ni transmitir archivos a terceros. La impresión/PDF usa el navegador, sin una biblioteca de PDF adicional.

Referencias técnicas: [ExcelJS](https://github.com/exceljs/exceljs) y [yauzl](https://github.com/thejoshwolfe/yauzl), incluida la validación de tamaños y lectura secuencial de entradas ZIP. La aceptación de un archivo no se basa solo en su extensión ni en tamaños declarados dentro del ZIP.

Criterios de aceptación:

- Archivos `.xlsx` reales, plantilla/exportación compatibles, texto con ceros iniciales y contenido literal sin fórmulas activas.
- Exportación/impresión autorizada de todos los resultados filtrados, sin exposición cruzada, caché pública ni truncamiento.
- Rechazo de archivo malformado, excesivo, fórmulas, encabezados y filas inválidas; vista previa sin escrituras y confirmación explícita.
- Importación completa o rollback, permisos y revocación, aislamiento, conflictos entre vista previa/confirmación, duplicados, numeración y repetición de operación.
- Conservación de Customer.status/contactData y de los servicios/formularios existentes; sin modificar registros reales durante las pruebas.
- Pruebas del diálogo, foco, Escape, Cancelar, pendiente, errores, éxito y conservación del listado. F4 abre Nuevo solo en el listado autorizado, sin interferir con un diálogo ya abierto o una combinación con modificadores.
- Pruebas de persistencia únicamente en PostgreSQL aislado. Prisma validate, lint, typecheck, pruebas, build HTTPS temporal y `git diff --check`; verificar visualmente las salidas cuando el entorno lo permita e informar límites reales.

La aprobación de este contrato autoriza desarrollar las funciones en ambos módulos y probar con fixtures aislados. No autoriza importar archivos de usuarios ni crear/modificar registros de `milo_dev` durante el desarrollo. No se preparan ni ejecutan migraciones en esta etapa.
