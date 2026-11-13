import { download, upload } from "@/lib/data-transfer/http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = (request: Request) => download("clientes", request);
export const POST = (request: Request) => upload("clientes", request);
