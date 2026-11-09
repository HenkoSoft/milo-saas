import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowIcon } from "./icons";

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="eyebrow"><span aria-hidden="true" />{children}</p>;
}

export function PageIntro({ label, title, children, index }: { label: string; title: ReactNode; children: ReactNode; index: string }) {
  return <section className="site-container page-intro"><div><Eyebrow>{label}</Eyebrow><h1>{title}</h1><p className="intro-description">{children}</p></div><span className="page-index" aria-hidden="true">{index}<span>/ MILO</span></span></section>;
}

export function DevelopmentNote() {
  return <p className="development-note"><span className="status-dot" aria-hidden="true" />MILO está en desarrollo. Las capacidades presentadas describen el alcance previsto; la operación del sistema todavía no está disponible.</p>;
}

export function NextChapter({ label, title, href, linkLabel }: { label: string; title: string; href: string; linkLabel: string }) {
  return <section className="next-chapter"><div className="site-container next-chapter-inner"><div><span className="caption">{label}</span><h2>{title}</h2></div><Link className="button button-blue" href={href}>{linkLabel}<ArrowIcon /></Link></div></section>;
}
