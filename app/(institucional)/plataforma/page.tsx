import type { Metadata } from "next";
import { PlatformGraphic } from "@/components/platform-graphic";
import { DevelopmentNote, NextChapter, PageIntro } from "@/components/public-ui";

export const metadata: Metadata = { title: "Plataforma", description: "El enfoque de MILO: una plataforma compartida, empresas con datos propios, equipos y varias sucursales. Conocé la visión en desarrollo de HenkoSoft." };

export default function PlatformPage() {
  return <>
    <PageIntro label="La plataforma" title={<>Una base común.<br /><span className="text-silver">Tu propia empresa.</span></>} index="01">MILO se construye como un SaaS multiempresa: una misma aplicación, con un espacio de operación propio para cada negocio.</PageIntro>
    <section className="site-container platform-section"><PlatformGraphic compact /><div className="editorial-stack"><article><span className="caption">01 / EMPRESA</span><h2>Tu información tiene su lugar.</h2><p>El modelo contempla datos, documentos y relaciones comerciales separados por empresa. Compartir plataforma no significa compartir información de negocio.</p></article><article><span className="caption">02 / EQUIPO</span><h2>Personas y responsabilidades.</h2><p>La gestión prevista distingue usuarios, roles y sucursales. Una persona puede trabajar en varias sucursales de su empresa, con el alcance que le corresponda.</p></article><article><span className="caption">03 / IDENTIDAD</span><h2>Una experiencia consistente.</h2><p>La interfaz de MILO será común a todas las empresas. El nombre, los datos comerciales y el logo de cada negocio conservarán su identidad en sus documentos.</p></article></div></section>
    <div className="site-container section-space"><DevelopmentNote /></div>
    <NextChapter label="Conocé el alcance" title="Una visión, pieza por pieza." href="/funcionalidades" linkLabel="Ver funcionalidades" />
  </>;
}
