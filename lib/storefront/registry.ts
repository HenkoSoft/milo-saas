import "server-only";

import { notFound } from "next/navigation";
import { z } from "zod";
import { siteConfig } from "@/lib/site";
import type { StorefrontConfig } from "./types";

const slugSchema = z.string().min(1).max(63).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

// This is an editorial allowlist, not a database lookup or authorization context.
// All content below is retained from the existing Milo Store portal.
const miloStore: StorefrontConfig = {
  slug: "milo-store",
  template: "wholesale",
  identity: {
    name: "Milo Store",
    caption: "MAYORISTA",
    footerDescription: "Repuestos y productos para celulares. Atención mayorista, de forma directa.",
    region: "Argentina",
    logo: { src: "/brand-mark.svg", width: 36, height: 36 },
  },
  contact: { whatsappUrl: siteConfig.whatsappUrl },
  seo: {
    title: "Milo Store | Repuestos mayoristas para celulares",
    description: "Milo Store: venta mayorista de repuestos y productos para celulares en Argentina. Conocé la tienda y contactanos por WhatsApp. Catálogo online en preparación.",
    socialTitle: "Milo Store | Repuestos mayoristas para celulares",
    socialDescription: "Venta mayorista de repuestos y productos para celulares. Catálogo online en preparación y atención directa por WhatsApp.",
    socialName: "Milo Store en MILO",
    locale: "es_AR",
  },
  theme: {
    background: "#090c12", foreground: "#f0f3f8", muted: "#a2adbd",
    silver: "#b8c8df", line: "#27303e", accent: "#2867ea",
    accentHover: "#3475ff", accentBorder: "#3f7aff",
    surface: "#101924", footerBackground: "#080b10",
  },
  content: {
    hero: {
      eyebrow: "Tienda mayorista · Argentina",
      titleLines: ["Repuestos para", "celulares."],
      titleAccent: "Más cerca.",
      description: "Un espacio mayorista de repuestos y productos para celulares, con atención directa y revisión manual de las solicitudes comerciales.",
      contactLabel: "Hablar por WhatsApp",
      catalogLabel: "Conocer el catálogo",
      artLabels: ["Repuestos y productos", "Atención directa"],
    },
    highlights: ["Venta mayorista", "Contacto por WhatsApp", "Argentina · ARS"],
    catalog: {
      eyebrow: "Catálogo de Milo Store",
      title: "Un catálogo claro.",
      titleAccent: "En preparación.",
      lead: "Estamos preparando el catálogo online. Por ahora, podés conocer la tienda y contactarnos directamente.",
      paragraphs: [
        "Los productos publicados serán públicos. Milo Store comienza con precios privados: para consultarlos se requerirá una identidad vinculada a un cliente autorizado y activo de la tienda.",
        "Consultar precios no habilita automáticamente una compra.",
      ],
      contactLabel: "Consultar a Milo Store",
    },
    steps: {
      eyebrow: "Cómo funciona",
      titleLines: ["Un canal directo.", "Una revisión personal."],
      description: "La atención actual se realiza por WhatsApp. El acceso online se habilitará en una próxima etapa.",
      items: [
        { number: "01", title: "Contactanos", text: "Escribinos por WhatsApp Business y contanos que querés conocer la propuesta mayorista de Milo Store." },
        { number: "02", title: "Revisamos tu solicitud", text: "La revisión es manual. No hay registro automático ni acceso inmediato a precios privados." },
        { number: "03", title: "Acceso comercial autorizado", text: "Cuando esté disponible la operación online, los precios privados requerirán una cuenta vinculada a un cliente aprobado y activo. La compra se autorizará por separado." },
      ],
    },
    contact: {
      eyebrow: "Atención mayorista",
      title: "¿Querés conocer",
      titleAccent: "Milo Store?",
      description: "Escribinos por WhatsApp Business para solicitar información. La aprobación de cada solicitud es manual.",
      label: "Solicitar información por WhatsApp",
    },
  },
};

const storefronts: ReadonlyMap<string, StorefrontConfig> = new Map([[miloStore.slug, miloStore]]);

export function getStorefront(slug: unknown): StorefrontConfig | null {
  const parsed = slugSchema.safeParse(slug);
  return parsed.success ? storefronts.get(parsed.data) ?? null : null;
}

export function requireStorefront(slug: unknown): StorefrontConfig {
  const storefront = getStorefront(slug);
  if (!storefront) notFound();
  return storefront;
}

export function getStorefrontSlugs(): string[] {
  return [...storefronts.keys()];
}
