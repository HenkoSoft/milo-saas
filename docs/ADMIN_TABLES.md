# Referencia visual de tablas de Clientes y Proveedores

Referencia D-044, con alcance corregido por el usuario el 2026-11-11. Se retiró la obligación general de utilizar este formato en todos los listados actuales y futuros. Este documento describe la distribución actual de Clientes y Proveedores y puede consultarse como guía opcional; la presentación de otros módulos se define según sus necesidades. La identidad visual global de MILO y las reglas de accesibilidad y seguridad siguen vigentes.

## Estructura y contenido

- Mostrar cada dato principal en una columna propia, con encabezado claro y alineado con sus filas. Evitar agrupar varios campos comerciales independientes dentro de una única celda.
- Adaptar las columnas al modelo y a la operación del módulo; no repetir obligatoriamente las columnas de Clientes en Productos u otras entidades.
- En Clientes, mantener este orden: **Código, Razón social, Dirección, Contacto, Celular, CUIT y Acciones**. Contacto significa nombre de contacto; Celular usa su campo específico y CUIT solo muestra documentos de ese tipo.
- Presentar únicamente valores persistidos o derivados por reglas ya aprobadas. Un dato ausente se muestra como «—»; no completar con ejemplos ni inferir una razón social, celular o CUIT a partir de otro campo. Conservar la identificación histórica necesaria con una etiqueta explícita, como «Nombre registrado».
- Conservar el código comercial real de MILO. Formatear CUIT como `XX-XXXXXXXX-X` solo en la vista, sin cambiar el valor canónico almacenado. Los importes siguen [MONEY_FORMAT.md](MONEY_FORMAT.md).

## Diseño y adaptación

- Usar exclusivamente colores, tipografía, bordes, estados hover/focus y componentes compartidos de MILO. La captura externa orienta la distribución de columnas; no establece otra identidad visual.
- Mantener filas compactas y legibles, con celdas centradas verticalmente, márgenes uniformes y espacio entre controles. Los textos largos pueden ocupar varias líneas; no ocultar datos o acciones importantes para hacer entrar la tabla.
- Dar más espacio a denominaciones, direcciones y otros textos extensos. Códigos, celulares, CUIT y acciones deben conservar una lectura estable, sin cortes arbitrarios.
- Priorizar el trabajo de escritorio a 1920 × 1080. En anchos menores, conservar todas las columnas mediante desplazamiento dentro del contenedor de la tabla, sin provocar desbordamiento horizontal de toda la página. Mantener encabezados visibles en el desplazamiento vertical cuando corresponda.
- Reutilizar `milo-catalog-table-wrap`, `milo-catalog-table`, `milo-table-cell` y `milo-table-actions` de los estilos compartidos. Los modificadores por módulo pueden ajustar anchos y densidad; no imponer los anchos de Clientes a todas las tablas.

## Acciones, accesibilidad y navegación

- Colocar las acciones en la última columna, agrupadas y alineadas, con separación uniforme. Mantener controles de al menos 44 × 44 px, foco visible y acceso por teclado.
- Reutilizar `TableEditAction`: lápiz, tooltip «Editar» y nombre accesible contextual. Cuando corresponda una consulta protegida, conservar «Consultar» y su comportamiento existente.
- Mostrar Eliminar solo donde haya una implementación autorizada y segura. Usar papelera, tooltip y nombre accesible, confirmación explícita y controles server-side existentes. Este patrón visual no autoriza agregar eliminación ni nuevos permisos.
- Conservar búsqueda, filtros, paginación, scroll, rutas directas y modales según [ADMIN_FORMS.md](ADMIN_FORMS.md). Usar tabla semántica, encabezados con `scope="col"` y contenedor desplazable accesible mediante teclado.
- No mostrar flechas de ordenamiento ni controles que aparenten funciones inexistentes. Si se implementa ordenamiento en una etapa autorizada, debe funcionar con teclado y comunicar su estado de forma accesible.

## Alcance y verificación

D-046 agrega a Clientes y Proveedores una barra compartida de Nuevo/F4, Importar Excel, Exportar Excel e Imprimir PDF. La exportación/impresión comprende todos los resultados filtrados, incluyendo todas las páginas, hasta 5.000 registros. La importación de altas se revisa antes de confirmar y no sobrescribe fichas existentes; esto no obliga a incorporar estas acciones en otros módulos. Contrato: [ADMIN_DATA_TRANSFER_PROPOSAL.md](ADMIN_DATA_TRANSFER_PROPOSAL.md).

Proveedores V1 (D-045) prepara Código, Razón social, Nombre comercial, Dirección, Contacto, Teléfono, CUIT y Acciones, con el mismo patrón visual y campos propios. Su estructura fue autorizada y aplicada a milo_dev el 2026-11-11; en bases sin la migración su operación permanece bloqueada. Los estados de migración pendiente no se presentan como listados vacíos reales.

Clientes presenta las seis columnas comerciales indicadas y sus acciones. No se exige adaptar otros módulos a esta distribución. Esta referencia no cambia modelos, validaciones, servicios, autorización, aislamiento, auditoría ni reglas comerciales.

Al aplicar el patrón, verificar alineación, legibilidad, encabezados, controles y desplazamiento interno en escritorio y pantallas menores. Informar por separado las pruebas automatizadas y la inspección visual real; una prueba DOM no acredita dimensiones o ausencia de desbordamiento en navegador.
