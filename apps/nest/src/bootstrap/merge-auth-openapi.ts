import type { OpenAPIObject } from "@nestjs/swagger";

const BETTER_AUTH_TAG = "Better Auth";

/** Better Auth emits OpenAPI 3.1 path items; Nest's document type is 3.0. */
export type AuthOpenApiSchema = {
  paths?: Record<string, object>;
  tags?: { name: string; description?: string }[];
  components?: {
    schemas?: Record<string, object>;
    securitySchemes?: Record<string, object>;
  };
};

export function mergeAuthOpenApi({
  nestDocument,
  authSchema,
  basePath,
}: {
  nestDocument: OpenAPIObject;
  authSchema: AuthOpenApiSchema;
  basePath: string;
}): OpenAPIObject {
  const authPaths = remapAuthPathTags({
    paths: jsonRecord({
      value: prefixPaths({ paths: authSchema.paths, basePath }),
    }),
  });
  return {
    ...nestDocument,
    paths: {
      ...nestDocument.paths,
      ...authPaths,
    },
    tags: uniqueTags({
      tags: [
        ...(nestDocument.tags ?? []),
        ...(authSchema.tags ?? []).map((tag) => ({
          ...tag,
          name: renameBetterAuthTag({ name: tag.name }),
        })),
        ...tagsFromPaths({ paths: authPaths }),
      ],
    }),
    components: {
      ...nestDocument.components,
      schemas: {
        ...nestDocument.components?.schemas,
        ...jsonRecord({ value: authSchema.components?.schemas }),
      },
      securitySchemes: {
        ...nestDocument.components?.securitySchemes,
        ...jsonRecord({ value: authSchema.components?.securitySchemes }),
      },
    },
  };
}

function prefixPaths({
  paths,
  basePath,
}: {
  paths?: Record<string, object>;
  basePath: string;
}) {
  const prefix = basePath.endsWith("/") ? basePath.slice(0, -1) : basePath;
  const prefixed: Record<string, object> = {};
  for (const [path, item] of Object.entries(paths ?? {})) {
    const suffix = path.startsWith("/") ? path : `/${path}`;
    const fullPath = suffix === prefix || suffix.startsWith(`${prefix}/`) ? suffix : `${prefix}${suffix}`;
    prefixed[fullPath] = item;
  }
  return prefixed;
}

function renameBetterAuthTag({ name }: { name: string }) {
  if (name === "Default") return BETTER_AUTH_TAG;
  if (name === BETTER_AUTH_TAG || name.startsWith(`${BETTER_AUTH_TAG} (`)) {
    return name;
  }
  return `${BETTER_AUTH_TAG} (${name})`;
}

function remapAuthPathTags({ paths }: { paths: Record<string, object> }) {
  const remapped: Record<string, object> = {};
  for (const [path, item] of Object.entries(paths)) {
    remapped[path] = remapPathItemTags({ item });
  }
  return remapped;
}

function remapPathItemTags({ item }: { item: object }) {
  const cloned: Record<string, unknown> = { ...item };
  for (const method of ["get", "post", "put", "patch", "delete"]) {
    const operation = cloned[method];
    if (!operation || typeof operation !== "object") continue;
    const next = { ...(operation as Record<string, unknown>) };
    if (Array.isArray(next.tags)) {
      next.tags = next.tags.map((tag) =>
        typeof tag === "string" ? renameBetterAuthTag({ name: tag }) : tag,
      );
    }
    cloned[method] = next;
  }
  return cloned;
}

function jsonRecord({ value }: { value?: Record<string, object> }) {
  if (!value) return {};
  const cloned: unknown = JSON.parse(JSON.stringify(value));
  if (cloned === null || typeof cloned !== "object" || Array.isArray(cloned)) {
    return {};
  }
  return cloned as Record<string, never>;
}

function tagsFromPaths({ paths }: { paths: Record<string, object> }) {
  const names = new Set<string>();
  for (const item of Object.values(paths)) {
    const operations = item as Record<string, unknown>;
    for (const method of ["get", "post", "put", "patch", "delete"]) {
      const operation = operations[method];
      if (!operation || typeof operation !== "object") continue;
      const tags = (operation as { tags?: unknown }).tags;
      if (!Array.isArray(tags)) continue;
      for (const tag of tags) {
        if (typeof tag === "string") names.add(tag);
      }
    }
  }
  return [...names].map((name) => ({ name }));
}

function uniqueTags({ tags }: { tags: NonNullable<OpenAPIObject["tags"]> }) {
  const seen = new Set<string>();
  const unique: NonNullable<OpenAPIObject["tags"]> = [];
  for (const tag of tags) {
    if (seen.has(tag.name)) continue;
    seen.add(tag.name);
    unique.push(tag);
  }
  return unique;
}
