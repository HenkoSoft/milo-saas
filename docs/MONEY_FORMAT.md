# Formato monetario de MILO

Regla obligatoria aprobada el 2026-11-10, registrada como D-038 en [DECISIONS.md](DECISIONS.md). Rige para todos los campos monetarios actuales y futuros, en todos los módulos y tenants, y para cualquier moneda que la plataforma tenga habilitada.

## Presentación y entrada

- Punto como separador de miles, coma como separador decimal y dos decimales visibles: `100.000,00`.
- Aplicar el mismo formato en formularios, modales, vistas de consulta, tablas, indicadores, precios, subtotales, totales, comprobantes y reportes cuando existan. No usar `100000.00` ni `100,000.00` como presentación al usuario.
- Identificar la moneda mediante etiqueta, encabezado o contexto inequívoco, por ejemplo `Precio de venta (ARS)`. Los separadores no identifican la moneda ni autorizan conversión cambiaria.
- Durante la escritura se permiten estados parciales. Admitir enteros sin agrupar y centavos con coma; si se ingresan puntos de miles, validar su agrupación. Al salir de un campo válido, agrupar los miles y completar dos decimales. No reformatear texto inválido como si fuera un importe válido.
- Un campo vacío conserva su significado: no es `0,00`. Cero debe ser explícito. La ausencia de precio continúa diferenciada del precio cero.
- Rechazar agrupaciones inválidas, notación exponencial y exceso de precisión; nunca corregirlos mediante redondeo o truncamiento silencioso. Los mensajes de ayuda deben describir este formato.

| Importe canónico | Presentación |
| --- | --- |
| `0.00` | `0,00` |
| `1234.50` | `1.234,50` |
| `100000.00` | `100.000,00` |
| `9999999999999999.99` | `9.999.999.999.999.999,99` |

## Contrato técnico e integridad

El formato localizado se limita a la interfaz y a documentos destinados a personas. Los contratos internos, las operaciones de servidor y la persistencia conservan decimales canónicos sin agrupación y con punto decimal, por ejemplo `100000.00`, y moneda explícita según el modelo existente. Las exportaciones para integración deben respetar su contrato técnico documentado; no confundirlas con un reporte para lectura humana.

La conversión debe ser exacta mediante cadenas y tipos decimales. No usar Number, parseFloat ni operaciones binarias de punto flotante para convertir o calcular dinero. Se conserva `DECIMAL(18,2)` donde ya está definido; esta convención no modifica esquema, límites, almacenamiento ni contratos de API. El servidor sigue validando con Zod y autorizando cada operación, con independencia de las comprobaciones del navegador.

La política de signos pertenece a cada operación: el formato no habilita importes negativos ni elimina un signo válido. Tampoco autoriza nuevas monedas, conversiones cambiarias, costos, IVA, listas de precios, pagos ni módulos. Cantidades de stock, porcentajes y factores no son campos monetarios y conservan sus contratos y precisión propios.

## Implementación y mantenimiento

Los precios habituales y por presentación ya usan [price-format.ts](../lib/catalog/price-format.ts): `formatPrice`, `parsePrice` y `formatEnteredPrice`. Estas utilidades trabajan con los precios no negativos actualmente autorizados. Reutilizarlas para contratos compatibles; si otro caso aprobado requiere adaptar el soporte, mantener una implementación compartida y sus pruebas, sin copiar reglas divergentes en cada pantalla.

Al crear o modificar cualquier campo monetario:

1. Aplicar esta convención a su entrada, consulta, mensajes de ayuda y documentos asociados.
2. Conservar importe exacto, moneda, ausencia de valor, política de signos y límites del caso de uso.
3. Verificar miles, centavos, cero, vacío, valores límite, agrupación inválida y exceso de precisión; comprobar que lo presentado y lo enviado al servidor representan el mismo importe.
4. Revisar formatos existentes del área y registrar cualquier inconsistencia pendiente. La regla es global; no se declara auditada o adaptada toda la aplicación por haber actualizado los dos formularios de precios.

Esta decisión es documental y de coherencia de interfaz; no constituye una implementación de funcionalidades futuras.
