import { Button } from "@/components/ui/button";
import { unwrapUnknownError } from "@/utils/errors";
import { Check, ClipboardCopy, FileDown, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { copyCoverLetter } from "./cover-letter-format";
import { downloadCoverLetterPdf } from "./cover-letter-pdf";

interface CoverLetterActionsProps {
  title: string;
  body: string;
  /** Icon-only buttons for tight headers. */
  compact?: boolean;
}

export function CoverLetterActions({ title, body, compact = false }: CoverLetterActionsProps) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const empty = !body.trim();

  async function handleCopy() {
    try {
      await copyCoverLetter(body);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
      toast.success("Cover letter copied", {
        description: "Paste it into Google Docs or Word to keep the formatting.",
      });
    } catch (err: unknown) {
      toast.error("Could not copy the cover letter", {
        description: unwrapUnknownError(err).message,
      });
    }
  }

  async function handleDownload() {
    setDownloading(true);
    try {
      await downloadCoverLetterPdf({ title, body });
    } catch (err: unknown) {
      toast.error("Failed to generate PDF", { description: unwrapUnknownError(err).message });
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      <Button
        type="button"
        variant="outline"
        size={compact ? "icon-sm" : "sm"}
        disabled={empty}
        onClick={() => void handleCopy()}
        aria-label="Copy for Google Docs"
        title="Copy with formatting, for Google Docs or Word"
        data-test="cover-letter-copy"
      >
        {copied ? <Check className="size-4" /> : <ClipboardCopy className="size-4" />}
        {compact ? null : "Copy for Docs"}
      </Button>
      <Button
        type="button"
        variant="outline"
        size={compact ? "icon-sm" : "sm"}
        disabled={empty || downloading}
        onClick={() => void handleDownload()}
        aria-label="Download PDF"
        title="Download PDF"
        data-test="cover-letter-download-pdf"
      >
        {downloading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <FileDown className="size-4" />
        )}
        {compact ? null : "PDF"}
      </Button>
    </div>
  );
}
