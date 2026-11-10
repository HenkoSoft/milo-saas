"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  async function signOut() {
    if (pending) return;
    setPending(true);
    setError(false);
    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error("Sign out failed");
      // Discard the private router tree after cookie invalidation.
      window.location.replace("/acceso");
    } catch {
      setError(true);
      setPending(false);
    }
  }
  return <div className="milo-signout">
    <button className="milo-secondary-button" type="button" onClick={signOut} disabled={pending}>
      {pending ? "Cerrando sesión…" : "Cerrar sesión"}
    </button>
    {error && <p role="alert">No pudimos cerrar la sesión. Intentá nuevamente.</p>}
  </div>;
}
