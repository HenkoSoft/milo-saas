import { Brand } from "./brand";
import { SiteNav } from "./site-nav";
import { institutionalNavigation } from "@/lib/site";

export function SiteHeader() {
  return <header className="site-header"><div className="site-container header-inner"><Brand /><SiteNav items={institutionalNavigation} /></div></header>;
}
