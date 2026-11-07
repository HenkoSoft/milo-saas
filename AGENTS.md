# Instrucciones permanentes para Codex

## Producto y alcance

Milo Store es un sistema B2B para venta mayorista de repuestos a técnicos de celulares y gestión de reparaciones. Tiene dos experiencias sobre la misma aplicación y reglas: **Milo Store Admin** (administración) y **Milo Store Shop** (tienda privada para técnicos autorizados). No es una tienda de compra pública. Visitantes pueden explorar el catálogo sin precios y solicitar acceso por WhatsApp; solo técnicos creados/autorizados manualmente pueden ver precios y comprar.

Configuración inicial acordada: Argentina, ARS, español y `America/Argentina/Buenos_Aires`. Una sucursal y un depósito al inicio, con modelo extensible a varios. No permitir stock negativo. PWA mobile-first para la tienda; administración principalmente de escritorio y usable en móvil.

## Stack acordado

- Next.js, TypeScript estricto.
- PostgreSQL en Supabase y Prisma ORM Community.
- Supabase Auth y Supabase Storage.
- Tailwind CSS, shadcn/ui y Zod.
- GitHub; Vercel u otro proveedor compatible con uso comercial, pendiente de elección.
- Docker es opcional para desarrollo local.

No cambiar el stack ni añadir servicios externos pagados sin autorización explícita. No crear scaffold, instalar dependencias o implementar módulos hasta que el usuario apruebe la documentación y autorice el inicio de código. No activar facturación, gasto por uso, dominios o servicios pagos sin autorización.

## Método de trabajo

- Trabajar por etapas y un módulo a la vez. Antes de implementarlo: relevar requerimientos, dependencias, propuesta y criterios de aceptación con el usuario.
- Resolver errores críticos de integridad, permisos o pérdida de datos antes de pasar a otro módulo.
- No hacer cambios arquitectónicos importantes sin explicarlos y obtener aprobación.
- Antes de editar, revisar estado de Git, archivos e instrucciones aplicables; preservar cambios existentes.
- No presentar simulaciones, datos ficticios o integraciones incompletas como reales. Separar datos de demostración de producción.
- Registrar decisiones duraderas en `docs/DECISIONS.md` y mantener todos los documentos consistentes.

## Diseño, privacidad y seguridad

- Mantener límites entre UI, aplicación/casos de uso, dominio e infraestructura. La tienda y el panel consumen los mismos casos de uso de servidor; la lógica comercial no se duplica en UI, Server Actions ni endpoints.
- Validar toda entrada externa con Zod en el servidor. El frontend no es una frontera de seguridad.
- Autenticar y autorizar en servidor en cada operación; denegar por defecto y aplicar mínimo privilegio. La sesión autenticada no concede permisos por sí sola. Roles iniciales: Administrador, Encargado, Vendedor, Técnico y Cliente; revisar permisos por acción según documentación.
- No debe existir auto-registro de clientes/técnicos. La creación, activación, suspensión, desactivación y recuperación de acceso de técnicos corresponde al administrador. Nunca almacenar o enviar contraseñas en texto plano; preferir enlaces de invitación/recuperación de un solo uso y exigir establecimiento de contraseña propia antes de habilitar la tienda.
- Permitir que visitantes envíen una solicitud de acceso pública sin crear cuenta. Admin revisa, aprueba, rechaza o pide correcciones. El formulario inicial no debe pedir DNI hasta que el propietario documente su necesidad legal/comercial/operativa.
- Solicitud de acceso: nombre/apellido, teléfono/WhatsApp argentino nacional de exactamente 10 dígitos (sin +54, 0 inicial, 15, espacios ni separadores), email, localidad/provincia y actividad comercial. Validar formato y número asignable según el plan nacional vigente con biblioteca mantenida en servidor; separar validación de titularidad (OTP/SMS/WhatsApp no aprobado).
- Normalizar email con una política estable y versionada, detectar duplicados antes de aprobar y reforzar con restricciones DB. Validar en UI y servidor; errores claros. No eliminar plus-tags ni puntos por proveedor.
- Tratar DNI, teléfonos, emails, domicilio y datos de identidad como personales: mínimo privilegio, DNI restringido y nunca en público, logs o notificaciones generales. Separar identidad, entrega y facturación; auditar cambios sensibles y definir retención/acceso antes de producción.
- Los visitantes solo reciben DTOs/campos de catálogo permitidos. No incluir precios ni datos comerciales privados en consultas, HTML, RSC payloads, metadatos, respuestas API, logs o bundles públicos. Proteger la consulta en servidor, no ocultar campos visualmente.
- Comprobar estado activo del cliente y permisos para precios, carrito, checkout e historial. No confiar solo en middleware o claims JWT potencialmente desactualizados.
- Mantener Prisma exclusivamente en servidor. Nunca exponer `SUPABASE_SERVICE_ROLE_KEY`, secretos de DB ni credenciales al cliente. Si Prisma conecta con rol privilegiado que omite RLS, la autorización de aplicación es obligatoria; RLS es defensa adicional, no sustituto.
- PWA: cachear solo shell y recursos públicos. No cachear respuestas privadas, precios, datos de sesión, clientes o pedidos en caches compartidos/offline. Respuestas privadas con directivas no-store; al salir o vencer sesión, limpiar cualquier almacenamiento privado local y volver a validar sesión antes de renderizar vistas privadas.
- Centralizar errores, autorización, auditoría y respuestas API; no filtrar secretos ni detalles internos.

