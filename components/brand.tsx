import Link from "next/link";

export function Brand() {
  return <Link className="brand" href="/" aria-label="MILO, inicio">
    <svg className="brand-symbol" viewBox="0 0 36 36" fill="none" aria-hidden="true"><path d="M3 27V9h6l9 10 9-10h6v18h-7V19l-8 9-8-9v8H3Z" fill="currentColor" /></svg>
    <span className="brand-wordmark">MILO</span>
  </Link>;
}
