import type { Metadata } from "next";
import Link from "next/link";
import { CapabilityIcon, ArrowIcon } from "@/components/icons";
import { PageIntro } from "@/components/public-ui";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = { title: "Acceso al sistema", description: "Estado del acceso al sistema MILO. El ingreso de usuarios todavía no está disponible desde este sitio.", robots: { index: false, follow: true } };

export default function AccessPage() {
  return <><PageIntro label="Acceso al sistema" title={<>El próximo paso,<br /><span className="text-silver">cuando esté listo.</span></>} index="M">El ingreso de usuarios a MILO todavía no está disponible desde este sitio. No hay registro público ni formularios de alta.</PageIntro><section className="site-container access-notice section-space"><CapabilityIcon kind="shield" /><div><h2>Información para clientes de Milo Store</h2><p>Si tu consulta es comercial, contactá a la tienda por WhatsApp. La solicitud se revisa manualmente y no habilita por sí sola una cuenta, precios privados ni compras.</p><div className="hero-actions"><a className="button button-blue" href={siteConfig.whatsappUrl} target="_blank" rel="noopener noreferrer">Contactar a Milo Store <ArrowIcon diagonal /></a><Link className="text-link" href={siteConfig.storePath}>Volver a la tienda <ArrowIcon /></Link></div></div></section></>;
}
