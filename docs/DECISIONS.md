# Registro de decisiones

**Acordado** indica una regla aprobada por el propietario. **Propuesto** describe un diseño por revisar. **Pendiente** requiere una decisión o verificación adicional. Ninguna entrada autoriza el scaffold ni el desarrollo.

## D-001 — Arquitectura y stack

- **Estado:** Acordado.
- Una aplicación Next.js modular contiene Milo Store Admin y Milo Store Shop; comparten casos de uso, políticas comerciales y datos. Sin backend separado ni microservicios iniciales.
- Stack: Next.js, TypeScript, PostgreSQL/Supabase, Prisma ORM Community, Supabase Auth/Storage, Tailwind, shadcn/ui, Zod y GitHub. Vercel u otro hosting compatible comercial, por decidir; Docker opcional en local.

## D-002 — Mercado, región y PWA

- **Estado:** Acordado.
- Venta mayorista B2B privada a técnicos aprobados manualmente. El público ve catálogo sin precios y puede solicitar acceso/contactar por WhatsApp. Solo técnicos activos ven precios y compran.
- Argentina, ARS, español, `America/Argentina/Buenos_Aires`; una sucursal/depósito inicial, extensible; stock no negativo.
- Shop mobile-first como PWA instalable. Cachear solo shell/recursos públicos; no-cache/no-store en datos privados. Admin principalmente de escritorio y responsive.

## D-003 — Invitaciones de técnicos

