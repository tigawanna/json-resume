import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@tanstack/react-router";
import { Plug } from "lucide-react";

export function McpConnectSection() {
  return (
    <Card data-test="mcp-connect-section">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>MCP Connection</CardTitle>
            <CardDescription>
              Connect your IDE to access and manage resumes with AI assistants.
            </CardDescription>
          </div>
          <Button asChild variant="outline" size="sm" data-test="connect-mcp-btn">
            <Link to="/oauth/consent" search={{ mode: "mcp-connect" }}>
              <Plug className="mr-1 size-4" /> Connect MCP
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm">
          Model Context Protocol (MCP) lets AI assistants in Cursor and VS Code directly read and
          update your resume data through a secure OAuth-protected connection.
        </p>
      </CardContent>
    </Card>
  );
}
