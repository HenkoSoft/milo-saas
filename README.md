# Milo Store

Milo Store V1 es exclusivamente una tienda mayorista de repuestos y productos para celulares. El catálogo público no muestra precios. Los clientes mayoristas aprobados y activos pueden ver precios y comprar.

## Estado

El proyecto permanece en etapa de documentación. La documentación de V1 está pendiente de aprobación personal del usuario. No iniciar desarrollo hasta recibir aprobación explícita.

## Alcance de V1

- Administrador y clientes mayoristas autorizados; sin autorregistro.
- Solicitud de acceso y aprobación manual.
- Catálogo público sin precios y precios mayoristas privados para clientes activos.
- Productos con SKU, nombre, descripción, fotos, categoría, marca y publicación.
- Búsqueda básica, ficha de producto y lista general de precios mayoristas.
- Inventario sencillo: entradas, salidas y ajustes registrados. El stock nunca puede ser negativo.
- Carrito y pedidos online; administración básica de productos, clientes y pedidos.
- Transferencia y efectivo con registro y confirmación manual.
- Contacto directo por WhatsApp Business.
- Diseño mobile-first. PWA instalable solo si no agrega complejidad significativa.

La operación inicial es en Argentina, en ARS, español y zona `America/Argentina/Buenos_Aires`, con una organización, sucursal y depósito.

## Tecnologías

Next.js, TypeScript estricto, Supabase PostgreSQL/Auth/Storage, Prisma ORM Community, Tailwind CSS, shadcn/ui, Zod y GitHub. Docker y Docker Compose son opcionales para desarrollo local. No cambiar el stack ni contratar/activar servicios pagos sin autorización.

No hay comandos de instalación o ejecución: todavía no existe aplicación ni scaffold. No se deben crear hasta la aprobación de la documentación y autorización de inicio.

## Seguridad e integridad

Validar entradas y autorizar cada operación en servidor. Denegar por defecto y comprobar que el cliente esté activo. Visitantes nunca reciben precios/costos en consultas, HTML, metadatos, respuestas ni caché. Mantener Prisma y secretos solo en servidor. Registrar todo movimiento de stock y evitar saldos negativos. Calcular precios y totales en servidor con importes decimales y moneda explícita. Si se desarrolla una PWA, cachear solo recursos públicos.

## Posibilidades futuras

Funciones fuera de V1 podrían evaluarse más adelante por decisión del propietario. No forman parte de esta versión ni se diseñan anticipadamente.

## Documentación

- [Instrucciones permanentes](AGENTS.md)
- [Arquitectura](docs/ARCHITECTURE.md)
- [Roadmap](docs/ROADMAP.md)
- [Diseño conceptual de datos](docs/DATABASE.md)
- [Registro de decisiones](docs/DECISIONS.md)
