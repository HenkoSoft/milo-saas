import Link from "next/link";
import { notFound } from "next/navigation";

export function CatalogProblem({ status }: { status: "forbidden" | "invalid" | "missing" | "error" }) {
  if (status === "missing") notFound();
  return <section className="milo-panel-card"><h1 className="milo-catalog-title">{status === "forbidden" ? "Acceso restringido" : status === "invalid" ? "Búsqueda inválida" : "No pudimos cargar el catálogo"}</h1><p className="milo-company-hint">{status === "forbidden" ? "El catálogo administrativo está disponible para el Dueño y los Administradores de tu empresa." : "Volvé al listado o intentá nuevamente en unos momentos."}</p><Link className="text-link" href="/panel">Volver al inicio →</Link></section>;
}
export function CatalogHeading({ title, description, href, label }: { title: string; description: string; href?: string; label?: string }) {
  return <section className="milo-panel-welcome"><div><p className="milo-card-kicker">ADMINISTRACIÓN / CATÁLOGO</p><h1>{title}</h1><p>{description}</p></div>{href && <Link className="milo-primary-button" href={href}>{label}</Link>}</section>;
}
export function CatalogSearch({ q, path }: { q: string; path: string }) {
  return <form action={path} method="get" className="milo-catalog-search"><div className="milo-field"><label htmlFor="catalog-search">Buscar</label><input id="catalog-search" name="q" type="search" defaultValue={q} maxLength={100} placeholder={path === "/panel/productos" ? "Nombre o SKU" : "Nombre"} /></div><button className="milo-secondary-button">Buscar</button>{q && <Link className="milo-secondary-button" href={path}>Limpiar</Link>}</form>;
}
export function CatalogPagination({ path, page, pages, q }: { path: string; page: number; pages: number; q: string }) {
  const href = (n: number) => `${path}?${new URLSearchParams({ q, page: String(n) })}`;
  return <nav className="milo-catalog-pagination" aria-label="Paginación"><span>Página {page} de {pages}</span><div>{page > 1 && <Link className="milo-secondary-button" href={href(page - 1)}>Anterior</Link>}{page < pages && <Link className="milo-secondary-button" href={href(page + 1)}>Siguiente</Link>}</div></nav>;
}
export type SearchParams = Promise<Record<string, string | string[] | undefined>>;
export async function catalogQuery(searchParams: SearchParams) {
  const params = await searchParams;
  return { q: params.q ?? "", page: params.page ?? "1" };
}
