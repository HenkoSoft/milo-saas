import { readFile } from "node:fs/promises";
import ts from "typescript";

export function componentURL(source) {
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
    .replaceAll('from "react/jsx-runtime"', `from ${JSON.stringify(import.meta.resolve("react/jsx-runtime"))}`)
    .replaceAll('from "react"', `from ${JSON.stringify(import.meta.resolve("react"))}`);
  return `data:text/javascript;base64,${Buffer.from(output).toString("base64")}`;
}

const interactions = componentURL(await readFile(new URL("../components/panel/editor-interactions.ts", import.meta.url), "utf8"));
export const recordEditorURL = componentURL((await readFile(new URL("../components/panel/record-editor.tsx", import.meta.url), "utf8")).replace('from "./editor-interactions"', `from ${JSON.stringify(interactions)}`));

export async function loadRecordWorkspace(useRouter) {
  globalThis[Symbol.for("milo.record-workspace-test")] = { useRouter };
  const source = (await readFile(new URL("../components/panel/record-workspace.tsx", import.meta.url), "utf8"))
    .replace('import { useRouter } from "next/navigation";', 'const { useRouter } = globalThis[Symbol.for("milo.record-workspace-test")];')
    .replace('from "./editor-interactions"', `from ${JSON.stringify(interactions)}`);
  return import(componentURL(source));
}
