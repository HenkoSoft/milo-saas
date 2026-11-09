import type { Metadata } from "next";
import Link from "next/link";
import { ArrowIcon } from "@/components/icons";
import { PageIntro } from "@/components/public-ui";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = { title: "Contacto", description: "Información de contacto de MILO y acceso al contacto comercial de Milo Store. WhatsApp corresponde exclusivamente a la tienda mayorista." };

export default function ContactPage() {
  return <><PageIntro label="Contacto" title={<>Cada consulta,<br /><span className="text-silver">en su lugar.</span></>} index="05">Conocé los espacios de la plataforma y el canal comercial de su primera tienda.</PageIntro><section className="site-container contact-grid section-space"><article className="contact-panel"><span className="caption">LA PLATAFORMA / MILO</span><h2>¿Querés conocer<br />el proyecto?</h2><p>El sitio institucional reúne el enfoque, las funcionalidades previstas y las soluciones de MILO. El canal de contacto institucional de HenkoSoft todavía no está publicado.</p><Link className="text-link" href="/plataforma">Explorar la plataforma <ArrowIcon /></Link></article><article className="contact-panel contact-panel-accent"><span className="caption">CONTACTO COMERCIAL / MILO STORE</span><h2>¿Buscás productos<br />para celulares?</h2><p>El contacto mayorista de Milo Store se realiza por WhatsApp. Podés consultar sobre la tienda y solicitar información de acceso comercial.</p><a className="button button-blue" href={siteConfig.whatsappUrl} target="_blank" rel="noopener noreferrer">WhatsApp de Milo Store <ArrowIcon diagonal /></a><Link className="text-link" href={siteConfig.storePath}>Visitar el portal de la tienda <ArrowIcon /></Link></article></section></>;
}
