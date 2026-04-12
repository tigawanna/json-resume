import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { ResumeDocumentV1 } from "@/features/resume/resume-schema";
import { buildTailorPrompt } from "@/features/resume/resume-prompt";
import { Check, ClipboardCopy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface PromptCopySectionProps {
  baseResume: ResumeDocumentV1;
  jobDescription: string;
  pastedPlainResume?: string;
}

export function PromptCopySection({
  baseResume,
  jobDescription,
  pastedPlainResume,
}: PromptCopySectionProps) {
  const [copied, setCopied] = useState(false);

  const prompt = buildTailorPrompt(baseResume, jobDescription, pastedPlainResume);

  async function handleCopy() {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    toast.success("Prompt copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card data-test="prompt-copy-section">
      <CardHeader>
        <CardTitle className="text-base">Copy LLM prompt</CardTitle>
        <CardDescription>
          Paste this into ChatGPT, Claude, or any LLM. It includes your starter JSON, optional
          pasted resume text, the job description, and instructions to return tailored JSON.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Textarea readOnly className="font-mono text-xs" rows={6} value={prompt} />
        <Button
          type="button"
          variant="secondary"
          onClick={handleCopy}
          disabled={!jobDescription.trim()}
          className="gap-2 self-start"
        >
          {copied ? <Check className="size-4" /> : <ClipboardCopy className="size-4" />}
          {copied ? "Copied!" : "Copy prompt"}
        </Button>
      </CardContent>
    </Card>
  );
}
