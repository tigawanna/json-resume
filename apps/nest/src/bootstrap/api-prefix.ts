export const API_GLOBAL_PREFIX = "api";

export function joinOriginPath({ origin, path }: { origin: string; path: string }) {
  const base = origin.replace(/\/$/, "");
  const suffix = path.replace(/^\//, "");
  return `${base}/${suffix}`;
}

/** Drop the Nest global prefix so OpenAPI paths sit under `servers[0].url`. */
export function pathAfterGlobalPrefix({
  absolutePath,
  prefix,
}: {
  absolutePath: string;
  prefix: string;
}) {
  const normalized = absolutePath.startsWith("/") ? absolutePath : `/${absolutePath}`;
  const head = `/${prefix}`;
  if (normalized === head) return "/";
  if (normalized.startsWith(`${head}/`)) return normalized.slice(head.length);
  return normalized;
}
