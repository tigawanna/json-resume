import { Button } from "@/components/ui/button";
import { unwrapUnknownError } from "@/utils/errors";
import { Check, ClipboardCopy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface CopyTextButtonProps {
  text: string;
  label?: string;
  /** Toast title on success. */
  copiedMessage?: string;
  /** Icon-only, with `label` as the accessible name. */
  compact?: boolean;
  dataTest?: string;
}

export function CopyTextButton({
  text,
  label = "Copy",
  copiedMessage = "Copied",
  compact = false,
  dataTest,
}: CopyTextButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
      toast.success(copiedMessage);
    } catch (err: unknown) {
      toast.error("Could not copy", { description: unwrapUnknownError(err).message });
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size={compact ? "icon-sm" : "sm"}
      disabled={!text.trim()}
      onClick={() => void handleCopy()}
      aria-label={label}
      title={label}
      data-test={dataTest}
    >
      {copied ? <Check className="size-4" /> : <ClipboardCopy className="size-4" />}
      {compact ? null : label}
    </Button>
  );
}
