# Milo Store

Sistema de gestión comercial para un negocio argentino de venta mayorista de repuestos y reparación de celulares. Incluye **Milo Store Admin** y **Milo Store Shop**, una tienda B2B privada para técnicos autorizados manualmente. Visitantes pueden ver el catálogo informativo y contactar al negocio por WhatsApp, pero no consultar precios ni comprar.

## Estado del repositorio

Etapa de definición arquitectónica. El repositorio no contiene aplicación ejecutable, scaffold, dependencias ni módulos de negocio. Los documentos actuales expresan decisiones acordadas y propuestas, no controles ya implementados.

## Stack acordado

Next.js, TypeScript, PostgreSQL mediante Supabase, Prisma ORM Community, Supabase Auth y Storage, Tailwind CSS, shadcn/ui y Zod. GitHub para código; Vercel u otro destino compatible con uso comercial está pendiente. Docker es opcional para desarrollo local.

Configuración inicial: Argentina, ARS, español y `America/Argentina/Buenos_Aires`; una sucursal y un depósito, con esquema extensible. Tienda mobile-first como PWA; administración enfocada en PC con soporte responsive.

## Reglas comerciales aprobadas

- Acceso de técnicos solo por invitación administrativa de un solo uso, válida 24 horas; la persona establece su propia contraseña.
- Transferencia: reserva al confirmar; plazo inicial de acreditación de 24 horas, configurable desde Admin. Si no se acredita al vencer, se cancela automáticamente y se libera el stock.
- Efectivo contra reembolso: pago al retirar en local o al recibir el envío. Se permite preparar/despachar con pago pendiente; el administrador registra el cobro.
- Transferencias no acreditadas impiden entregar o despachar. Excepciones requieren autorización de Administrador y auditoría.
- El enlace de invitación se entrega manualmente: Admin lo copia y lo envía por WhatsApp; dura 24 horas y se usa una vez.
- Solicitudes públicas de acceso quedan pendientes de revisión humana. No crean cuentas automáticamente; no se solicita DNI hasta aprobar su justificación.
- La solicitud valida teléfono argentino nacional de 10 dígitos y email; la validación telefónica contra el plan vigente es distinta de verificar la titularidad.
- Una transferencia tardía de un pedido cancelado pasa a conciliación manual. Un COD no entregado se registra como incidencia; pedidos listos para retirar conservan el stock hasta la entrega o resolución manual.
- Devoluciones/reembolsos y cancelaciones parciales conservan documentos originales y requieren trazabilidad; el stock devuelto vuelve a disponible solo tras comprobar que es apto para venta.

## Catálogo e imágenes

El catálogo B2B tendrá grilla, ficha, galería, búsqueda, filtros, orden, destacados/relacionados y carrito responsive. Visitantes ven solo datos públicos; precios y compra requieren cliente activo verificado en servidor. Admin administrará productos e imágenes, con vista previa antes de publicación. Importación/exportación CSV y Excel están planificadas.

Se aceptarán WEBP, JPG/JPEG y PNG con validación y procesamiento controlado. Supabase Storage separará originales privados y derivados públicos aprobados. Los tamaños 1200, 400 y 160 px son referencias de variantes, no límites fijos ni recortes obligatorios. Cuotas, formato final y límites de carga deben cerrarse antes de producción. Revisa [arquitectura](docs/ARCHITECTURE.md), [base de datos](docs/DATABASE.md) y [decisiones](docs/DECISIONS.md).

La revisión actual de Supabase publica 1 GB de Storage en Free, 50 MB como límite global máximo por archivo y no incluye Image Transformations en ese plan. No usar transformaciones administradas de pago ni asumir que la cuota alcanza para conservar originales y derivados de producción; monitorizar volumen y revalidar cuotas antes de operar.
- Ver [matriz de permisos y arquitectura](docs/ARCHITECTURE.md) y [flujos/datos](docs/DATABASE.md).

## Documentación

- [Arquitectura](docs/ARCHITECTURE.md)
- [Roadmap](docs/ROADMAP.md)
- [Diseño inicial de datos](docs/DATABASE.md)
- [Decisiones técnicas](docs/DECISIONS.md)
- [Instrucciones permanentes para Codex](AGENTS.md)

## Instalación y ejecución

No existen todavía comandos de instalación/ejecución, porque el usuario indicó no crear scaffold ni instalar dependencias en esta etapa. Se definirán al aprobar e inicializar el proyecto. El desarrollo y las primeras verificaciones serán locales. No poner credenciales reales en el repositorio; documentar variables en `.env.example` con valores vacíos al crear el scaffold.

## Costos y uso comercial

No contratar servicios ni activar facturación automática sin autorización. Los planes gratuitos tienen cuotas, límites y cambios de condiciones. Vercel Hobby no permite uso comercial según sus [Fair Use Guidelines](https://vercel.com/docs/limits/fair-use-guidelines); por ello no es destino válido para publicar esta tienda comercial bajo ese plan. El destino de producción queda pendiente de evaluación y autorización. Supabase Free sirve para prototipos dentro de sus límites, pero no incluye backups automáticos y puede pausar proyectos inactivos; verificar continuidad, límites y recuperación antes de alojar operación real.

Ver `docs/DECISIONS.md` para condiciones revisadas y pendientes. Revalidar términos, cuotas, licencias y costo total antes de cada despliegue o integración. No asumir que un servicio gratuito permite uso comercial.
