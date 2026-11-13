"use client";
import { useEffect } from "react";
export function PrintControls() {
  useEffect(() => { let active = true; document.fonts.ready.then(() => { if (active) window.print(); }); return () => { active = false; }; }, []);
  return <div className="milo-print-controls"><button className="milo-primary-button" onClick={() => window.print()}>Imprimir / Guardar como PDF</button><p>Elegí una impresora o «Guardar como PDF» en el diálogo del navegador.</p></div>;
}
