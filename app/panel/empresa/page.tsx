import type { Metadata } from "next";
import Link from "next/link";
import { requirePanelContext } from "@/lib/panel/access";
import { loadCompanySettings } from "@/lib/company/service";
import { CompanyForm } from "@/components/panel/company-form";
import { CapabilityIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Configuración de empresa" };
export const dynamic = "force-dynamic";

export default async function CompanyPage() {
  await requirePanelContext();
  const result = await loadCompanySettings();
  if (result.status !== "ok") return <section className="milo-panel-card"><h1>{result.status === "forbidden" ? "Acceso restringido" : "No pudimos cargar la empresa"}</h1><p className="milo-company-hint">{result.status === "forbidden" ? "Esta configuración está disponible para el Dueño y los Administradores de la empresa." : "Intentá nuevamente en unos momentos."}</p><Link className="text-link" href="/panel">Volver al inicio →</Link></section>;
  const { settings } = result;
  return <>
    <section className="milo-panel-welcome"><div><p className="milo-card-kicker">ADMINISTRACIÓN / EMPRESA</p><h1>Configuración de empresa</h1><p>Consultá los datos de tu empresa y mantené actualizado su nombre comercial.</p></div></section>
    <div className="milo-panel-grid milo-company-grid">
      <section className="milo-panel-card"><div className="milo-panel-card-heading"><CapabilityIcon kind="branch" /><span>01 / IDENTIDAD</span></div><h2>Datos comerciales</h2>
        <CompanyForm commercialName={settings.commercialName} version={settings.version} />
      </section>
      <section className="milo-panel-card"><div className="milo-panel-card-heading"><CapabilityIcon kind="shield" /><span>02 / CONFIGURACIÓN ACTUAL</span></div><h2>Configuración general</h2><dl>
        <div><dt>Moneda</dt><dd>{settings.currency ?? "Sin configurar"}</dd></div>
        <div><dt>Idioma y región</dt><dd>{settings.locale ?? "Sin configurar"}</dd></div>
        <div><dt>Zona horaria</dt><dd>{settings.timeZone ?? "Sin configurar"}</dd></div>
        <div><dt>Visibilidad de precios</dt><dd>{settings.priceVisibility === "PUBLIC" ? "Precios públicos" : "Solo clientes autenticados y autorizados"}</dd></div>
      </dl><p className="milo-company-hint">Estos valores se muestran únicamente para consulta.</p></section>
    </div>
    <section className="milo-panel-card milo-company-readonly"><div className="milo-panel-card-heading"><CapabilityIcon kind="people" /><span>03 / DIRECCIÓN Y CONTACTO</span></div><h2>Información registrada</h2><dl>
      <div><dt>Dirección</dt><dd className="milo-company-address">{settings.address ?? "Sin dirección registrada"}</dd></div>
      <div><dt>Contacto</dt><dd>{settings.contactText === null ? "Sin datos de contacto registrados" : <details><summary>Ver datos de contacto registrados</summary><pre className="milo-company-contact">{settings.contactText}</pre></details>}</dd></div>
    </dl><p className="milo-company-hint">La edición de dirección y contacto todavía no está disponible en esta pantalla.</p></section>
  </>;
}
