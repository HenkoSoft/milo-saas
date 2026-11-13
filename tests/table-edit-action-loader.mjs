import { readFile } from "node:fs/promises";
import { createElement } from "react";
import { componentURL } from "./record-editor-loader.mjs";

globalThis[Symbol.for("milo.table-action-test")] = { Link: ({ children, ...props }) => createElement("a", props, children) };
const icons = componentURL(await readFile(new URL("../components/icons.tsx", import.meta.url), "utf8"));
let source = await readFile(new URL("../components/panel/table-edit-action.tsx", import.meta.url), "utf8");
source = source.replace('import Link from "next/link";', 'const { Link } = globalThis[Symbol.for("milo.table-action-test")];')
  .replace('from "@/components/icons"', `from ${JSON.stringify(icons)}`);
export const { TableEditAction } = await import(componentURL(source));
