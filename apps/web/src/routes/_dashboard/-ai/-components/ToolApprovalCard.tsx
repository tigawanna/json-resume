import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ShieldAlert } from "lucide-react";

export interface ToolApprovalRequest {
  id: string;
  toolName: string;
  title: string;
  detail: string;
  args: unknown;
  approve: () => void;
  deny: () => void;
}

interface ToolApprovalCardProps {
  approvals: ToolApprovalRequest[];
  resuming: boolean;
}

export function ToolApprovalCard({ approvals, resuming }: ToolApprovalCardProps) {
  if (approvals.length === 0) return null;

  return (
    <div className="flex flex-col gap-3" data-test="ai-tool-approvals">
      {approvals.map((approval) => (
        <Card
          key={approval.id}
          className="border-warning/60 gap-3 py-4"
          data-test={`ai-tool-approval-${approval.toolName}`}
        >
          <CardHeader className="px-4">
            <CardTitle className="flex items-center gap-2 text-sm">
              <ShieldAlert className="text-warning size-4" aria-hidden />
              {approval.title}
            </CardTitle>
            <CardDescription>{approval.detail}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 px-4">
            <Collapsible>
              <CollapsibleTrigger
                className="text-base-content/70 hover:text-base-content flex items-center gap-1 text-xs"
                data-test="ai-tool-approval-toggle-args"
              >
                <ChevronDown className="size-3" aria-hidden />
                Show what will be written
              </CollapsibleTrigger>
              <CollapsibleContent>
                <pre className="bg-base-200 mt-2 max-h-64 overflow-auto rounded-md p-3 text-xs">
                  {JSON.stringify(approval.args, null, 2)}
                </pre>
              </CollapsibleContent>
            </Collapsible>
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={resuming}
                onClick={approval.deny}
                data-test="ai-tool-approval-deny"
              >
                Deny
              </Button>
              <Button
                size="sm"
                disabled={resuming}
                onClick={approval.approve}
                data-test="ai-tool-approval-approve"
              >
                Approve
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
