# Nueva compra — adaptación a la referencia visual

Estado: relevamiento histórico superado por la instrucción posterior de reorganización de Compras y [PURCHASES_MODULE_RESTRUCTURE.md](PURCHASES_MODULE_RESTRUCTURE.md), D-049, 2026-11-12. La categoría se implementa como texto libre del documento; no se incorpora catálogo ni botón +. Las propuestas de este archivo que difieren del contrato D-049 no son funcionalidad vigente.

## Definiciones confirmadas por el usuario

- Categoría clasifica la compra; no reutiliza las categorías de productos.
- Desglose Compra separa neto e IVA del comprobante.
- Con desglose activo, el costo unitario se ingresa sin IVA; el IVA se agrega al neto.
- Se mantienen Guardar borrador y Confirmar recepción. No se incorpora Procesar Pago.

Estas respuestas aprueban esas decisiones funcionales. No se solicita confirmarlas nuevamente. El contrato concreto propuesto debajo completa la captura y persistencia de esos campos para su revisión antes de implementar. La separación de importes no implica liquidación fiscal, crédito fiscal ni contabilización.

## Distribución solicitada

Conservar la identidad MILO, RecordWorkspace/RecordEditor, rutas directas y pie fijo con las acciones disponibles. Ordenar la vista en cabecera de comprobante, datos de proveedor, búsqueda de artículos, renglones y total ARS. Mantener la sucursal receptora explícita, aunque no aparezca en la captura: determina el destino del stock.

| Campo de la imagen | Estado actual y adaptación propuesta |
| --- | --- |
| Tipo / FACTURA A | Selector opcional propuesto: Factura A (FA), Factura B (FB), Factura C (FC) y Otro (OTRO), sin selección inicial. Registra el comprobante recibido; no emite ni valida fiscalmente una factura. |
| Punto de venta / Número de comprobante | Campos opcionales de texto numérico, de 1 a 5 y de 1 a 8 dígitos respectivamente. Conservar ceros iniciales. No reinterpretar automáticamente referencias guardadas. |
| Categoría y botón + | Confirmado: clasifica la compra y es independiente de categorías de productos. Propuesta: catálogo propio del tenant, alta de nombre mediante + solo para OWNER/ADMIN COMPANY y selección en el documento; sin categorías precargadas ficticias. La relación debe ser compuesta por tenant. |
| Fecha | Reutilizar fecha comercial existente, con valor inicial de Argentina y validación de calendario en servidor. |
| Desglose Compra | Confirmado: costos sin IVA y agregado al neto. Propuesta de captura: Neto calculado, IVA del comprobante ingresado manualmente y Total calculado. No deducir una alícuota de la condición fiscal del proveedor ni transformar los costos al alternar el control. |
| Código / búsqueda F3 | Reutilizar selección del proveedor del tenant y mostrar su código. Incorporar F3 como acceso al buscador, sin crear ni modificar proveedores desde esta pantalla. |
| Nombre | Mostrar razón social o nombre comercial de la ficha seleccionada. |
| Cond. IVA | Mostrar condición fiscal existente del proveedor, sin asignar CONSUMIDOR FINAL por defecto ni cambiar su ficha desde la compra. |
| CUIT/DNI | El proveedor actual tiene CUIT opcional; no tiene DNI. Mostrar CUIT. Incorporar DNI requiere otro contrato explícito de identificación, sin almacenar un DNI en el campo CUIT. |
| Dirección | Mostrar el domicilio disponible de la ficha seleccionada. Los datos fiscales y de contacto se entregan únicamente a OWNER/ADMIN COMPANY del mismo tenant. |
| Código Artículo / búsqueda F5 | Reutilizar búsqueda por SKU/nombre y agregar F5 para buscar artículos dentro del editor activo, con manejo de teclado acotado al formulario. |
| Cant. / Código / Descripción / Costo Unit. / Subtotal / Acciones | Reorganizar los renglones existentes para separar SKU y descripción. Mantener visible la unidad base, cantidades enteras, quitar renglón y cálculos Decimal en servidor. |
| Total | Reutilizar total en ARS y formato obligatorio `100.000,00`, con dos decimales. |
| Procesar Pago | Confirmado: conservar Guardar borrador y Confirmar recepción; no implementar pagos. |

## Contrato propuesto de compatibilidad y aislamiento

