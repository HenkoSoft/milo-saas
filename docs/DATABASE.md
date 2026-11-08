# Diseño conceptual de datos de Milo Store V1

## Estado

Este documento describe únicamente los datos necesarios para la tienda mayorista V1. Es un diseño conceptual, no un esquema aprobado. No crear tablas ni migraciones hasta aprobación personal de la documentación y autorización de desarrollo.

La base acordada es PostgreSQL en Supabase, gestionada desde la aplicación mediante Prisma ORM Community. Configuración: una organización, una sucursal y un depósito. Docker/Compose son opcionales para desarrollo local.

## Entidades conceptuales mínimas

| Área | Entidades | Uso |
|---|---|---|
| Acceso | `UserProfile`, `CustomerAccessRequest` | Perfil vinculado a Auth y solicitudes que esperan revisión administrativa. |
| Clientes | `Customer` | Cliente mayorista y estado de autorización/actividad; la solicitud no habilita acceso por sí sola. |
| Catálogo | `Product`, `Category`, `Brand`, `ProductImage` | Productos, SKU, descripción, clasificación, publicación e imágenes. |
| Precios | `WholesalePrice` | Precio general mayorista por producto. |
| Inventario | `StockMovement`, `StockBalance` | Historial de entradas, salidas y ajustes; saldo actual derivado o mantenido como proyección consistente. |
| Pedidos | `Order`, `OrderLine`, `OrderStatusEvent` | Pedido, líneas, estados e historial con detalle de compra preservado. |
| Pagos | `PaymentRecord` | Método, estado y confirmación manual asociada al pedido. |
| Auditoría mínima | `AuditEvent` | Actor, fecha y acción para cambios administrativos sensibles. |

Los nombres son conceptuales. Definir columnas, relaciones, cardinalidades, índices y restricciones durante el análisis autorizado de cada módulo. No agregar entidades para otros módulos.

## Reglas de integridad

- SKU único conforme a la política de una organización.
- La consulta pública del catálogo nunca selecciona ni serializa precios/costos. Precios asociados solo se consultan para clientes activos y autorizados.
- Solicitar acceso no crea cuenta autenticada ni cliente activo. Solo la aprobación administrativa habilita el proceso de alta.
- Cada cambio de existencias registra un movimiento persistente. El movimiento y el saldo se actualizan atómicamente; no permitir saldos negativos ni edición directa del saldo.
- Registrar el tipo de movimiento (entrada, salida o ajuste), producto, cantidad, fecha y actor/motivo apropiado.
- El pedido conserva snapshots suficientes del producto/SKU, cantidad, precio e importes para mantener el historial si cambia el catálogo.
- Los importes se calculan en servidor, se almacenan con precisión decimal y moneda explícita (ARS inicialmente). El navegador no determina precio ni estado de pago.
- Mantener estado del pedido separado del estado del pago. La confirmación manual registra actor, fecha e información de pago disponible.
- Usar claves foráneas, restricciones y transacciones. Las migraciones Prisma son versionadas; no desplegar mediante cambios manuales o `db push`.
- No borrar movimientos, pedidos o pagos que representen operaciones registradas; corregir mediante registros trazables.

## Pendientes antes del esquema final

- Política de campos y unicidad de email/teléfono, normalización y detección de solicitudes duplicadas.
- Estados específicos de cuenta, producto, pedido y pago.
- Campos obligatorios y retención de solicitudes/clientes.
- Precisión de cantidades y atributos del movimiento de ajuste.
- Política de cancelación de pedidos y conservación de historial.
- Restricciones e índices necesarios según consultas reales.
- Retención de auditoría y datos personales.

Resolver estos puntos durante el análisis de módulos V1; no crear modelos futuros por anticipado.
