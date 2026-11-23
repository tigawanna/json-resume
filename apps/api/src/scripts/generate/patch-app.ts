import type { ResourceNames } from "./names";

const MODULE_IMPORT = /^import \{ \w+Controller \} from "@api\/modules\/[^"]+";$/gm;
const RESOLVE = /^ {2}const \w+ = container\.resolve\(\{ token: \w+Controller \}\);$/gm;
const MODULE_ROUTE = /^ {4}\.route\("\/[^"]+", \w+\.routes\)$/gm;

export function patchAppSource({ source, names }: { source: string; names: ResourceNames }) {
  if (source.includes(`@api/modules/${names.kebab}/${names.kebab}.controller`)) {
    throw new Error(`${names.kebab} is already imported in app.ts`);
  }

  const importLine = `import { ${names.pascal}Controller } from "@api/modules/${names.kebab}/${names.kebab}.controller";`;
  const resolveLine = `  const ${names.camel} = container.resolve({ token: ${names.pascal}Controller });`;
  const routeLine = `    .route("/${names.kebab}", ${names.camel}.routes)`;

  return insertRoute(insertResolve(insertImport({ source, importLine }), resolveLine), routeLine);
}

function insertImport({ source, importLine }: { source: string; importLine: string }) {
  const matches = [...source.matchAll(MODULE_IMPORT)];
  const last = matches.at(-1);
  if (last?.index !== undefined) {
    const end = last.index + last[0].length;
    return `${source.slice(0, end)}\n${importLine}${source.slice(end)}`;
  }
  const marker = `import { createAppContainer } from "@api/core/di/create-app-container";`;
  const at = source.indexOf(marker);
  if (at === -1) throw new Error("Could not find a place to insert the controller import");
  const end = at + marker.length;
  return `${source.slice(0, end)}\n${importLine}${source.slice(end)}`;
}

function insertResolve(source: string, resolveLine: string) {
  const matches = [...source.matchAll(RESOLVE)];
  const last = matches.at(-1);
  if (last?.index !== undefined) {
    const end = last.index + last[0].length;
    return `${source.slice(0, end)}\n${resolveLine}${source.slice(end)}`;
  }
  const marker = `  const container = createAppContainer({ db, auth });`;
  const at = source.indexOf(marker);
  if (at === -1) throw new Error("Could not find createAppContainer in app.ts");
  const end = at + marker.length;
  return `${source.slice(0, end)}\n${resolveLine}${source.slice(end)}`;
}

function insertRoute(source: string, routeLine: string) {
  const matches = [...source.matchAll(MODULE_ROUTE)];
  const last = matches.at(-1);
  if (last?.index !== undefined) {
    const end = last.index + last[0].length;
    return `${source.slice(0, end)}\n${routeLine}${source.slice(end)}`;
  }
  const marker = `    .on(["GET", "POST"], "/auth/*", (c) => auth.handler(c.req.raw))`;
  const at = source.indexOf(marker);
  if (at === -1) throw new Error("Could not find the auth mount in app.ts");
  const end = at + marker.length;
  return `${source.slice(0, end)}\n${routeLine}${source.slice(end)}`;
}
