# Instrucciones permanentes para Codex

## Producto y alcance

Milo Store V1 es exclusivamente una tienda mayorista B2B de repuestos y productos para celulares. Visitantes pueden consultar el catálogo sin precios y solicitar acceso. Solo clientes mayoristas aprobados y activos pueden ver precios y comprar.

El alcance documental queda pendiente de aprobación personal del propietario. No iniciar desarrollo, scaffold, dependencias, migraciones ni configuración hasta recibir esa aprobación explícita. En tareas documentales, modificar solo los documentos solicitados.

Configuración: Argentina, ARS, español, `America/Argentina/Buenos_Aires`, una organización, una sucursal y un depósito inicial.

## Tecnologías acordadas

- Next.js y TypeScript estricto.
- Supabase PostgreSQL, Supabase Auth y Supabase Storage.
- Prisma ORM Community.
- Tailwind CSS, shadcn/ui y Zod.
- GitHub.
- Docker y Docker Compose son opcionales para desarrollo local.

No cambiar tecnologías ni contratar/activar servicios pagos sin autorización explícita.

## Alcance funcional de V1

- Roles: Administrador y cliente mayorista autorizado. Sin autorregistro.
- Solicitud de acceso pública y aprobación manual.
- Catálogo público sin precios; precios visibles solo a clientes autorizados y activos.
- Productos con SKU, nombre, descripción, fotos, categoría, marca y estado de publicación.
- Búsqueda básica y ficha de producto; lista general de precios mayoristas.
- Inventario sencillo con entradas, salidas y ajustes registrados. Stock nunca negativo.
- Carrito, pedidos online y administración básica de productos, clientes y pedidos.
- Transferencia y efectivo con registro y confirmación manual.
- Acceso directo a WhatsApp Business y experiencia mobile-first. Instalar como PWA solo si no agrega complejidad significativa.

No ampliar V1 con funciones no incluidas en esta lista. Las funciones excluidas solo pueden registrarse como posibilidades futuras, sin diseñarlas ni implementarlas.

## Método de trabajo

- Antes de editar, revisar estado de Git, archivos e instrucciones; preservar cambios ajenos a la tarea.
- Trabajar por etapas y un módulo a la vez. Antes de implementarlo, relevar requisitos, dependencias, propuesta y criterios de aceptación.
- Validar toda entrada externa con Zod en servidor. Autenticar y autorizar cada operación server-side, denegar por defecto y comprobar que el cliente esté activo y acceda solo a sus datos.
- Prisma exclusivamente en servidor. Nunca exponer credenciales, secretos de DB o `SUPABASE_SERVICE_ROLE_KEY` al cliente.
- Visitantes reciben solo campos permitidos del catálogo. No incluir precios/costos en consultas, HTML, RSC, metadatos, respuestas públicas, logs ni caché.
- No almacenar contraseñas en texto plano. No habilitar autorregistro.
- La PWA, si se implementa, cachea únicamente shell y recursos públicos. No cachear datos de clientes, precios, carrito, sesión o pedidos.
- Stock no negativo; cada variación se registra como movimiento persistente. No editar el saldo directamente.
- Importes decimales con moneda explícita (ARS); calcular precios y totales en servidor.
- Registrar decisiones duraderas en `docs/DECISIONS.md` y mantener los seis documentos consistentes.
- No activar servicios pagos, facturación, dominios ni gasto por uso sin autorización. Informar solo validaciones realmente ejecutadas.

## Estado de aprobación

La documentación debe ser revisada y aprobada explícitamente por el usuario. No comenzar el desarrollo ni configurar servicios antes de recibir esa aprobación.
