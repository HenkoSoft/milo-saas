import type { Metadata } from "next";
import { CapabilityIcon } from "@/components/icons";
import { DevelopmentNote, NextChapter, PageIntro } from "@/components/public-ui";

export const metadata: Metadata = { title: "Funcionalidades", description: "Conocé el alcance mayorista previsto de MILO: productos, clientes, pedidos, inventario, equipos y sucursales. Capacidades en desarrollo." };

const capabilities = [
  { title: "Productos y catálogo", icon: "grid" as const, text: "Productos, categorías, marcas y presentaciones de venta. Un catálogo público para los productos publicados, con precios públicos o reservados a clientes autorizados según cada empresa.", note: "Información clara, acceso comercial independiente." },
  { title: "Clientes y relaciones comerciales", icon: "people" as const, text: "Gestión de clientes mayoristas y solicitudes de acceso con revisión manual. La autorización para ver precios y la autorización para comprar se evalúan por separado.", note: "Cada relación pertenece a su empresa." },
  { title: "Pedidos y pagos manuales", icon: "order" as const, text: "Pedidos con detalle de productos y presentaciones, historial y registro manual de pagos. El alcance inicial contempla transferencia y efectivo, sin procesamiento automático.", note: "El seguimiento de la operación, en contexto." },
  { title: "Inventario y movimientos", icon: "box" as const, text: "Existencias en la unidad base del producto, con movimientos persistentes y referencias a la sucursal correspondiente. El diseño exige impedir saldos negativos.", note: "Una base para la trazabilidad del stock." },
  { title: "Equipos y sucursales", icon: "branch" as const, text: "Una o varias sucursales por empresa y diferentes responsabilidades para cada integrante. El alcance de una sucursal siempre permanece dentro de la misma empresa.", note: "Una estructura que acompaña a tu equipo." },
];

export default function FeaturesPage() {
  return <><PageIntro label="Funcionalidades previstas" title={<>La operación,<br /><span className="text-silver">vista como un todo.</span></>} index="02">El primer alcance de MILO se enfoca en la distribución mayorista de repuestos y productos para celulares.</PageIntro><section className="site-container features-section"><DevelopmentNote /><div className="feature-rows">{capabilities.map((item, i) => <article className="feature-row" key={item.title}><span className="feature-number">0{i + 1}</span><div className="feature-title"><CapabilityIcon kind={item.icon} /><h2>{item.title}</h2></div><div><p>{item.text}</p><span className="feature-note">{item.note}</span></div></article>)}</div></section><NextChapter label="El primer enfoque" title="Tecnología con un contexto real." href="/soluciones" linkLabel="Explorar soluciones" /></>;
}
