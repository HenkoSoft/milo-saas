# Compras: apertura modal real

## Actualización D-053: navegación y nombres

Ingreso de Mercadería del sidebar abre directamente el modal existente sobre el listado; Consulta de Compras muestra solo la lista. Si la lista ya está montada, ambos enlaces usan un controlador de RecordWorkspace y evitan desmontarla o perder filtros/posición. El botón del listado se llama «Ingreso de mercadería» y el modal «Ingreso de Mercadería». Las cinco opciones del menú se conservan.

El sidebar resalta Ingreso cuando el modal de alta está abierto, incluso si la URL sigue siendo /panel/compras; Consulta queda activa al cerrar o consultar un documento. El estado de UI se comparte mediante PurchaseNavigation, sin datos de negocio ni caché. Fuera del workspace se conservan los enlaces reales y los clics modificados no se interceptan.

/panel/compras/ingresar conserva su apertura automática. Al cerrarlo, la URL vuelve a /panel/compras con la misma query. El retorno sucede después de consumir la entrada del modal en el historial, conservando los nodos del listado, foco y scroll. Escape/Cancelar, descarte rechazado y bloqueo de cierre durante escritura siguen siendo responsabilidad del componente compartido. La consulta ya cerrada es una operación sin cambios. /nueva sigue siendo alias compatible.

La regresión Chrome incorpora ahora **PanelShell y sidebar reales**, además del listado y formulario. Verifica las cinco opciones, apertura desde Ingreso, título/botón, un único formulario, resaltado activo único mientras abre/cierra, Consulta sin autoapertura, conservación del nodo/URL/scroll tras guardar en memoria y cierre desde ruta directa preservando búsqueda, estado, sucursal y página. Después de cerrar ingresar, recargar consulta no reabre. El informe `.local/purchase-modal-browser/verified.json` incluye indicadores específicos de navegación. La prueba React adicional cubre los controles compartidos y la conservación del estado al rechazar el descarte.

Validación D-053: lint sin errores ni advertencias, typecheck, build HTTPS temporal de proceso y `git diff --check` aprobados. Suite completa: 182 casos, 179 aprobados, 3 omitidos y ninguno fallido. Chrome nativo aprobado en 1920 × 1080 y capturas inspeccionadas; modal centrado en x=320/y=100, 1280 × 880. Trece hashes protegidos de .env, autenticación, configuración/esquema Prisma y ocho SQL coinciden con la evidencia D-050. Servicios de negocio sin cambios; sin conexión a PostgreSQL, datos reales, commits ni pushes.

Las secciones D-052 siguientes registran la implementación anterior; los nombres «Nueva compra» quedan superados por D-053.

D-052, 2026-11-13. Corrección de presentación y rutas, sin cambios de servicios de negocio, PostgreSQL, Prisma, migraciones, Better Auth o .env. Se preservan las modificaciones anteriores del workspace y no se hacen commits ni pushes.

## Diagnóstico y solución

El listado ya tenía PurchaseWorkspace, pero el enlace de navegación de ingreso llevaba a `/panel/compras/nueva`, donde PurchaseForm se renderizaba incrustado. No existía `/panel/compras/ingresar` en este checkout. La revisión visual anterior de D-051 usaba un harness SSR y no demostraba el recorrido de apertura con React desde el listado. D-052 lo comprueba con el componente compartido en un navegador real.

`/panel/compras` muestra el listado y el enlace «Nueva compra», con href real `/panel/compras/ingresar` y `data-record-editor=""`. PurchaseWorkspace reutiliza RecordWorkspace, el mismo componente de Productos y Clientes: intercepta la activación, conserva el listado montado y llama al `HTMLDialogElement.showModal()` nativo. No se cambia la URL al abrir desde el listado. El navegador coloca el diálogo en la capa superior, muestra el backdrop y deja inerte el resto del documento.

La página directa `/panel/compras/ingresar` reutiliza PurchaseList con `initialCreate`; muestra el mismo listado y abre automáticamente el mismo diálogo mediante el mismo manejador de apertura. No hay una segunda versión incrustada del formulario. Recargar vuelve a abrirlo. `/panel/compras/nueva` conserva compatibilidad como alias. La navegación de Ingreso de Mercadería apunta a la ruta canónica ingresar. La edición desde el listado y su ruta directa conservan sus contratos.

RecordWorkspace agrega dos opciones compatibles: `initialCreate` (por defecto false) y `dialogClassName` (vacía por defecto). La apertura inicial se ejecuta una sola vez, tolera StrictMode y no reabre el modal después de guardar/refrescar. Productos y Clientes conservan sus opciones predeterminadas.

