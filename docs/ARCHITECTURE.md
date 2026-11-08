# Arquitectura de Milo Store V1

## Alcance

V1 es una tienda mayorista B2B de repuestos y productos para celulares. La aplicación incluye administración y tienda mobile-first. Visitantes consultan catálogo sin precios y solicitan acceso; únicamente clientes mayoristas aprobados y activos pueden consultar precios y generar pedidos.

La documentación está pendiente de aprobación del usuario. No crear scaffold, código, tablas, migraciones ni configuración.

## Stack acordado

- Next.js y TypeScript estricto.
- Supabase PostgreSQL, Supabase Auth y Supabase Storage.
- Prisma ORM Community.
- Tailwind CSS, shadcn/ui y Zod.
- GitHub.
- Docker/Docker Compose opcionales para desarrollo local.

No cambiar tecnologías ni incorporar servicios pagos sin autorización. Configuración inicial: Argentina, ARS, español, `America/Argentina/Buenos_Aires`, una organización, una sucursal y un depósito.

## Límites de aplicación

```text
Navegador / tienda
  ├─ Catálogo público: campos aprobados, sin precios
  ├─ Tienda privada: cliente activo, precios y pedidos propios
  └─ Administración: clientes, productos, inventario y pedidos
          ↓
  Entradas Next.js: validación + sesión + autorización server-side
          ↓
  Casos de uso y reglas de negocio compartidos
          ↓
  Adaptadores: Prisma/PostgreSQL, Supabase Auth y Supabase Storage
```

Las rutas, Server Actions y componentes presentan o reciben operaciones; las reglas comerciales se resuelven en casos de uso server-side. Mantener una aplicación modular sencilla, sin microservicios ni abstracciones anticipadas.

## Módulos de V1

- **Acceso y clientes:** solicitud pública sin autorregistro, aprobación manual y cuentas de clientes mayoristas.
- **Catálogo:** SKU único, nombre, descripción, fotos, categoría, marca y estado de publicación.
- **Precios:** una lista general mayorista, visible solo para clientes autorizados y activos.
- **Inventario:** entradas, salidas y ajustes registrados; movimientos históricos; stock no negativo.
- **Tienda:** catálogo público sin precio, búsqueda básica, ficha, carrito y pedidos online.
- **Administración:** gestión básica de productos, clientes, pedidos y confirmación manual de pagos.
- **Contacto y experiencia:** WhatsApp Business, diseño mobile-first; PWA solo si su instalación no agrega complejidad significativa.

## Autorización y privacidad

Roles de V1: Administrador y cliente mayorista autorizado. No hay autorregistro. Toda operación comprueba sesión, estado activo, permiso y pertenencia en servidor; denegar por defecto. Validar entradas externas con Zod en servidor.

El catálogo público debe usar consultas/DTOs que no seleccionen ni serialicen precios o costos. Proteger también HTML, RSC, metadatos, respuestas de búsqueda, logs y cachés. Datos privados con `no-store`. Prisma solo se ejecuta en servidor; no exponer secretos, credenciales ni service role. Si la conexión de base omite RLS, la autorización de aplicación sigue siendo obligatoria.

Tratar datos de contacto como personales, reducir su recolección y restringir su acceso. Definir retención y acceso antes de producción. No almacenar contraseñas en texto plano. La PWA, si se incorpora, cachea únicamente shell y recursos públicos, nunca precios, sesiones, clientes, carrito u órdenes.

## Integridad comercial

- Migraciones Prisma versionadas, claves foráneas, restricciones y transacciones; no usar `db push` como despliegue.
- Cada entrada, salida o ajuste de inventario genera un movimiento persistente. El saldo no se edita directamente y nunca puede ser negativo.
- Precio y total se calculan en servidor; no confiar en valores enviados por el navegador.
- Mantener separados el estado de pedido y el de pago. Los registros de pago manual incluyen actor, fecha, importe, moneda y referencia disponible.
- Usar importes decimales con moneda explícita (ARS), timestamps UTC y presentación en la zona de negocio.
- Conservar pedidos y movimientos registrados; corregir mediante registros trazables.

## Evolución

La arquitectura no diseña módulos futuros. Cualquier función fuera de la tienda mayorista definida para V1 requiere una decisión posterior y no amplía el alcance actual.