## Integridad comercial

- Invitación aprobada: Admin copia el enlace de un solo uso y lo envía por WhatsApp. No modificar el TTL global de Auth hasta revisar efecto sobre recuperación de contraseña y otros flujos OTP.
- Los vencimientos automáticos requieren scheduler aprobado por disponibilidad, límites del plan, uso comercial, observabilidad, errores/reintentos, idempotencia, protección concurrente y recuperación de expiraciones omitidas. No activar ni contratar servicios.
- No hay auto-registro. La invitación la inicia Admin con enlace de un solo uso de 24 horas; técnico define su contraseña. Enlace vencido: Admin puede emitir otro. Nunca almacenar ni enviar contraseñas en texto plano. Supabase Auth debe configurarse y verificarse para TTL de 24 h.
- Usar migraciones Prisma versionadas, restricciones relacionales y transacciones; no depender de cambios manuales de producción ni de `db push` para desplegar.
- El stock nunca cambia sin movimiento persistente. No permitir saldos negativos. Registrar ajustes, recepciones, ventas, reservas, liberaciones, devoluciones y consumos; implementar concurrencia e idempotencia. No editar saldo directamente.
- Cuentas corrientes mediante historial inmutable de cargos/créditos y aplicaciones; jamás un campo editable de deuda. Corregir con reversos trazables.
- Separar estado del pedido, estado del pago y estado de cumplimiento/entrega. El navegador no puede fijar precios, totales ni estados financieros.
- Transferencia: reservar stock disponible al confirmar; vencimiento configurable en Admin con 24 horas iniciales y deadline guardado en cada pedido. Si no hay acreditación confirmada antes del deadline, cancelar y liberar automáticamente. Rechazar confirmación tardía aunque el scheduler esté atrasado. Expiración/liberación atómicas e idempotentes. No entregar/despachar sin acreditar salvo excepción autorizada por Administrador y auditada.
- Efectivo contra reembolso: retiro se cobra al retirar; envío se cobra al recibir. Se puede preparar/despachar con pago pendiente; el administrador registra el cobro. Cancelación administrativa libera la reserva cuando corresponda.
- El vencimiento configurado se captura al crear cada pedido y aplica a pedidos nuevos; los existentes conservan su deadline. Un proceso periódico reclama vencimientos con transición condicional/transacción y reintento seguro.
- Congelar en cada pedido snapshots de producto, SKU, descripción, cantidades, precios, descuentos, importes y datos necesarios del cliente/entrega. Los cambios futuros de catálogo no modifican pedidos históricos.
- Los pagos manuales y cambios de estado deben guardar actor, fecha, referencia y auditoría. No integrar pasarelas de pago hasta aprobación.
- Transferencia tardía asociada a pedido cancelado queda en conciliación manual; no reactiva pedido ni repone reserva. Solo Admin decide reembolso o creación de un pedido nuevo. COD no entregado se registra como incidencia y Admin decide reintento, devolución o cancelación.
- Pedido acreditado listo para retirar conserva stock reservado hasta entrega o cancelación autorizada; nunca liberar automáticamente. Crear avisos internos de retiro pendiente.
- Ventas originales son inmutables. Devoluciones/cancelaciones parciales generan documentos y movimientos compensatorios auditables; reembolsos son operaciones independientes enlazadas al pago original. Devolver stock solo tras inspección y confirmación de aptitud comercial. Operaciones financieras sensibles: autorización Admin y motivo obligatorio.
- Usar importes `numeric` con moneda explícita (inicialmente ARS) y cantidades con escala definida. No usar aritmética monetaria binaria sin control. Persistir timestamps UTC y presentar en zona horaria de negocio.

