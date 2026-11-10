import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignInForm } from "@/components/auth/sign-in-form";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { CapabilityIcon } from "@/components/icons";
import { getPanelAccess } from "@/lib/panel/access";
import "@/components/auth/auth.css";

export const metadata: Metadata = {
  title: "Ingresar", description: "Acceso seguro al espacio empresarial de MILO.",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function AccessPage() {
  const access = await getPanelAccess();
  if (access.status === "allowed") redirect("/panel");
  return <section className="milo-access site-container">
    <div className="milo-access-intro">
      <p className="eyebrow"><span aria-hidden="true" />ESPACIO EMPRESARIAL</p>
      <h1>Tu empresa.<br /><span className="text-silver">Un mismo lugar.</span></h1>
      <p>Ingresá a tu espacio de trabajo con tu cuenta de MILO.</p>
      <div className="milo-access-security"><CapabilityIcon kind="shield" /><span>Una cuenta, una empresa.<br />Tu información, en su espacio.</span></div>
      <span className="milo-access-signature">MILO <span>/</span> PLATAFORMA DE HENKOSOFT</span>
    </div>
    <div className="milo-access-card">
      <p className="milo-card-kicker">BIENVENIDO A MILO</p>
      <h2>Iniciá sesión</h2>
      {access.status === "forbidden" ? <div className="milo-access-denied">
        <p role="alert">Tu cuenta no tiene un acceso empresarial válido. Contactá al administrador de tu empresa.</p>
        <SignOutButton />
      </div> : <>
        <p className="milo-access-caption">Usá tu correo y contraseña para continuar.</p>
        {access.status === "unavailable" && <p className="milo-form-error" role="alert">No pudimos verificar el acceso. Intentá nuevamente en unos momentos.</p>}
        <SignInForm />
      </>}
    </div>
  </section>;
}
