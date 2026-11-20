import type { ResourceNames } from "./names";

export function serviceSource({ names }: { names: ResourceNames }) {
  return `export class ${names.pascal}Service {
  status() {
    return { status: "ok" as const, resource: "${names.kebab}" };
  }
}
`;
}

export function controllerSource({ names }: { names: ResourceNames }) {
  return `import type { AppEnv } from "@api/types";
import { ${names.pascal}Service } from "@api/modules/${names.kebab}/${names.kebab}.service";
import { Hono } from "hono";

function create${names.pascal}Routes({ ${names.camel} }: { ${names.camel}: ${names.pascal}Service }) {
  return new Hono<AppEnv>().get("/", (c) => c.json(${names.camel}.status()));
}

export class ${names.pascal}Controller {
  static readonly inject = { ${names.camel}: ${names.pascal}Service };

  constructor({ ${names.camel} }: { ${names.camel}: ${names.pascal}Service }) {
    this.routes = create${names.pascal}Routes({ ${names.camel} });
  }

  readonly routes: ReturnType<typeof create${names.pascal}Routes>;
}
`;
}

export function serviceTestSource({ names }: { names: ResourceNames }) {
  return `import { ${names.pascal}Service } from "@api/modules/${names.kebab}/${names.kebab}.service";
import { describe, expect, it } from "vitest";

describe("${names.pascal}Service", () => {
  it("returns the scaffold payload", () => {
    expect(new ${names.pascal}Service().status()).toEqual({
      status: "ok",
      resource: "${names.kebab}",
    });
  });
});
`;
}

export function controllerTestSource({ names }: { names: ResourceNames }) {
  return `import { apiClient } from "@api/core/testing/api-client";
import { describe, expect, it } from "vitest";

describe("${names.pascal}Controller", () => {
  it("GET /api/${names.kebab} returns 200", async () => {
    const res = await apiClient.api["${names.kebab}"].$get();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      status: "ok",
      resource: "${names.kebab}",
    });
  });
});
`;
}
