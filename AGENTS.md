# Instrucciones permanentes para Codex

## Producto

Milo Store es el primer tenant de una plataforma SaaS multiempresa. La plataforma será una aplicación compartida con código común y aislamiento lógico estricto de los datos de cada empresa. La marca visual compartida del SaaS es MILO, distinta de Milo Store y HenkoSoft. HenkoSoft es la desarrolladora y Milo Store es el primer tenant. Los sitios comerciales pueden personalizarse mediante plantillas reutilizables y opciones visuales acotadas. El panel administrativo y de ventas mantiene una interfaz e identidad visual global de MILO para todas las empresas. No implementar white-label completo.

Milo Store, como primer tenant, conserva el alcance inicial de tienda mayorista. El catálogo de cada empresa siempre es público; cada tenant configura la visibilidad de precios como PUBLIC o AUTHENTICATED_CUSTOMERS. Solo una identidad autenticada vinculada al Customer aprobado/activo del tenant puede ver precios privados. La compra requiere autorización comercial independiente y validación server-side.

El alcance funcional por área y el estado implementado/pendiente/fuera de alcance están en `docs/WHOLESALE_V1_SCOPE.md`. Usarlo como referencia del módulo mayorista; no inferir requisitos adicionales ni presentar alcance aprobado como funcionalidad ya implementada.

## Aislamiento multi-tenant

- Todo registro de negocio propiedad de una empresa debe asociarse a un tenant mediante `tenant_id` o una convención equivalente, consistente y documentada.
- Cada usuario pertenece a una única empresa. La empresa administra sus propios usuarios y empleados; ningún usuario puede acceder a datos de otro tenant.
- Una empresa puede tener una o varias sucursales. Un empleado puede estar asignado a una o varias sucursales de su empresa; los administradores autorizados tienen alcance a todas las sucursales de esa empresa.
- Roles acordados: Dueño, Administrador, Encargado, Vendedor, Técnico y Depósito. Un empleado puede tener varios roles; los roles operativos pueden variar por sucursal. Dueño y Administrador tienen alcance general dentro de su empresa; los demás roles respetan las sucursales asignadas.
- Dueño tiene control total de su empresa. Administrador gestiona la empresa, pero no transfiere la propiedad ni elimina al Dueño. Encargado supervisa sucursales asignadas y no administra usuarios ni cambia permisos. Vendedor cubre operaciones comerciales; Técnico corresponde a reparaciones y órdenes de servicio; Depósito cubre inventario y movimientos de stock. No inferir permisos más específicos.
- El alcance de sucursales nunca amplía el alcance de empresa. Ningún usuario accede a otra empresa. La administración central de HenkoSoft es separada de los roles empresariales.
- Resolver el tenant y la membresía en servidor en cada operación. No confiar en `tenant_id`, rol o permiso enviados por el navegador.
- Filtrar y autorizar todas las lecturas y escrituras por tenant. Aplicar restricciones y relaciones compuestas para impedir que una fila de un tenant referencie datos de otro.
- Ningún usuario, incluido quien administre la plataforma, accede a datos de negocio de otra empresa. Las funciones centrales se limitan a la administración de información propia de la plataforma y no amplían el acceso a datos de tenant.
- RLS puede complementar controles, pero no reemplaza autorización de aplicación cuando Prisma usa una conexión con privilegios elevados.

## Identidad y datos de empresa

Cada tenant podrá mantener nombre comercial, razón social, CUIT, datos fiscales, dirección, contacto, logo, usuarios, empleados y datos comerciales propios. Los datos y documentos de una empresa permanecen aislados por tenant. El logo podrá aparecer en el sitio comercial y en presupuestos, comprobantes, reportes y documentos comerciales del tenant. La personalización del storefront no cambia el tema ni la identidad visual global del panel.

## Módulos y planes

La plataforma podrá ofrecer capacidades de reparaciones/órdenes de servicio, ventas minoristas, inventario/productos, gestión de clientes y distribución mayorista. Su disponibilidad podrá depender del plan. Esto no autoriza a diseñar o implementar ahora cada módulo, automatización, facturación ni pagos de suscripción. La administración SaaS podrá gestionar empresas y el estado de las cuentas; planes, suscripciones, límites y módulos habilitados son parte del modelo futuro por definir.

Cada empresa puede administrar una o varias sucursales. La asignación de usuarios a sucursales puede ser de una a varias; el administrador autorizado puede abarcar todas las sucursales de su propia empresa. No se presupone una sucursal única.

## Tecnologías y arquitectura