PurchaseForm sigue siendo único. Se mantienen Datos de la compra, Artículos y Observaciones; validación, importes, foco/Escape, advertencia de descarte, bloqueo durante guardado y todos los callbacks compartidos. Guardar cierra, devuelve el foco y refresca el listado actual conservando búsqueda, filtros, página y scroll. Borrador, recepción explícita, inventario, idempotencia, concurrencia, auditoría y permisos no se modifican.

## Distribución

Modificador de diálogo exclusivo de Compras: 1280 × 880 px en viewport de 1920 × 1080, centrado y acotado al tamaño disponible. Encabezado, pestañas y pie permanecen fuera del cuerpo desplazable. Datos de proveedor/búsqueda se compactan en columnas, sin omitir campos. El IVA manual conserva ancho suficiente para importes localizados. Datos cabe sin scroll exterior, incluso activando IVA. Con muchos artículos, solo la tabla tiene scroll, con encabezado de columnas fijo. En ventanas menores se conserva desplazamiento accesible si el contenido supera la altura disponible.

## Prueba nativa reproducible

Después de generar el build, ejecutar:

```powershell
node scripts/purchases/test-modal-browser.mjs --run-browser
```

Usa Chrome headless con perfil temporal propio bajo `.local/purchase-modal-browser`, CDP y viewport exacto 1920 × 1080. Compila para el harness los componentes reales PurchaseList, página ingresar, PurchaseWorkspace, RecordWorkspace, PurchaseForm y componentes auxiliares, con React/ReactDOM reales y CSS MILO respetando el orden de capas Tailwind. No fabrica el diálogo, no llama a showModal desde el harness y no reemplaza la implementación nativa del navegador.

Solo se sustituyen fronteras de servidor y router: fixtures y guardado en memoria; no se importa el servicio de base ni se conecta a PostgreSQL. No es una prueba de sesión autenticada o de persistencia comercial. Las restricciones server-side siguen cubiertas por las pruebas existentes.

Verificaciones del ensayo:

- Antes de abrir, el diálogo está cerrado; «Nueva compra» activa el componente real y `dialog.matches(':modal')` es true. Esto distingue showModal de un atributo open o de show().
- Se conserva el nodo del listado y la URL completa con búsqueda, página y estado. Backdrop comprobado por estilo calculado.
- Intentar enfocar un botón exterior no saca el foco del diálogo. Clics de puntero mediante CDP sobre ese botón no ejecutan su handler. Veinticinco pulsaciones reales de Tab mantienen el foco dentro.
- Escape consulta el descarte: rechazo mantiene abierto; aceptación cierra y devuelve el foco al disparador.
- La UI real selecciona proveedor/sucursal/producto y escribe cantidad/costo. El guardado simulado cierra, refresca una vez y conserva URL y scroll; el importe llega canónico exacto a la acción de memoria.
- Con 50 artículos se comprueba scroll de tabla y ausencia de scroll del cuerpo del modal.
- La ruta ingresar se visita y recarga; ambas abren el mismo diálogo sobre el listado. No aparecen excepciones JavaScript.

Evidencias locales: `verified.json`, `new-purchase-modal.png` y `articles-modal.png` en `.local/purchase-modal-browser`. Medición: diálogo 1280 × 880 centrado a y=100; x=312,5 por el ancho útil de 1905 px al descontar la barra vertical del viewport. Cuerpo 666/666 px tanto en Datos como con IVA y Artículos. Tabla 400/2519 px, con scroll interno; pie y=904–979 siempre visible y sin overflow horizontal.

Prueba adicional de regresión React/jsdom: apertura directa única con StrictMode, cierre al guardar y ausencia de reapertura al refrescar. Complementa las pruebas de teclado, descarte, cargas tardías, permisos, conflictos y conservación de listado existentes; jsdom por sí solo no certifica modalidad nativa.

## Validación final

Lint final sin errores ni advertencias, typecheck, build de producción con BETTER_AUTH_URL HTTPS temporal solo para el proceso y `git diff --check` aprobados. Suite completa: 180 casos, 177 aprobados, 3 omitidos y cero fallidos. Regresión nativa Chrome aprobada con capturas e informe; perfiles temporales propios cerrados y eliminados con verificación de ruta, conservando evidencias. Se comprobaron los 13 hashes protegidos de la evidencia D-050: .env, autenticación, configuración/esquema Prisma y ocho SQL sin cambios. Sin conexión a PostgreSQL, datos reales, commits ni pushes.
