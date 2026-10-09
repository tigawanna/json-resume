import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { buildTailorPrompt } from "@/features/resume/resume-prompt";
import { safeParseResumeJson, type ResumeDocumentV1 } from "@/features/resume/resume-schema";
import { extractJsonObject } from "@/utils/extract-json";
import { Check, ClipboardCopy, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface PromptCopySectionProps {
  doc: ResumeDocumentV1;
  jobDescription: string;
  onApplyResult?: (doc: ResumeDocumentV1) => void;
  isApplying?: boolean;
}

export function PromptCopySection({
  doc,
  jobDescription,
  onApplyResult,
  isApplying,
}: PromptCopySectionProps) {
  const [copied, setCopied] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState<string | null>(null);
  const [directives, setDirectives] = useState<string[]>([]);
  const [newDirective, setNewDirective] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [pasteError, setPasteError] = useState<string | null>(null);

  const basePrompt = buildTailorPrompt(doc, jobDescription);
  const fullPrompt =
    (editedPrompt || basePrompt) +
    (directives.length > 0 ? "\n\n## Additional Directives:\n" + directives.join("\n") : "");

  async function handleCopy() {
    await navigator.clipboard.writeText(fullPrompt);
    setCopied(true);
    toast.success("Prompt copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }

  function addDirective() {
    if (newDirective.trim()) {
      setDirectives((prev) => [...prev, newDirective.trim()]);
      setNewDirective("");
    }
  }

  function removeDirective(index: number) {
    setDirectives((prev) => prev.filter((_, i) => i !== index));
  }

  function resetPrompt() {
    setEditedPrompt(null);
    toast.info("Prompt reset to default");
  }

  return (
    <Card data-test="prompt-copy-section">
      <CardHeader>
        <CardTitle className="text-base">Copy LLM Prompt</CardTitle>
        <CardDescription>
          Paste this into ChatGPT, Claude, Gemini, DeepSeek or any other LLM. It includes your
          résumé JSON, the target job description, and instructions to return tailored JSON you can
          paste back below.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {/* Editable Prompt */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="prompt-area" className="text-xs font-medium">
            Prompt (editable)
          </Label>
          <Textarea
            id="prompt-area"
            className="font-mono text-xs"
            rows={8}
            value={editedPrompt || basePrompt}
            onChange={(e) => setEditedPrompt(e.target.value)}
            placeholder="Your prompt will appear here..."
          />
          {editedPrompt && (
            <Button variant="ghost" size="sm" onClick={resetPrompt} className="w-fit">
              <X className="mr-1 size-3" /> Reset to Default
            </Button>
          )}
        </div>

        {/* Directives Section */}
        <div className="flex flex-col gap-2 border-t pt-4">
          <Label className="text-xs font-medium">Directives (extra instructions)</Label>
          <p className="text-muted-foreground text-xs">
            Add custom snippets to append to the prompt
          </p>

          {directives.length > 0 && (
            <div className="flex flex-col gap-2">
              {directives.map((directive, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 rounded bg-secondary p-2 text-sm"
                >
                  <span className="flex-1">{directive}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-5 shrink-0"
                    onClick={() => removeDirective(index)}
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <Input
              value={newDirective}
              onChange={(e) => setNewDirective(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  addDirective();
                }
              }}
              placeholder="Add a directive and press Enter..."
              className="text-sm"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addDirective}
              className="gap-1"
            >
              <Plus className="size-3" /> Add
            </Button>
          </div>
        </div>

        {/* Copy Button */}
        <Button type="button" variant="secondary" onClick={handleCopy} className="gap-2 self-start">
          {copied ? <Check className="size-4" /> : <ClipboardCopy className="size-4" />}
          {copied ? "Copied!" : "Copy prompt"}
        </Button>

        {/* Paste LLM result */}
        {onApplyResult && (
          <div className="flex flex-col gap-2 border-t pt-4">
            <Label htmlFor="prompt-result" className="text-xs font-medium">
              Paste LLM result
            </Label>
            <p className="text-muted-foreground text-xs">
              Paste the reply (code fences are fine). Items are matched against your library so
              nothing is duplicated; anything that differs from your library is shown for review
              before it is saved.
            </p>
            <Textarea
              id="prompt-result"
              className="font-mono text-xs"
              rows={8}
              placeholder='{ "version": 1, ... }'
              value={pasteText}
              onChange={(e) => {
                setPasteText(e.target.value);
                setPasteError(null);
              }}
              data-test="prompt-result-input"
            />
            {pasteError && <p className="text-destructive text-xs">{pasteError}</p>}
            <Button
              type="button"
              disabled={!pasteText.trim() || isApplying}
              onClick={() => {
                const result = safeParseResumeJson(extractJsonObject(pasteText));
                if (!result.ok) {
                  setPasteError(result.error);
                  return;
                }
                setPasteError(null);
                onApplyResult(result.data);
              }}
              className="self-start gap-2"
              data-test="prompt-result-import"
            >
              {isApplying ? "Importing..." : "Import result"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