## Catálogo e imágenes

- El catálogo incluye título, descripción, SKU único, código de barras opcional, marca, categoría/subcategoría, compatibilidades/modelos, precio/costo restringidos, estado de publicación, disponibilidad comercial y galería con imagen principal.
- Shop contempla grilla, detalle/galería, búsqueda, filtros/ordenamiento, destacados/relacionados y carrito con cantidades; mantenerlo responsive/mobile-first. Catálogo público nunca entrega precios ni permite compra.
- Visitantes reciben solo campos públicos; nunca precio, costo ni datos comerciales privados en consultas, HTML/RSC, JSON, metadatos, búsqueda o caché. Precios y carrito requieren estado activo y validación/autorización server-side.
- Admin crea/edita, publica/oculta/desactiva, carga imágenes, cambia principal/orden, reemplaza y previsualiza antes de publicar. Importar/exportar CSV/Excel es funcionalidad planificada, no implementada.
- Primera carga solo desde archivos obtenidos de fuentes autorizadas y subidos por Admin. No descargar ni importar automáticamente imágenes desde URLs externas (incluida Mercado Libre) hasta revisar derechos, accesibilidad y SSRF.
- Importaciones futuras primero validan archivo/filas/SKU/referencias y muestran preview/errores; nunca alteran stock sin movimientos. Exportación de costo/precio exige permiso y neutralización de fórmulas CSV.
- Inventario se modifica únicamente mediante movimientos históricos transaccionales; el formulario de producto no puede editar cantidad disponible directamente.
- Aceptar WEBP, JPG/JPEG y PNG; validar bytes reales/formato, tamaño, dimensiones y límites configurados antes de decodificar. Mantener proporciones, no deformar ni recortar por defecto y no imponer los tamaños de referencia (1200, 400, 160) como límites; son cajas guía de salida.
- Procesar en adaptador del servidor con formatos/variantes versionados. Quitar metadata innecesaria (incluida geolocalización), corregir orientación y preservar perfil de color si se necesita fidelidad. Conservar original privado para reproceso. No convertir WEBP adecuado sin motivo; AVIF queda sujeto a compatibilidad/rendimiento.
- Detectar duplicados exactos por hash; detección visual aproximada requiere revisión humana. Usar UUID/revisiones en rutas, nunca nombre de archivo aportado como path confiable.
- Separar originales/previsualizaciones privados de derivados publicados. Archivos públicos solo contienen imágenes de catálogo que se aprobaron para publicación; una URL pública puede permanecer en cachés y no garantiza revocación instantánea.
- Storage y DB no comparten transacción: aplicar estado de procesamiento, idempotencia y cola/outbox/reconciliación para reemplazos y borrado; no dejar archivos huérfanos. Usar API de Storage, no borrar objetos editando metadatos/tablas SQL. No exponer claves service-role.
- Listados usan miniaturas con lazy loading, tamaños explícitos y carga adaptable móvil; detalle carga tamaño mayor al necesitarlo. Cachear recursos públicos/versionados; nunca cachear datos privados ni precios restringidos.
- Supabase Storage y transformaciones tienen límites/costos cambiantes. No habilitar Image Transformations pagas ni almacenamiento adicional sin autorización; consultar cuota restante y condiciones antes de producción.

## Calidad y entregas

- Seguir la etapa acordada: análisis, dependencias, propuesta, implementación, pruebas solicitadas, corrección y documentación.
- Informar qué validaciones se ejecutaron y sus resultados; no afirmar pruebas inexistentes.
- Mantener README y documentación alineados con el estado real del producto.
- Antes de cerrar etapa, resumir cambios, decisiones, riesgos y pendientes.
