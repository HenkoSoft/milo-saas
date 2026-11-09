import type { Metadata } from "next";
import { NextChapter, PageIntro } from "@/components/public-ui";

export const metadata: Metadata = { title: "Nosotros", description: "HenkoSoft desarrolla MILO, una plataforma SaaS multiempresa. Milo Store es su primer tenant. Conocé la relación entre la desarrolladora, la plataforma y la tienda." };

export default function AboutPage() {
  return <><PageIntro label="Nosotros" title={<>Tres nombres.<br /><span className="text-silver">Un rol para cada uno.</span></>} index="04">HenkoSoft desarrolla la tecnología. MILO es la plataforma. Milo Store es la primera empresa con un espacio comercial propio.</PageIntro><section className="site-container identity-rows">{[
    { name: "HenkoSoft", role: "LA DESARROLLADORA", text: "Es la desarrolladora de MILO y responsable de construir la plataforma. Su identidad es independiente de la de cada empresa que utilice el sistema." },
    { name: "MILO", role: "LA PLATAFORMA", text: "Es el SaaS multiempresa en desarrollo: una aplicación compartida, una experiencia visual común y un modelo que mantiene separados los datos de cada negocio." },
    { name: "Milo Store", role: "EL PRIMER TENANT", text: "Es la primera empresa del proyecto, enfocada en la venta mayorista de repuestos y productos para celulares. Su portal y contacto comercial pertenecen a la tienda." },
  ].map((item, i) => <article className="identity-row" key={item.name}><span className="caption">0{i + 1} / {item.role}</span><h2>{item.name}</h2><p>{item.text}</p></article>)}</section><section className="site-container section-space about-statement"><span className="caption">NUESTRO ENFOQUE</span><h2>Construir por etapas.<br /><span className="text-muted">Comunicar con claridad.</span></h2><p>Este sitio presenta el enfoque y el alcance previsto de MILO. Las capacidades del sistema se irán incorporando por etapas; una descripción de producto no implica que esa operación ya esté disponible.</p></section><NextChapter label="Seguimos en contacto" title="Encontrá el espacio indicado." href="/contacto" linkLabel="Ver contacto" /></>;
}
