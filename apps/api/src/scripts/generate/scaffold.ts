import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ResourceNames } from "./names";
import { patchAppSource } from "./patch-app";
import {
  controllerSource,
  controllerTestSource,
  serviceSource,
  serviceTestSource,
} from "./templates";

export function apiRootFromCli({ cliDir }: { cliDir: string }) {
  return path.resolve(cliDir, "../../..");
}

export async function writeService({ srcDir, names }: { srcDir: string; names: ResourceNames }) {
  const dir = path.join(srcDir, "modules", names.kebab);
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, `${names.kebab}.service.ts`);
  await writeIfMissing({ file, contents: serviceSource({ names }) });
  await mkdir(path.join(dir, "tests"), { recursive: true });
  await writeIfMissing({
    file: path.join(dir, "tests", `${names.kebab}.service.test.ts`),
    contents: serviceTestSource({ names }),
  });
  return file;
}

export async function writeController({ srcDir, names }: { srcDir: string; names: ResourceNames }) {
  const dir = path.join(srcDir, "modules", names.kebab);
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, `${names.kebab}.controller.ts`);
  await writeIfMissing({ file, contents: controllerSource({ names }) });
  await mkdir(path.join(dir, "tests"), { recursive: true });
  await writeIfMissing({
    file: path.join(dir, "tests", `${names.kebab}.controller.test.ts`),
    contents: controllerTestSource({ names }),
  });
  return file;
}

export async function mountController({ srcDir, names }: { srcDir: string; names: ResourceNames }) {
  const appFile = path.join(srcDir, "app.ts");
  const source = await readFile(appFile, "utf8");
  await writeFile(appFile, patchAppSource({ source, names }));
  return appFile;
}

async function writeIfMissing({ file, contents }: { file: string; contents: string }) {
  try {
    await writeFile(file, contents, { flag: "wx" });
  } catch (error: unknown) {
    if (error instanceof Error && "code" in error && error.code === "EEXIST") {
      throw new Error(`${file} already exists`);
    }
    throw error;
  }
}
