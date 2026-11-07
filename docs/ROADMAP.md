# Roadmap de desarrollo

Las reglas B2B, accesos y flujos de pedido preceden a la exposición de precios o ventas. Por etapa: análisis de requerimientos, dependencias, propuesta/casos de aceptación, implementación, pruebas, corrección de errores críticos y documentación. No avanzar de etapa con fallas críticas de seguridad o integridad.

## Etapa 0 — Decisiones y cimientos (pendiente de aprobación)

- Revisar matriz de permisos; confirmar TTL efectivo de Auth sin cambiar OTP global y validar justificativo/retención de DNI.
- Elegir scheduler fiable para cancelación cada pocos minutos, monitorizar fallos y verificar costo/uso comercial; sin activar pagos.
- Definir estrategia de entornos, backups y destino comercial compatible; no contratar servicios.
- Solo tras aprobación: scaffold Next.js, TypeScript estricto, gestor de paquetes, lint, Tailwind/shadcn, Zod, variables de entorno, Prisma y migraciones iniciales.

**Salida:** base reproducible y segura, sin datos de producción ficticios.

## Etapa 1 — Acceso, clientes y privacidad

Supabase Auth, perfil interno, formulario público de solicitud sin auto-registro, revisión manual y enlace de invitación de un solo uso de 24 h enviado manualmente por WhatsApp. Exigir contraseña propia, estado activo/suspendido/desactivado, matriz RBAC y autorización por caso de uso. Excluir DNI hasta justificar y aprobar su necesidad. Validar teléfono con regla de 10 dígitos y metadata argentina mantenida; normalizar/deduplicar email; aplicar rate-limit y controles antiabuso sin servicio pago. Separar consultas públicas/privadas y evitar fuga de precios en HTML, RSC, JSON o búsqueda. TTL Auth 24 h se verifica sin alterar configuración global hasta evaluar OTP.

## Etapa 2 — Catálogo y PWA pública

Catálogo visual público con productos/categorías/marcas/compatibilidad, cuadrícula, página de detalle/galería, búsqueda, filtros/orden, destacados/relacionados y ficha pública sin precio. Admin: CRUD de producto, publicación/ocultamiento/desactivación y gestión de galería/principal/orden/reemplazo/previsualización. Procesador de imágenes en servidor: validación WEBP/JPG/PNG, originales privados, variantes con proporción preservada, metadata saneada, hash de duplicados y limpieza idempotente en Storage. Variantes de 1200/400/160 px como objetivos, no máximos ni dimensiones obligatorias. Optimizar imágenes mobile-first (lazy, tamaños explícitos, miniaturas/srcset), caché solo para assets publicados y nunca precios privados. Completar PWA (manifest/iconos/shell) y verificar logout antes de habilitar datos privados. Importar/exportar CSV/Excel queda planificado para alcance futuro; importar imágenes desde URLs externas requiere investigación separada y no se incluye en esta etapa.

## Etapa 3 — Ubicaciones e inventario

Una sucursal/depósito inicial con esquema de múltiples ubicaciones. Ledger de entradas, salidas, ajustes, reservas, liberaciones y devoluciones; disponible = físico − reservado y nunca negativo. Stock no negativo, idempotencia, concurrencia y reconciliación antes de conectar ventas/compras.

## Etapa 4 — Compras, proveedores y POS

Proveedores, compras/recepciones parciales según regla acordada, costos, ventas de mostrador, caja y cobros. Toda recepción/venta actualiza ledger atómicamente.

## Etapa 5 — Pedidos B2B, pagos y entrega

Carrito solo para técnico activo; pedido con snapshot y numeración. Reservar inventario al confirmar cualquiera de los métodos. Transferencia: deadline por pedido de 24 h inicial configurable para pedidos nuevos, cancelación automática y liberación segura sin acreditación antes del vencimiento; rechazar confirmación tardía y no entregar/despachar antes de acreditar salvo excepción Admin auditada. Efectivo contra reembolso: cobro al retirar/recibir, despacho permitido con pago pendiente y cobro registrado por Admin. Registrar pagos tardíos en conciliación manual; COD no entregado como incidencia Admin; alertas internas para pedidos listos para retirar sin auto-liberar stock. Añadir devoluciones/reembolsos y cancelaciones parciales con movimientos compensatorios, inspección de producto y autorización. Scheduler seguro, observable e idempotente. No integrar pasarela ni notificaciones externas pagas.

## Etapa 6 — Cuentas corrientes y reparaciones

Libros históricos de cargos/pagos/créditos, aplicaciones/reversos; reparaciones, seguimiento, autorización, consumo de repuestos y cobro enlazado al ledger.

## Etapa 7 — Reportes, robustez y producción

Reportes reconciliables, auditoría, accesibilidad, rendimiento, revisión de seguridad, prueba de restauración, monitoreo de límites/costos y despliegue solo con proveedor y presupuesto compatibles aprobados.

## Dependencias / puertas

- Autorización, estado de cuenta y filtrado de precio antes de mostrar precios.
- Ledger y política de stock antes de pedidos, POS, compras o reparaciones con piezas.
- Reglas de reserva antes de confirmar compras online.
- Job recurrente/seguro para vencimientos antes de habilitar pedidos por transferencia; alertas, retries e idempotencia verificados.
- Caja/cuenta corriente antes de contabilizar cobros o saldos.
- Política de datos personales/retención y necesidad del DNI antes de producción.
- Notificación interna se persiste junto con la confirmación de pedido, con idempotencia para evitar duplicados.
