"use client";

import { useState, type FormEvent } from "react";
import { z } from "zod";
import { authClient } from "@/lib/auth-client";

const credentialsSchema = z.object({
  email: z.email("Ingresá un correo válido."),
  password: z.string().min(1, "Ingresá tu contraseña."),
});

export function SignInForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [fields, setFields] = useState<{ email?: string; password?: string }>({});
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const parsed = credentialsSchema.safeParse({ email: String(data.get("email") ?? "").trim(), password: data.get("password") });
    setError("");
    setFields({});
    if (!parsed.success) {
      const errors = z.flattenError(parsed.error).fieldErrors;
      setFields({ email: errors.email?.[0], password: errors.password?.[0] });
      return;
    }
    setPending(true);
    try {
      // Better Auth independently validates the body with Zod on the server.
      const result = await authClient.signIn.email({ ...parsed.data, rememberMe: false });
      if (result.error) {
        setError(result.error.status === 429
          ? "Demasiados intentos. Esperá un momento antes de volver a ingresar."
          : "No pudimos iniciar sesión. Revisá el correo y la contraseña e intentá nuevamente.");
        form.reset();
        setPending(false);
        return;
      }
      form.reset();
      // Fixed destination; no untrusted return URL.
      window.location.replace("/panel");
    } catch {
      setError("No pudimos conectar con el servicio. Intentá nuevamente en unos momentos.");
      form.reset();
      setPending(false);
    }
  }
  return <form className="milo-signin-form" onSubmit={submit} noValidate aria-busy={pending}>
    <div className="milo-field">
      <label htmlFor="email">Correo electrónico</label>
      <input id="email" name="email" type="email" autoComplete="username" autoCapitalize="none" spellCheck={false} required disabled={pending} aria-invalid={!!fields.email} aria-describedby={fields.email ? "email-error" : undefined} placeholder="nombre@empresa.com" />
      {fields.email && <p id="email-error" role="alert">{fields.email}</p>}
    </div>
    <div className="milo-field">
      <label htmlFor="password">Contraseña</label>
      <input id="password" name="password" type="password" autoComplete="current-password" required disabled={pending} aria-invalid={!!fields.password} aria-describedby={fields.password ? "password-error" : undefined} />
      {fields.password && <p id="password-error" role="alert">{fields.password}</p>}
    </div>
    {error && <p className="milo-form-error" role="alert">{error}</p>}
    <button className="milo-primary-button" type="submit" disabled={pending}>{pending ? "Ingresando…" : "Ingresar a MILO"}<span aria-hidden="true">→</span></button>
    <p className="milo-form-note">Acceso exclusivo para cuentas existentes. El registro público está deshabilitado.</p>
  </form>;
}
