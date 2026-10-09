// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-start/server-only", () => ({}));

const mockListResumesTool = vi.fn();
vi.mock("./resume-tools.server", () => ({
  listResumesTool: (...args: unknown[]) => mockListResumesTool(...args),
  getResumeTool: vi.fn(),
}));
vi.mock("./library-tools.server", () => ({
  searchLibraryTool: vi.fn(),
  rankLibraryForJobTool: vi.fn(),
}));
vi.mock("./job-tools.server", () => ({
  listJobsTool: vi.fn(),
  getJobTool: vi.fn(),
}));
vi.mock("./rank-tools.server", () => ({
  rankResumesForJobTool: vi.fn(),
}));

import { resumeMcpServer } from "./resume-mcp.server";

function rpc(method: string, params: Record<string, unknown>) {
  return new Request("http://localhost/api/mcp", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      "mcp-protocol-version": "2025-06-18",
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
}

async function rpcResult(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text();
  const json = text.startsWith("{")
    ? text
    : (text
        .split("\n")
        .find((line) => line.startsWith("data:"))
        ?.slice(5) ?? "{}");
  const parsed: { result?: Record<string, unknown>; error?: unknown } = JSON.parse(json);
  if (!parsed.result) throw new Error(`MCP error: ${JSON.stringify(parsed.error ?? text)}`);
  return parsed.result;
}

type ListedTool = {
  name: string;
  inputSchema: { required?: string[] };
  annotations?: { readOnlyHint?: boolean };
};

describe("resume MCP server", () => {
  beforeEach(() => {
    mockListResumesTool.mockReset();
  });

  it("lists the shared remote tools as read-only", async () => {
    const result = await rpcResult(
      await resumeMcpServer.handle(rpc("tools/list", {}), { context: { userId: "u1" } }),
    );
    const tools = result.tools as ListedTool[];

    expect(tools.map((tool) => tool.name).sort()).toEqual([
      "get_job",
      "get_resume",
      "list_jobs",
      "list_resumes",
      "rank_library_for_job",
      "rank_resumes_for_job",
      "search_library",
    ]);
    expect(tools.every((tool) => tool.annotations?.readOnlyHint === true)).toBe(true);
  });

  it("keeps optional search inputs optional in the advertised schema", async () => {
    const result = await rpcResult(
      await resumeMcpServer.handle(rpc("tools/list", {}), { context: { userId: "u1" } }),
    );
    const search = (result.tools as ListedTool[]).find((tool) => tool.name === "search_library");

    expect(search?.inputSchema.required ?? []).not.toContain("resumeId");
    expect(search?.inputSchema.required ?? []).not.toContain("keyword");
  });

  it("passes the authenticated userId from handle context to the tool", async () => {
    const page = { resumes: [], total: 0, nextOffset: null };
    mockListResumesTool.mockResolvedValue(page);

    const result = await rpcResult(
      await resumeMcpServer.handle(
        rpc("tools/call", { name: "list_resumes", arguments: { keyword: "react" } }),
        { context: { userId: "user-42" } },
      ),
    );

    expect(mockListResumesTool).toHaveBeenCalledWith(
      { userId: "user-42" },
      expect.objectContaining({ keyword: "react" }),
    );
    expect(result.structuredContent).toEqual(page);
  });

  it("refuses to run a tool without a userId in context", async () => {
    const result = await rpcResult(
      await resumeMcpServer.handle(rpc("tools/call", { name: "list_resumes", arguments: {} })),
    );

    expect(result.isError).toBe(true);
    expect(mockListResumesTool).not.toHaveBeenCalled();
  });
});
