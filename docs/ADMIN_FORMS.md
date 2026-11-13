# Patrón de formularios administrativos MILO

Actualización D-043: Clientes reutiliza el patrón con tres pestañas (Datos, Datos comerciales, Observaciones), grilla de tres columnas desde 1000px y pie fijo. La migración fue autorizada y aplicada a milo_dev el 2026-11-11; en bases con esquema anterior continúa el formulario básico. `useRecordListRefresh` permite actualizar el listado después de Eliminar conservando sus contenedores y posición, sin cambiar URL. Eliminar usa una confirmación explícita nativa, botón accesible con estilo MILO y validación transaccional server-side. Proveedores se incorporó posteriormente en D-045, con su estructura aplicada a milo_dev el 2026-11-11 mediante autorización posterior; no se simulan datos ni reglas comerciales.

Decisión D-040. El patrón de Productos se comparte para altas y ediciones administrativas compactas, con identidad visual global MILO, adaptación móvil y contenido completo accesible mediante desplazamiento interno cuando haga falta.

## Componentes y responsabilidades

Clientes y Proveedores incorporan transferencia de datos según D-046 y [ADMIN_DATA_TRANSFER_PROPOSAL.md](ADMIN_DATA_TRANSFER_PROPOSAL.md): `TransferToolbar` comparte Nuevo/F4, descarga de plantilla/exportación XLSX, importación con análisis/confirmación e impresión/PDF del navegador. El diálogo de importación reutiliza RecordEditor y el control de foco; no sustituye el editor individual ni permite actualizar fichas existentes desde Excel. La vista previa no escribe; una confirmación correcta conserva el estado del listado mediante `useRecordListRefresh`.

[ADMIN_TABLES.md](ADMIN_TABLES.md) (D-044, alcance corregido) describe los listados actuales de Clientes y Proveedores como referencia opcional. No impone una distribución general a otros módulos ni sustituye este contrato de modal y conservación del estado.

- `components/panel/record-workspace.tsx`: conserva el listado montado, abre un diálogo nativo desde enlaces `data-record-editor`, carga datos mediante una función de lectura protegida y recibe un componente `Editor` con `data` y `callbacks`. Un valor vacío del atributo corresponde al alta; un ID identifica la edición. El enlace conserva su `href` real para navegación directa y apertura en otra pestaña.
- `components/panel/record-editor.tsx`: `RecordEditor` distribuye pestañas opcionales, cuerpo desplazable y pie independiente. `EditorTabs` y `EditorTabPanel` mantienen relaciones ARIA y navegación con flechas, Home y End. `EditorFooter` asocia Guardar con el ID del formulario y mantiene Cancelar visible. `useDirectEditorGuard` protege la salida de la página directa con cambios pendientes.
- Compras (D-048) reutiliza el mismo pie con etiquetas `saveLabel`/`cancelLabel`, resumen y acciones opcionales; `hideSave` permite detalle recibido de solo lectura. Los valores predeterminados de los demás formularios se conservan. La acción de recepción exige un borrador guardado sin cambios y confirmación explícita, y permanece fuera del cuerpo desplazable.
- `components/panel/editor-interactions.ts`: confirmación de descarte y control de Tab/Shift+Tab, excluyendo controles deshabilitados, paneles ocultos y secciones cerradas. El diálogo nativo deja inerte el contenido exterior.
- `components/panel/record-editor.css`: encabezado, columnas compactas alineadas arriba, espaciado, pestañas, cuerpo desplazable y pie sin desplazamiento. El tamaño amplio se usa para Productos; el compacto para formularios breves. Las reglas específicas de campos de Productos se limitan a su modificador.

## Contrato de integración

