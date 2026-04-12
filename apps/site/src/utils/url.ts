export function safeStringToUrl(url: string | URL | undefined): URL | undefined {
  if (!url) {
    return undefined;
  }
  try {
    return new URL(url);
  } catch (err: unknown) {
    console.error("== safeStringToUrl - error", err);
    return undefined;
  }
}
