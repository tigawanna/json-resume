import "@tanstack/react-start/server-only";

import { createMCPServer } from "@tanstack/ai-mcp/server";
import { remoteResumeTools } from "./remote-tools.server";

export const resumeMcpServer = createMCPServer({
  name: "agentic-json-resume",
  version: "0.2.0",
  tools: remoteResumeTools,
});
