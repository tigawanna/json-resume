// Loaded before React from `src/client.tsx`. The hook only attaches if this
// module evaluates first; a later import cannot see the component tree.
// https://react.dev/reference/dev-tools/react-devtools-cdt-mcp
//
// Vite inlines `import.meta.env.VITE_*` and drops this branch when the flag
// is unset, so the package stays out of normal dev and production bundles.
// Set `VITE_REACT_DEVTOOLS_MCP=true` in `apps/web/.env` to turn it on.

const enabled = import.meta.env.DEV && import.meta.env.VITE_REACT_DEVTOOLS_MCP === "true";

if (enabled && typeof window !== "undefined") {
  await import("react-devtools-cdt-mcp/register");
}
