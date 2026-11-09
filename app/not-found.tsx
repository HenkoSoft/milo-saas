import Link from "next/link";
import { Brand } from "@/components/brand";

export default function NotFound() {
  return <main className="site-container section-space"><Brand /><section className="section-space"><p className="eyebrow">404 / Página no encontrada</p><h1>Este camino<br />no está disponible.</h1><p className="hero-description">Podés volver al sitio de MILO o visitar el portal comercial de Milo Store.</p><div className="hero-actions"><Link href="/" className="button button-blue">Volver a MILO</Link><Link href="/tiendas/milo-store" className="text-link">Ir a Milo Store</Link></div></section></main>;
}