- Next.js, React, TypeScript estricto y Tailwind CSS.
- PostgreSQL como base prevista; se conservan las decisiones existentes de Supabase PostgreSQL/Storage y Better Auth, Prisma ORM Community, shadcn/ui, Zod y GitHub mientras no sean reemplazadas por una decisión aprobada.
- Better Auth administra identidad, credenciales y sesiones; MILO administra empresas, empleados, sucursales, roles y permisos. Email globalmente único; cada identidad puede vincularse como máximo a un UserProfile mediante authUserId, nunca mediante email. No usar Organization ni registro público libre. Empleados por invitación de OWNER/ADMIN; implementación de invitaciones y proveedor de correo pendientes.
- Aplicación modular y monolítica. No agregar microservicios sin una necesidad concreta y aprobada.
- Docker y Docker Compose son opcionales para desarrollo local.
- No cambiar tecnologías ni contratar/activar servicios pagos sin autorización.

Configuración inicial: Argentina, ARS, español, `America/Argentina/Buenos_Aires`.

## Formato monetario obligatorio

- Todo campo o importe monetario actual y futuro usa punto para miles, coma para centavos y dos decimales visibles: `100.000,00`. Aplica a entradas, vistas de consulta, tablas, totales y documentos, en cualquier módulo y para cualquier moneda habilitada. Identificar la moneda explícitamente en el contexto; no inferirla por los separadores.
- Seguir `docs/MONEY_FORMAT.md` (D-038). Reutilizar las utilidades monetarias existentes compatibles con el contrato del campo y cubrir su formato/conversión con pruebas; no crear formatos alternativos por pantalla.
- El formato localizado pertenece a la interfaz. Transportar y guardar decimales canónicos exactos, sin miles y con punto decimal; validar con Zod en servidor. No usar Number/parseFloat para dinero ni redondear, truncar o transformar un campo vacío en cero.
- Esta regla no habilita nuevas monedas, importes negativos, conversiones, impuestos, costos ni módulos. Cantidades y factores tienen contratos propios.

## Formularios administrativos

Los formularios administrativos de alta/edición deben reutilizar el patrón de `docs/ADMIN_FORMS.md`: diálogo `RecordWorkspace`, estructura `RecordEditor`, pestañas opcionales y `EditorFooter` con Guardar/Cancelar fuera del cuerpo desplazable. Conservar rutas directas, foco, Escape, advertencia por cambios sin guardar y estado del listado al guardar. Aplicado a Productos, Marcas, Categorías y Clientes (D-041); Proveedores no tiene alta/edición implementada y no se crean pantallas para simularla. Reutilizar servicios y autorización existentes. Clientes conserva el contrato aprobado en `docs/CUSTOMERS_V1_PROPOSAL.md`: OWNER/ADMIN COMPANY, contacto versión 1, sin autorización comercial por el alta, estados previos inalterados y JSON incompatible protegido.

## Tablas administrativas

Clientes y Proveedores ofrecen Excel e impresión/PDF según `docs/ADMIN_DATA_TRANSFER_PROPOSAL.md` (D-046), aprobado para ambos módulos: OWNER/ADMIN COMPANY, datos siempre del tenant de sesión, importación de altas con vista previa y confirmación atómica, sin sobrescribir fichas existentes. Usar las utilidades compartidas de transferencia, validación fiscal y formatos; no persistir archivos de usuarios ni probar importaciones sobre datos reales. Impresión/PDF usa el diálogo del navegador. Este alcance no convierte el formato de sus tablas en una norma general.

Proveedores V1 está implementado según `docs/SUPPLIERS_V1_PROPOSAL.md` (D-045), con datos y acceso aprobados, OWNER/ADMIN COMPANY y migración probada en base aislada y aplicada posteriormente a `milo_dev` el 2026-11-11 con autorización expresa, respaldo y verificación de integridad. Esta actualización supera la referencia anterior a Proveedores sin formularios. Reutilizar el modal y las acciones compartidas; no habilitar compras, deudas, saldos ni condiciones de pago automatizadas.

