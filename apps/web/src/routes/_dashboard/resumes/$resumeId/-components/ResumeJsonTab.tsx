import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { resumeDetailToDocument } from "@/data-access-layer/resume/resume-converters";
import type { ResumeDetailDTO } from "@/data-access-layer/resume/resume.types";
import { safeParseResumeJson, type ResumeDocumentV1 } from "@/features/resume/resume-schema";
import type { JsonValue } from "@visual-json/core";
import { SearchBar, TreeView, VisualJson } from "@visual-json/react";
import { ClipboardCopy, ClipboardPaste } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface ResumeJsonTabProps {
  resume: ResumeDetailDTO;
  onImport?: (doc: ResumeDocumentV1) => void;
}

export function ResumeJsonTab({ resume, onImport }: ResumeJsonTabProps) {
  const doc = resumeDetailToDocument(resume);
  const [jsonValue, setJsonValue] = useState<JsonValue>(doc as JsonValue);
  const [pasteText, setPasteText] = useState("");

  async function handleCopy() {
    await navigator.clipboard.writeText(JSON.stringify(jsonValue, null, 2));
    toast.success("Copied to clipboard");
  }

  function handleApplyPaste() {
    const trimmed = pasteText.trim();
    if (!trimmed) {
      toast.error("Paste your JSON first");
      return;
    }
    const result = safeParseResumeJson(trimmed);
    if (result.ok) {
      setJsonValue(result.data);
      onImport?.(result.data);
      setPasteText("");
      toast.success("JSON applied");
    } else {
      toast.error("Invalid resume JSON", { description: result.error });
    }
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6" data-test="resume-json-tab">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resume JSON</CardTitle>
          <CardDescription>
            Browse and inspect your resume data. Copy the JSON to paste into an LLM, or paste
            tailored output below to import.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="bg-muted h-[500px] overflow-auto rounded-lg border">
            <VisualJson value={jsonValue} onChange={setJsonValue}>
              <div className="flex flex-col gap-0">
                <div className="border-b px-2 py-1.5">
                  <SearchBar className="w-full" />
                </div>
                <TreeView className="h-[460px]" />
              </div>
            </VisualJson>
          </div>
          <Button
            type="button"
            variant="secondary"
            className="gap-2 self-start"
            onClick={handleCopy}
          >
            <ClipboardCopy className="size-4" />
            Copy JSON
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Paste JSON</CardTitle>
          <CardDescription>
            Paste tailored JSON from an LLM here. It will be validated against the resume schema
            before applying.
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
            onClick={handleApplyPaste}
            disabled={!pasteText.trim() || !onImport}
            className="gap-2 self-start"
          >
            <ClipboardPaste className="size-4" />
            Apply JSON
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