1. Mantener un único formulario de negocio compartido entre modal y página directa. Recibir opcionalmente `onSaved`, `onCancel` y `onPendingChange`; los wrappers solo conectan datos y callbacks.
2. La carga bajo demanda valida entradas en servidor y reutiliza lecturas con autorización y aislamiento vigentes. El cliente no decide tenant ni permisos. No modificar servicios, auditoría o tokens de concurrencia para adaptar la presentación.
3. Asociar Guardar con el formulario principal mediante su ID, sin anidar formularios. Las pestañas ocultas conservan sus valores; si falla una validación, revelar el panel y enfocar el campo correspondiente. No introducir pestañas vacías en formularios simples.
4. Notificar inicio/fin de escrituras y éxito real. Mientras se guarda, bloquear nuevas acciones y cierres. Ante error o conflicto, mantener abierto el formulario, conservar los datos y mostrar la respuesta existente; no refrescar ni cerrar como si hubiera éxito.
5. `onSaved` cierra, devuelve el foco y refresca la URL actual del listado. Conservar búsqueda, filtros y página, y restaurar scroll vertical del contenido y vertical/horizontal de la tabla hasta donde permitan los nuevos resultados. Si el registro sale del filtro, el foco retorna a una acción disponible del listado.
6. Cancelar, cerrar, Escape y Atrás consultan el descarte cuando hay cambios; recarga/salida advierten mediante `beforeunload`. No cerrar por clic accidental en el fondo. Ignorar respuestas de carga que lleguen después del cierre.
7. Los formularios avanzados con guardado independiente no pueden guardar uno descartando cambios pendientes de otro. Los controles de seguridad y las reglas monetarias de `MONEY_FORMAT.md` siguen vigentes.

## Estado por módulo

| Módulo | Estado del patrón |
| --- | --- |
| Productos | Alta y edición en modal desde el listado; páginas directas y opciones avanzadas conservadas. Pestañas Datos/Precios. |
| Compras | D-053: botón Ingreso de mercadería y modal Ingreso de Mercadería. Sidebar Ingreso abre el mismo RecordWorkspace; Consulta solo lista. Ruta ingresar automática y retorno a consulta al cerrar, sin perder query/scroll. Resaltado por ruta y estado, cinco opciones y formulario único. Chrome con sidebar real, sin base de datos. Ver [pruebas](PURCHASES_MODAL.md). |
| Marcas | Alta y edición en modal desde el listado; páginas directas conservadas. Sin pestañas innecesarias. |
| Categorías | Alta y edición en modal desde el listado; páginas directas conservadas. Sin pestañas innecesarias. |
| Clientes | Listado de columnas comerciales según D-044; alta/edición modal con Datos, Datos comerciales y Observaciones según D-043. Rutas directas, aprobación comercial previa y JSON histórico conservados. Eliminar solo sin historial ni referencias protegidas, con auditoría retenida. |
| Proveedores | Listado, alta/edición modal, rutas directas y borrado protegido según D-045. Por pedido posterior, el formulario usa una vista única compacta: código arriba, campos en columnas y observaciones al final, con pie fijo. Conserva todos los campos actuales y sus validaciones. Estructura aplicada a milo_dev; en bases sin la migración se muestra el aviso correspondiente. |

Empresa, Sucursales y operaciones de inventario no se adaptan en esta etapa. La existencia del patrón no autoriza desarrollar nuevos módulos ni ampliar permisos.

## Verificación

Las acciones de fila de Productos, Clientes, Categorías, Marcas y Sucursales usan `TableEditAction` (D-042), con lápiz y tooltip nativo «Editar», aria-label contextual y los estilos del botón secundario de MILO. Pasar `recordId` solo cuando la ruta ya abre un modal; sin ese atributo se conserva la navegación directa. `readOnly` preserva la consulta de clientes históricos protegidos, sin habilitar su edición. No agregar acciones de eliminación como parte de este patrón.

`tests/record-workspace.test.mjs` monta los componentes reales con React en jsdom para comprobar apertura, foco, cierre, teclado, pestañas, descarte, bloqueo durante guardado, resultados tardíos y conservación de URL/scroll. Marcas/Categorías usan sus formularios reales con acciones simuladas; se comprueban ID, versión y comportamiento ante conflicto. La frontera nativa `showModal/close` se simula porque jsdom no implementa una capa modal de navegador.

Las pruebas no consultan ni escriben datos reales. No sustituyen la comprobación visual, del área útil a 1920 × 1080 o del comportamiento nativo de un navegador; esa revisión queda pendiente cuando el host de navegador no está disponible.