Compras V1 tiene contrato aprobado e implementación según `docs/PURCHASES_V1_PROPOSAL.md` (D-048), superando la restricción anterior de no habilitar Compras para este alcance específico. Solo OWNER/ADMIN COMPANY, borradores sin stock y recepción completa única en unidad base entera, con costos Decimal, stock por sucursal y auditoría transaccional. No incluye pagos, deuda, devoluciones, notas de crédito ni documentos fiscales. La migración `20261112010000_add_purchases` fue autorizada y aplicada a `milo_dev` con respaldo verificado en una tarea posterior. D-049 reorganiza el módulo según `docs/PURCHASES_MODULE_RESTRUCTURE.md`: ingreso/consulta V1 operativos; comprobante/categoría/IVA manual preparados con octava migración `20261112060000_purchase_document_details` autorizada y aplicada a `milo_dev` el 2026-11-12 con respaldo externo verificado (D-050), ocho migraciones aplicadas y ninguna pendiente; comprobante/categor?a/IVA manual disponibles, con datos anteriores conservados. N/C y pagos sin escrituras ni saldos; pagos consulta proveedores reales. Conservar las siete migraciones anteriores y datos reales.

`docs/ADMIN_TABLES.md` (D-044, alcance corregido) describe la presentación actual de Clientes y Proveedores como referencia opcional. El usuario retiró la obligación general de repetir ese formato en todos los listados actuales y futuros; cada módulo puede definir su distribución según sus necesidades. Se mantienen la identidad visual global MILO, accesibilidad, permisos y funcionalidades existentes; esta corrección no habilita campos, ordenamiento ficticio ni eliminación adicional.

## Seguridad, privacidad e integridad

- Validar entradas externas con Zod en servidor. Autenticar y autorizar cada operación server-side; denegar por defecto.
- Prisma exclusivamente en servidor. No exponer secretos, credenciales ni `SUPABASE_SERVICE_ROLE_KEY` al cliente.
- El catálogo público siempre puede consultarse; respetar Tenant.priceVisibility en servidor. No entregar precios privados en JSON, endpoints, HTML/RSC, metadatos, logs ni cachés compartidas.
- No habilitar autorregistro de clientes mayoristas ni almacenar contraseñas en texto plano.
- Tratar datos de contacto, fiscales e identificadores como información protegida; limitar recolección, acceso, logs y retención.
- La PWA, si se implementa para el tenant, cachea únicamente shell y recursos públicos; no cachear sesión ni datos privados.
- El stock no puede ser negativo y cada cambio genera un movimiento persistente. Calcular precios y totales en servidor con importes decimales y moneda explícita.
- No activar pagos de suscripciones ni integraciones de pago sin autorización expresa.

## Estructura pública aprobada

- `/` y las páginas `/plataforma`, `/funcionalidades`, `/soluciones`, `/nosotros` y `/contacto` pertenecen a MILO SaaS. `/tiendas/milo-store` es el portal comercial de Milo Store.
- Los portales comerciales se organizan en `app/(comercial)/tiendas/[slug]/`. El registro editorial server-only reconoce exclusivamente `milo-store`, sin tenantId, vínculo a Prisma ni autorización empresarial. Un slug desconocido o inválido devuelve 404. Los contratos, contenidos y tokens del storefront no son campos de Tenant ni crean datos en la base.
- `/acceso` es informativa hasta implementar el ingreso en una etapa autorizada. No simular login, paneles o funcionalidades comerciales. El WhatsApp existente corresponde exclusivamente a Milo Store. La personalización visual se limita al sitio comercial; el panel mantiene la identidad global.

## Método y estado

- Antes de editar, revisar estado de Git, archivos e instrucciones y preservar cambios existentes.
- Registrar decisiones duraderas en `docs/DECISIONS.md`; mantener los seis documentos coherentes.
- Trabajar por etapas y módulo a la vez. Antes de implementar, relevar dependencias, propuesta y criterios de aceptación.
- La documentación multi-tenant debe ser aprobada antes de implementar cambios de datos o acceso. No asumir autorización de código por una tarea exclusivamente documental.
- Informar solo validaciones ejecutadas y no presentar funciones futuras como implementadas.


## Reglas futuras de acceso comercial e historial

- Catalogo por tenant siempre publico para productos publicados; Tenant.priceVisibility controla precios PUBLIC o AUTHENTICATED_CUSTOMERS, default AUTHENTICATED_CUSTOMERS.
- En modo privado, solo identidad autenticada vinculada a Customer autorizado/activo del mismo tenant recibe precios; UserProfile y CustomerAccessRequest no dan acceso automaticamente. Compra se valida por separado en servidor.
- Toda escritura de OrderLine bloquea la ProductPresentation padre antes de guardar. StockBalance/StockMovement bloquean Product antes de leer o escribir cantidades. Operaciones multi-fila adquieren locks (tenantId,id) en orden estable y en una transaccion.
- No editar ni borrar StockMovement; no se definen reversos. No congelar OrderLine por estado hasta aprobar su ciclo de vida; los casos de uso conservan snapshots historicos una vez finalizados.
