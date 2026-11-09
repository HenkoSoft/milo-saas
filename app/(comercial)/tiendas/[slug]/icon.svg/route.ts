import { readFile } from "node:fs/promises";
import path from "node:path";
import { getStorefront } from "@/lib/storefront/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const storefront = getStorefront((await params).slug);
  if (!storefront) return new Response(null, { status: 404 });
  // The asset path comes exclusively from the trusted editorial registry.
  const svg = await readFile(path.join(process.cwd(), "public", storefront.identity.logo.src.slice(1)), "utf8");
  return new Response(svg, { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=86400" } });
}
