import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { safeParseResumeJson, type ResumeDocumentV1 } from "@/features/resume/resume-schema";
import { ClipboardPaste } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

interface JsonPasteSectionProps {
  onApply: (data: ResumeDocumentV1) => void;
  title?: string;
  description?: ReactNode;
}

export function JsonPasteSection({
  onApply,
  title = "Paste LLM output",
  description,
}: JsonPasteSectionProps) {
  const [pasteText, setPasteText] = useState("");

  function handleApply() {
    const trimmed = pasteText.trim();
    if (!trimmed) {
      toast.error("Paste your JSON first");
      return;
    }
    const result = safeParseResumeJson(trimmed);
    if (result.ok) {
      onApply(result.data);
      toast.success("JSON applied successfully");
    } else {
      toast.error("Invalid resume JSON", { description: result.error });
    }
  }

  return (
    <Card data-test="json-paste-section">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>
          {description ?? (
            <>
              After the LLM returns tailored JSON, paste it here. It will be validated against the
              resume schema before applying.
            </>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Textarea
          className="font-mono text-xs"
          rows={8}
          placeholder='{"version": 1, "meta": {...}, ...}'
          value={pasteText}
          onChange={(e) => setPasteText(e.target.value)}
        />
        <Button
          type="button"
          onClick={handleApply}
          disabled={!pasteText.trim()}
          className="gap-2 self-start"
        >
          <ClipboardPaste className="size-4" />
          Apply JSON
        </Button>
      </CardContent>
    </Card>
  );
}