- Los nuevos datos del comprobante y la categoría serán opcionales para conservar compras anteriores y registros sin comprobante informado. Elegir una categoría no cambia stock ni clasifica productos automáticamente.
- La selección y el alta de categorías se resuelven con tenant y permisos de la sesión; el navegador no determina tenant ni actor. Nombre de 1 a 100 caracteres, sin duplicados por tenant tras recortar extremos e ignorar mayúsculas/minúsculas. No ofrecer edición ni eliminación de categorías en este alcance. El botón + crea una categoría real, con auditoría, y la selecciona; aclarar que se guarda independientemente de la compra y no se elimina al cancelar el borrador.
- Separar el tipo, punto de venta y número como metadatos externos del proveedor; no usar el código CP como número fiscal ni emitir documentos. Conservar la referencia libre existente sin analizarla ni rellenar los nuevos campos con valores supuestos. No imponer nueva unicidad de comprobantes ni impedir guardar por repetir una referencia en esta etapa; la identidad e idempotencia de la compra conservan sus controles existentes.
- Mostrar nombre, CUIT, condición frente al IVA y domicilio del proveedor seleccionado como consulta de su ficha actual. Conservar el snapshot histórico mínimo vigente de código/nombre al recibir; no ampliar silenciosamente su contenido ni presentar datos actuales como snapshot fiscal.
- Con desglose desactivado, conservar el cálculo V1 y mostrar solo el total; no interpretar documentos anteriores como compras gravadas, exentas ni con IVA cero. Los importes de neto/IVA de documentos anteriores permanecen ausentes.
- Con desglose activado, `neto = suma(cantidad × costo unitario)` e `importe total = neto + IVA`. El neto no es editable. El IVA se ingresa manualmente como importe no negativo con hasta dos decimales; es obligatorio al activar el desglose, incluso cuando sea cero explícito. No agregar alícuotas, cálculo automático de IVA, percepciones ni otros impuestos en esta adaptación. Guardar modo de desglose, neto, IVA y total exactos, con límites Decimal(18,2) y validación Zod en servidor. Vacío no equivale a cero; rechazar overflow y precisión excesiva.
- El costo histórico por renglón conserva el valor ingresado, sin distribuir IVA entre artículos. Con desglose activo es neto; con modo desactivado no se le atribuye composición fiscal. Mostrar el modo en el detalle recibido y no comparar esos costos como si tuvieran una base fiscal uniforme.
- Al desactivar un desglose con IVA ingresado, pedir confirmación antes de descartarlo y recalcular el total solo con los renglones; no modificar los costos. Cancelar esa confirmación conserva el modo y el importe. Al activarlo, IVA queda vacío hasta una entrada explícita.
- Los documentos recibidos siguen inmutables. La recepción incrementa exactamente las cantidades de los renglones, independientemente del desglose; no cambia precios de venta ni crea deudas o pagos.

## Persistencia propuesta

- Tabla de categorías de compra con UUID, tenantId, nombre y clave normalizada única por tenant. FK RESTRICT a Tenant y relación compuesta desde Purchase. No se crea una categoría por defecto ni se cargan ejemplos.
- Agregar a Purchase campos opcionales para categoría, tipo, punto de venta y número; modo de desglose con valor inicial false; neto e IVA nullable, ausentes cuando el modo esté desactivado. Con modo activo ambos importes deben estar presentes. El total existente continúa siendo el total final del documento.
- Preparar una octava migración, conservando intactos los siete archivos SQL existentes. Agrega estructura y restricciones; actualiza mediante CREATE OR REPLACE la función de integridad de compras para validar suma de renglones contra neto y total contra neto + IVA cuando el modo esté activo. En modo previo conserva la ecuación V1. Mantener todos los controles de recepción, movimientos, auditoría, estados y pertenencia. No actualizar filas comerciales anteriores ni modificar sus totales.
- Los nuevos valores por defecto/nullable permiten consultar documentos anteriores sin asignarles IVA cero ni modificar sus referencias. Borradores existentes pueden adoptar los nuevos campos al editar; recibidos permanecen inmutables.
- Incluir todos los campos nuevos en las huellas canónicas de operaciones nuevas. Para reintentos de documentos creados bajo el contrato V1, reconocer la huella anterior únicamente si los campos nuevos siguen ausentes y el modo desactivado; no romper idempotencia ni aceptar contenido distinto como reintento idéntico.
- No aplicar esta nueva migración a milo_dev durante la implementación: primero probar en base aislada y dejar SQL/resultados para autorización de despliegue independiente. La autorización anterior corresponde exclusivamente a `20261112010000_add_purchases`.

## Revisión pendiente

El usuario ya definió la clasificación, separación neto/IVA, costos netos y conservación de acciones. Se solicita aprobación únicamente del contrato concreto restante aquí propuesto: categorías propias con alta mediante +, metadatos opcionales del comprobante, IVA manual por documento y compatibilidad/migración descritas. Si se necesita IVA automático por alícuota o más tipos de comprobante, ajustar este contrato antes de implementar.

## Criterios de aceptación para la implementación posterior

- Ningún campo editable se pierde al guardar/reabrir. No agregar campos decorativos que parezcan persistidos.
- Aprobar el contrato de datos antes de cambiar Prisma; preparar cualquier migración como aditiva y revisable, sin modificar las siete existentes ni aplicar cambios nuevos a milo_dev por esta tarea de relevamiento.
- Resolver tenant, actor y permisos en servidor; validar entradas con Zod y relaciones del mismo tenant. Mantener documentos recibidos inmutables e idempotencia de recepción.
- Definir si los datos del proveedor son consulta de ficha actual o snapshot histórico antes de ampliar snapshots. No alterar documentos recibidos ni copiar datos personales sin necesidad.
- Preservar foco, Escape, cambios sin guardar, filtros y desplazamiento del listado. Atajos sin interferir fuera del editor.
- Verificar guardado/reapertura, validaciones, importes y compatibilidad de documentos anteriores en pruebas apropiadas; escrituras de prueba solo en base aislada.
- No crear compras, movimientos ni otros datos de prueba en milo_dev. No modificar Better Auth ni .env; sin commits ni pushes.
