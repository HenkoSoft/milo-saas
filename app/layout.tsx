import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "MILO | Plataforma de HenkoSoft", template: "%s | MILO" },
  description:
    "MILO es la plataforma multiempresa de HenkoSoft en desarrollo para el sector de repuestos y productos para celulares.",
  applicationName: "MILO",
  openGraph: { siteName: "MILO", locale: "es_AR", type: "website" },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="es-AR">
      <body>{children}</body>
    </html>
  );
}