- **Estado:** Acordado; configuración efectiva pendiente de verificación.
- Admin crea el perfil y el sistema genera invitación de un solo uso, válida 24 horas. Técnico establece su propia contraseña. Si expira, Admin genera una nueva. Nunca almacenar ni enviar contraseñas en texto plano.
- Canal inicial aprobado: Admin copia el enlace de invitación y lo envía manualmente por WhatsApp. El enlace bearer se muestra una sola vez, no se guarda en logs/telemetría y se limita su redirect.
- Supabase Auth usa un ajuste Email OTP Expiration compartido con otros enlaces OTP; su valor por defecto documentado es una hora. Verificar que permita 24 horas y analizar recuperación de contraseña/magic links antes de configurar. No alterar configuración global sin ese análisis.
- Fuente revisada: [Supabase Auth — Users and invitations](https://supabase.com/docs/guides/auth/users).

## D-004 — Solicitudes de acceso y datos personales

- **Estado:** Flujo de revisión manual y reglas de teléfono aprobados; lista de campos es propuesta y DNI queda expresamente pendiente de justificar.
- Visitante puede enviar una solicitud, sin crear usuario/Auth ni habilitar precios. Admin revisa y puede aprobar, rechazar o pedir correcciones. Solo tras aprobación se emite invitación. Encargado puede revisar/recomendar, no decidir ni crear cuenta.
- Campos iniciales: nombre y apellido, teléfono/WhatsApp, email, localidad/provincia y actividad comercial. **No solicitar ni guardar DNI** hasta que se apruebe y documente necesidad legal, comercial u operativa.
- Teléfono argentino: exactamente 10 dígitos nacionales, sin +54, 0 inicial, 15, espacios, guiones ni paréntesis; código de área incluido. Validar longitud/formato separado de numeración asignable y titularidad. ENACOM define el Plan Fundamental de Numeración Nacional (PFNN) y sus parámetros; usar metadatos telefónicos mantenidos para validar números, no solo regex. `libphonenumber-js` es candidato, no dependencia elegida; revisar mantenimiento/licencia/cobertura al iniciar.
- Normalizar email con regla coherente; trim, dominio IDNA/case-folded, no quitar puntos ni `+tag`; deduplicar solicitudes activas y verificar cuentas/clientes antes de aprobar. Frontend + servidor + restricción DB cuando corresponda.
- Datos personales: acceso mínimo, separación de identidad/contacto/entrega/facturación, DNI restringido/no público, auditoría de cambios sensibles y reglas de retención/acceso/eliminación antes de producción. Titularidad telefónica por SMS/WhatsApp no verificada todavía y requiere decisión de costo/proveedor.
- Fuentes: [ENACOM — Numeración](https://www.enacom.gob.ar/numeracion_p136), [Plan Fundamental de Numeración Nacional](https://www.enacom.gob.ar/multimedia/noticias/archivos/201911/archivo_20191107115949_4561.pdf), [libphonenumber-js](https://github.com/catamphetamine/libphonenumber-js), [Argentina.gob.ar — datos personales](https://www.argentina.gob.ar/node/130907), [Ley 25.326](https://www.argentina.gob.ar/sites/default/files/arg_ley25326.pdf).

## D-005 — Autorización y permisos

- **Estado:** Roles acordados; matriz detallada documentada en `docs/ARCHITECTURE.md` para revisar durante análisis del módulo.
- Administrador, Encargado, Vendedor, Técnico y Cliente con mínimo privilegio. Autorización siempre server-side y denegada por defecto; verificar propiedad/estado de cuenta además del rol.
- Admin retiene aprobación de excepciones de entrega, confirmación de transferencias, registro de cobros COD, reembolsos/correcciones financieras, cancelaciones administrativas, ajustes sensibles y conciliación de pagos tardíos. Motivo obligatorio y auditoría en acciones sensibles.

## D-006 — Pedidos, pagos y stock reservado

- **Estado:** Acordado.
- Toda orden confirmada reserva stock disponible. Pedido, pago y estado de entrega son independientes. Guardar snapshots históricos y recalcular precio/total exclusivamente en servidor.
- Transferencia: plazo inicial 24 h configurable desde Admin; guardar deadline por pedido, y cambios aplican a pedidos nuevos. Si no hay acreditación confirmada antes del plazo (también pago rechazado), cancelar y liberar reserva automáticamente. Confirmación posterior al plazo se rechaza aunque scheduler esté atrasado. No entregar/despachar/permitir retiro hasta acreditar, salvo excepción Admin auditada.
- Efectivo contra reembolso: pagar al retirar o recibir. Se puede preparar/despachar pendiente; Admin registra el cobro. Admin puede cancelar y liberar reserva si corresponde. No hay auto-cancelación por impago.
- Transferencia recibida tras cancelar: registro separado en conciliación manual; no reactivar pedido ni reservar stock. Admin decide reembolso o crear otro pedido, con auditoría.
- Pedido acreditado listo para retirar: conserva reserva indefinidamente hasta retiro/resolución Admin; aviso interno persistente, sin liberación automática.
- COD no entregado: incidencia de entrega; Admin decide reintentar, devolver o cancelar. No liberar stock solo por intento fallido.
- Scheduler: Supabase Cron queda como candidato, no decisión final. Requisitos de disponibilidad/límites verificados, uso comercial, ejecución fiable y observable, errores/reintentos, idempotencia, concurrencia protegida y detección/recuperación de expiraciones pendientes. No activar servicios pagos.

## D-007 — Devoluciones, cancelaciones parciales y reembolsos

- **Estado:** Acordado.
- Nunca borrar ni alterar destructivamente venta/pedido original. Devolución parcial registra productos, cantidades, importes, motivo, actor y fecha en un documento vinculado.
- Reembolso es operación separada ligada al pago original. Cancelaciones parciales crean movimientos compensatorios enlazados y preservan historial.
- Stock devuelto solo vuelve a disponible tras inspección y confirmación de que es apto para la venta; producto pendiente de inspección no incrementa stock disponible.
- Operaciones financieras sensibles requieren autorización Admin, motivo obligatorio y auditoría.

## D-008 — PWA y datos privados

- **Estado:** Acordado.
- No registrar cuentas desde la tienda, no servir precios a visitantes. Separar DTOs públicos y privados.
- Sesión expirada/logout limpia datos privados locales; service worker no cachea precios, credenciales, datos personales, pedidos, carritos privados ni respuestas autenticadas.

## D-009 — Costos y proveedores

- **Estado:** Restricción de costos acordada; proveedor de producción y scheduler pendientes.
- Vercel Hobby no admite uso comercial y cron Hobby solo corre una vez por día con ventana imprecisa; no sirve para producción de tienda ni vencimientos oportunos. Supabase Cron/pg_cron es candidato, sujeto a verificar plan, cuotas, confiabilidad y uso comercial. Supabase Free tiene límites y no incluye backups automáticos. No contratar ni activar gastos sin autorización.
- Fuentes revisadas: [Vercel Fair Use](https://vercel.com/docs/limits/fair-use-guidelines), [Vercel Cron](https://vercel.com/docs/cron-jobs/manage-cron-jobs), [Supabase Cron](https://supabase.com/docs/guides/cron), [Supabase Pricing](https://supabase.com/pricing).

## D-010 — Licencias

- **Estado:** Auditoría pendiente al fijar dependencias.
- Revisar licencias, uso comercial, dependencias transitivas, assets, fuentes y plantillas. `libphonenumber-js` solo candidato hasta analizarlo al implementar. No asumir que assets/blocks de terceros son libres.

## D-011 — Catálogo visual B2B y administración

- **Estado:** Requisitos funcionales acordados; estados/semántica de algunos campos por diseñar.
- Producto incluye título, descripción, SKU único, barcode opcional, marca, categoría/subcategoría, compatibilidades/modelos, precio/costo con permiso restringido, estado de publicación, disponibilidad comercial y galería/imagen principal.
- Shop tendrá cuadrícula, detalle, galería, búsqueda, filtros, orden, destacados/relacionados, carrito/cantidades, mobile-first. Visitantes solo reciben campos públicos; precio, carrito y compra requieren usuario activo y autorización server-side. No se filtran precios en API, HTML, datos serializados o caché.
- Admin crea/edita, publica/oculta/desactiva, carga múltiples imágenes, fija principal, ordena, reemplaza y previsualiza antes de publicar. Cambios de existencias solo por ledger de movimientos.
- Importación/exportación CSV y Excel es una **funcionalidad planificada**, no parte ya implementada ni decisión de formatos/plantillas.

## D-012 — Imágenes de catálogo y almacenamiento

- **Estado:** Requisitos funcionales acordados; procesador, límites internos y operación por definir.
- Entrada: WEBP, JPG/JPEG y PNG. Validar bytes/formato real, dimensiones y tamaño. Redimensionar preservando proporción, sin deformar ni recortar contenido importante; comprimir con calidad revisable; limpiar metadata innecesaria; generar versiones para catálogo/detalle/miniatura; detectar duplicados; conservar originales para reproceso; reemplazar y borrar sin huérfanos.
- 1200×1200 (principal/galería), 400×400 (catálogo) y 160×160 (miniatura) son referencias de variantes, no límites obligatorios ni recorte cuadrado. No convertir WEBP adecuado sin motivo. WebP/AVIF se elige según compatibilidad/rendimiento; AVIF requiere evaluación.
- **Propuesta técnica:** servicio/adaptador de procesamiento en el servidor de la aplicación monolítica (no microservicio), `sharp` candidato sujeto a runtime y auditoría de licencias transitivas. Buckets separados: original privado/staging privado y derivados de productos publicados en bucket público. Hash de contenido para duplicados exactos y flujo versionado/outbox para publicación, reemplazo, borrado y reconciliación. Confirmar derechos de acceso a objeto público: URL pública no equivale a contenido revocable al instante.
- Supabase Storage Free publica 1 GB de almacenamiento y 50 MB de máximo global por archivo; Image Transformations no está incluido en Free y está disponible en Pro+ con tarifa por imágenes de origen. No usar transformación paga, activar upgrade ni overage sin aprobación; procesar variantes estáticas del lado de la aplicación u opción Open Source/local compatible.
- Fuentes oficiales revisadas: [Storage buckets y acceso](https://supabase.com/docs/guides/storage/buckets/fundamentals), [cuotas/plan](https://supabase.com/docs/guides/platform/billing-on-supabase), [límites de carga](https://supabase.com/docs/guides/storage/uploads/file-limits), [transformaciones de imagen](https://supabase.com/docs/guides/storage/serving/image-transformations), [procesador candidato Sharp](https://sharp.pixelplumbing.com/api-output/).

## D-013 — Ingreso de imágenes y rendimiento

- **Estado:** Primera modalidad acordada; automatizaciones pendientes.
- Primera modalidad: descargar imagen de una fuente autorizada y subir el archivo por Admin. No asumir permiso por ser accesible públicamente.
- Importación automática desde URLs externas (incluyendo Mercado Libre) queda pendiente de investigar derechos de uso, accesibilidad/estabilidad y protección SSRF. No implementarla ahora.
- Carga diferida de imágenes no visibles, miniaturas en grilla, imagen grande al abrir detalle, dimensiones explícitas para evitar layout shift, ajuste mobile-first y caché por versión/hash solo de imágenes públicas aprobadas. No cachear precios ni datos privados.

## Pendientes antes de producción

- Verificación efectiva y efectos colaterales del TTL Auth de 24 h; configuración externa no modificada en esta etapa.
- Selección de scheduler comercialmente compatible, sin costo no autorizado, con frecuencia/alerta objetivo.
- Justificación legal/comercial del DNI (no recolectar mientras esté pendiente), retención general, derechos de titulares, controles de acceso y posible consulta legal sobre Ley 25.326.
- Proveedor de hosting de producción, backup/restore, RPO/RTO, seguridad operacional.
- Reintento COD, devolución del paquete y destinos de inventario; costos/política fiscal y cancelaciones posteriores al despacho.
- Reglas exactas de unicidad email/teléfono, frecuencia/umbral de recordatorio de retiro y quién puede ver datos personales según roles.
- Umbrales y mecanismo antispam/rate-limit para el formulario público, con retención mínima de IP y sin servicio pago no autorizado.
- Definir estados exactos de publicación/disponibilidad comercial, jerarquía de categorías, regla de SKU por organización y regla de unicidad de barcode.
- Confirmar límites de subida propios (bytes, dimensiones/píxeles, timeout), cuota/alertas/retención de originales en Storage y procedimiento de limpieza/reconciliación.
- Evaluar runtime y licencia completa de procesador de imagen (incluidas dependencias nativas); benchmarks de calidad/tamaño y compatibilidad WebP/AVIF, transparencias y EXIF/ICC.
- Cerrar mapeo CSV/Excel, vista previa y permisos de import/export; mantenerlo como fase futura. Investigar derechos, disponibilidad y SSRF antes de cualquier importación por URL.

Esta documentación no autoriza scaffold, instalación de dependencias, migraciones ni implementación.
