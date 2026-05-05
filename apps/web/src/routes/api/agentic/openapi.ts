import {
  agenticCorsHeaders,
  agenticOpenApiSpecPath,
} from "@/features/agentic-tools/agentic-routes";
import { createFileRoute } from "@tanstack/react-router";

const scalarHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Agentic JSON Resume API</title>
  </head>
  <body>
    <script
      id="api-reference"
      data-url="${agenticOpenApiSpecPath}"
      data-configuration='{"theme":"purple"}'
    ></script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  </body>
</html>`;

export const Route = createFileRoute("/api/agentic/openapi")({
  server: {
    handlers: {
      GET: async () =>
        new Response(scalarHtml, {
          status: 200,
          headers: {
            ...agenticCorsHeaders,
            "Content-Type": "text/html; charset=utf-8",
          },
        }),
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: agenticCorsHeaders,
        }),
    },
  },
});
