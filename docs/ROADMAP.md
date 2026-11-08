# Roadmap de Milo Store V1

El roadmap cubre exclusivamente la tienda mayorista descrita en esta documentación. Las etapas requieren revisión y aprobación personal antes de iniciar desarrollo. No crear scaffold, instalar dependencias ni configurar servicios antes de esa aprobación.

## 1. Preparación y aprobación

**Objetivo:** aprobar alcance, decisiones, seguridad y dependencias.

**Criterios de finalización:** seis documentos coherentes y aprobados; criterios de V1 aceptados; decisiones pendientes identificadas; costos y condiciones comerciales evaluados; autorización explícita para iniciar desarrollo.

## 2. Base técnica y acceso

**Objetivo:** establecer la aplicación y autenticación para Administración y clientes mayoristas.

**Criterios de finalización:** entorno mínimo con stack acordado; variables secretas fuera del cliente/repositorio; login/logout; creación y aprobación administrativa de clientes; sin autorregistro; autorización server-side; migraciones Prisma versionadas. Docker/Compose opcionales.

## 3. Productos, clientes y catálogo

**Objetivo:** habilitar la gestión administrativa y la consulta del catálogo.

**Criterios de finalización:** solicitud de acceso pública sin crear cuenta; aprobación manual; productos con SKU, nombre, descripción, fotos, categoría, marca y publicación; búsqueda básica y ficha; visitantes reciben solo datos públicos, sin precios.

## 4. Precios e inventario

**Objetivo:** habilitar consulta de precios para clientes autorizados y mantener existencias confiables.

**Criterios de finalización:** lista general mayorista; precio solo con autorización y cuenta activa; entradas, salidas y ajustes con movimientos registrados; saldo nunca negativo; sin edición directa de saldo; operaciones transaccionales.

## 5. Carrito y pedidos

**Objetivo:** permitir compras online a clientes mayoristas activos.

**Criterios de finalización:** carrito; precio y total calculados en servidor; confirmación de pedido; estados e historial básicos; administración de pedidos; registro histórico suficiente para preservar el detalle comprado.

## 6. Pagos y gestión administrativa

**Objetivo:** registrar pagos manuales y cerrar el flujo de venta.

**Criterios de finalización:** transferencia y efectivo; administración registra y confirma manualmente; estado de pago separado del estado del pedido; actor, fecha, importe y moneda registrados; sin integración automática de pagos.

## 7. Validación funcional y seguridad

**Objetivo:** verificar criterios funcionales, privacidad e integridad.

**Criterios de finalización:** revisar permisos y acceso por estado de cuenta; confirmar que precios no aparecen en respuestas públicas; verificar movimientos y prohibición de stock negativo; revisar manejo de secretos y caché privada; informar únicamente validaciones ejecutadas.

## 8. Publicación comercial

**Objetivo:** preparar una operación apta para uso comercial.

**Criterios de finalización:** hosting compatible con uso comercial elegido y autorizado; límites y costos revisados; respaldo/restauración y acceso operativo definidos; cuotas y condiciones de Supabase verificadas; aprobación expresa para publicar. No asumir que un plan gratuito es apto para producción.

## Fuera de V1

Las funciones excluidas quedan fuera del roadmap de implementación de V1. Podrán reconsiderarse en otra etapa mediante una decisión expresa; no se diseñan ni implementan ahora.
