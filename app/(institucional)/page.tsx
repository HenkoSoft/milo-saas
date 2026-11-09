import type { Metadata } from "next";
import Link from "next/link";
import { ArrowIcon, CapabilityIcon } from "@/components/icons";
import { PlatformGraphic } from "@/components/platform-graphic";
import { DevelopmentNote, Eyebrow } from "@/components/public-ui";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = { title: { absolute: "MILO | Una nueva perspectiva para tu empresa" }, description: "Conocé MILO, la plataforma multiempresa de HenkoSoft en desarrollo para el sector de repuestos y productos para celulares. Milo Store es su primer espacio comercial." };

export default function Home() {
  return <>
    <section className="site-container home-hero"><div className="hero-copy"><Eyebrow>Software para una nueva etapa</Eyebrow><h1>Tu negocio.<br />Una nueva<br /><span className="text-silver">perspectiva.</span></h1><p className="hero-description">MILO es la plataforma de HenkoSoft en desarrollo para conectar la gestión de empresas de repuestos y productos para celulares.</p><div className="hero-actions"><Link className="button button-blue" href="/plataforma">Descubrí la plataforma <ArrowIcon /></Link><Link className="text-link" href={siteConfig.storePath}>Ir a Milo Store <ArrowIcon diagonal /></Link></div><p className="hero-status"><span className="status-dot" aria-hidden="true" />Plataforma en desarrollo</p></div><PlatformGraphic /></section>
    <div className="principle-band"><div className="site-container"><span>Una plataforma compartida</span><span>Datos propios por empresa</span><span>Desarrollada por HenkoSoft</span></div></div>
    <section className="site-container section-space vision-section"><div><Eyebrow>El punto de partida</Eyebrow><h2>Más claridad.<br /><span className="text-muted">Desde la base.</span></h2></div><div className="vision-copy"><p className="lead">Cada empresa tiene su forma de trabajar. MILO se construye para organizar esa operación con una base común y datos propios.</p><p>El primer paso es el ámbito mayorista: productos, clientes, pedidos e inventario. Una visión de gestión que contempla varias sucursales y equipos con distintas responsabilidades.</p><Link className="text-link" href="/plataforma">Conocé el enfoque <ArrowIcon /></Link></div></section>
    <section className="site-container section-space scope-section"><div className="section-heading-row"><div><Eyebrow>El alcance previsto</Eyebrow><h2>Las piezas de<br />una misma operación.</h2></div><Link className="text-link" href="/funcionalidades">Explorar funcionalidades <ArrowIcon /></Link></div><DevelopmentNote /><div className="capability-grid">{[
      { number: "01", icon: "grid" as const, title: "Productos y catálogo", text: "Información pública de productos y una política de precios definida por cada empresa." },
      { number: "02", icon: "people" as const, title: "Clientes y pedidos", text: "Relaciones comerciales con aprobación y seguimiento de la operación mayorista." },
      { number: "03", icon: "box" as const, title: "Inventario y sucursales", text: "Existencias en unidad base y movimientos vinculados a la sucursal correspondiente." },
    ].map(item => <article className="capability-card" key={item.number}><div className="card-topline"><CapabilityIcon kind={item.icon} /><span>{item.number}</span></div><h3>{item.title}</h3><p>{item.text}</p></article>)}</div></section>
    <section className="tenant-spotlight"><div className="site-container tenant-spotlight-inner"><div><Eyebrow>El primer espacio comercial</Eyebrow><h2>La plataforma es MILO.<br /><span className="text-silver">La tienda, Milo Store.</span></h2><p>Repuestos y productos para celulares, atención mayorista y contacto directo. Conocé el negocio con el que comienza esta etapa.</p><Link className="button button-silver" href={siteConfig.storePath}>Visitar Milo Store <ArrowIcon diagonal /></Link></div><div className="tenant-word-art" aria-hidden="true"><span>Milo</span><span>Store<span className="blue-period">.</span></span><small>MAYORISTA / ARGENTINA</small></div></div></section>
  </>;
}
