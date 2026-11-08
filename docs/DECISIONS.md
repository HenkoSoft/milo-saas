# Registro de decisiones de Milo Store V1

Este registro distingue decisiones acordadas, propuestas y pendientes. El alcance de este documento proviene de la instrucción vigente del propietario. La documentación completa queda pendiente de su aprobación personal. No autoriza el inicio del desarrollo.

## D-001 — Producto y alcance

- **Estado: Acordado para V1.**
- Milo Store V1 es exclusivamente una tienda mayorista de repuestos y productos para celulares.
- Incluye Administrador, clientes mayoristas autorizados, solicitud de acceso y aprobación manual, catálogo público sin precios, precios privados, productos, búsqueda básica, lista general de precios, inventario sencillo, carrito, pedidos online, pagos manuales, administración básica, WhatsApp Business y diseño mobile-first.
- No hay autorregistro. Una cuenta debe estar aprobada y activa para acceder a precios y compras.
- La PWA instalable se implementa solo si no agrega complejidad significativa.
- La gestión de reparaciones podría evaluarse como posibilidad futura independiente; no forma parte de V1 ni se diseña aquí.

## D-002 — Tecnologías y entorno

- **Estado: Acordado.**
- Next.js, TypeScript estricto, Supabase PostgreSQL/Auth/Storage, Prisma ORM Community, Tailwind, shadcn/ui, Zod y GitHub.
- Docker y Docker Compose son opcionales para desarrollo local.
- No sustituir las tecnologías acordadas ni agregar servicios externos pagos sin autorización explícita.
- No hay proveedor de hosting de producción elegido.

## D-003 — Mercado y operación inicial

- **Estado: Acordado.**
- País Argentina; moneda ARS; idioma español; zona `America/Argentina/Buenos_Aires`.
- Una organización, una sucursal y un depósito al inicio.

## D-004 — Acceso, catálogo y precios

- **Estado: Acordado en alcance; detalles menores pendientes.**
- Visitantes reciben un catálogo informativo sin precios. Pueden solicitar acceso sin que la solicitud cree una sesión o habilite compras.
- Administración revisa y aprueba manualmente el acceso.
- Los precios mayoristas se muestran únicamente a clientes aprobados y activos.
- Hay una lista general de precios mayoristas. No incluir listas especiales por cliente sin una decisión posterior.
- Producto V1: SKU, nombre, descripción, fotos, categoría, marca y estado de publicación.
- No solicitar DNI en el formulario inicial.

## D-005 — Inventario y pedidos

- **Estado: Acordado en alcance.**
- Inventario sencillo con entradas, salidas y ajustes registrados. Stock nunca negativo y saldo no editable directamente.
- V1 permite carrito y pedidos online con administración básica.
- Guardar el detalle histórico de productos, cantidades y precios del pedido. Precio y total se determinan en servidor.
- Los estados específicos y la política ordinaria de cancelación se definirán antes de implementar el módulo.

## D-006 — Pagos manuales

- **Estado: Acordado en alcance; detalles pendientes.**
- Medios de pago: transferencia y efectivo.
- Registro y confirmación manual desde administración.
- Estado del pedido y estado del pago son datos distintos. Guardar actor, fecha, importe y moneda en cada confirmación.
- Los estados detallados y el tratamiento operativo de cada método se definirán durante el análisis del módulo.

## D-007 — Seguridad, privacidad e integridad

- **Estado: Acordado.**
- Validación con Zod y autorización server-side en cada operación; denegar por defecto y verificar que el cliente esté activo y acceda solo a sus propios datos.
- Prisma se ejecuta exclusivamente en servidor. No exponer secretos, credenciales ni claves service-role al cliente.
- Las respuestas públicas nunca incluyen precios/costos. No incluir esos campos en consultas, HTML, metadatos, APIs, logs ni cachés públicos.
- No almacenar contraseñas en texto plano. No habilitar autorregistro.
- Tratar los datos de contacto como personales, limitar su recolección y restringir su acceso. Acordar retención antes de producción.
- Cada movimiento de stock es persistente; operaciones sobre saldo usan transacciones y protecciones contra concurrencia.
- Dinero decimal con moneda explícita; fechas persistidas en UTC y presentadas en la zona de negocio.

## D-008 — Costos y despliegue

- **Estado: Restricción acordada; decisiones operativas pendientes.**
- No contratar ni activar servicios pagos, gasto por uso, dominios o facturación sin autorización.
- Antes de producción, verificar uso comercial, cuotas, límites, respaldos, restauración y costo total de los servicios elegidos.

## Fuera de V1

El alcance no incluye módulos distintos de la tienda mayorista descrita en D-001. Cualquier posibilidad futura requiere una decisión independiente; no se especifica ni diseña en este documento.

## Pendientes antes del desarrollo

- Aprobación personal de los seis documentos y autorización explícita para iniciar.
- Campos exactos, normalización y unicidad de email/teléfono y manejo de solicitudes duplicadas.
- Estados de cliente, producto, pedido y pago.
- Reglas de inventario para las operaciones habituales y tratamiento de cancelaciones.
- Detalles de registro y confirmación manual de transferencia y efectivo.
- Política de privacidad y retención de datos de contacto.
- Hosting y operación de producción compatibles con uso comercial.
- Confirmar si la PWA aporta valor sin complejidad significativa.

No se autoriza por este registro crear código, scaffold, dependencias, tablas, migraciones o configuración de servicios.
