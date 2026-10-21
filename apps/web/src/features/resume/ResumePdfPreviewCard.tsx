import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResumePdfDocument } from "@/features/resume/resume-pdf";
import { resumePdfFileStem } from "@/features/resume/resume-pdf-filename";
import type { ResumeDocumentV1, TemplateId } from "@/features/resume/resume-schema";
import { pdf } from "@react-pdf/renderer";
import { Download, Loader2, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

function pdfPreviewBody({
  generating,
  blobUrl,
  fileLabel,
}: {
  generating: boolean;
  blobUrl: string | null;
  fileLabel: string;
  minHeightClass: string;
}) {
  if (generating && !blobUrl) {
    return (
      <div className="flex min-h-150 items-center justify-center">
        <Loader2 className="text-base-content/40 size-8 animate-spin" />
      </div>
    );
  }
  if (blobUrl) {
    return (
      <iframe
        src={blobUrl}
        title={fileLabel}
        className="h-[80vh] min-h-150 w-full rounded-lg border"
        data-test="pdf-preview-iframe"
      />
    );
  }
  return (
    <p className="text-base-content/60 py-12 text-center text-sm">
      Click Regenerate to build the PDF preview.
    </p>
  );
}

export function ResumePdfPreviewCard({
  doc,
  templateId,
  resumeName,
}: {
  doc: ResumeDocumentV1;
  templateId: TemplateId;
  resumeName?: string;
}) {
  const fileStem = resumePdfFileStem(resumeName, doc);
  const fileLabel = `${fileStem}.pdf`;
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const prevUrlRef = useRef<string | null>(null);

  async function generate() {
    setGenerating(true);
    try {
      const blob = await pdf(
        <ResumePdfDocument doc={doc} templateId={templateId} pdfTitle={fileStem} />,
      ).toBlob();
      if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current);
      const file = new File([blob], fileLabel, { type: "application/pdf" });
      const url = URL.createObjectURL(file);
      prevUrlRef.current = url;
      setBlobUrl(url);
    } catch (err: unknown) {
      toast.error("Failed to generate PDF", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setGenerating(false);
    }
  }

  useEffect(() => {
    void generate();
    return () => {
      if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleDownload() {
    if (!blobUrl) return;
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = fileLabel;
    a.click();
    toast.success("PDF downloaded");
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>PDF preview</CardTitle>
            <CardDescription>
              File: {fileLabel}. Regenerate after edits to see the latest version.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={generating}
              onClick={() => void generate()}
              className="gap-1.5"
            >
              {generating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              Regenerate
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!blobUrl || generating}
              onClick={handleDownload}
              className="gap-1.5"
            >
              <Download className="size-4" />
              Download
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {pdfPreviewBody({ generating, blobUrl, fileLabel, minHeightClass: "min-h-150 h-[80vh]" })}
      </CardContent>
    </Card>
  );
}
