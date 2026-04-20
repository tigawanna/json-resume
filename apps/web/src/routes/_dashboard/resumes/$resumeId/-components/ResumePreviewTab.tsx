import { Button } from "@/components/ui/button";
import { resumeCollection } from "@/data-access-layer/resume/resumes-query-collection";
import { resumeRegistry } from "@/features/resume/resume-catalog";
import { ResumePdfDocument } from "@/features/resume/resume-pdf";
import { resumePdfFileStem } from "@/features/resume/resume-pdf-filename";
import type { ResumeDocumentV1, TemplateId } from "@/features/resume/resume-schema";
import { resumeDocumentToSpec } from "@/features/resume/resume-to-spec";
import { JSONUIProvider, Renderer } from "@json-render/react";
import { pdf } from "@react-pdf/renderer";
import { eq, useLiveSuspenseQuery } from "@tanstack/react-db";
import { Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface ResumePreviewTabProps {
  resumeId: string;
  selectedTemplate: TemplateId;
  doc: ResumeDocumentV1;
}

export function ResumePreviewTab({ resumeId, selectedTemplate, doc }: ResumePreviewTabProps) {
  const { data: resume } = useLiveSuspenseQuery((q) =>
    q
      .from({ resume: resumeCollection })
      .where(({ resume }) => eq(resume.id, resumeId))
      .findOne(),
  );

  const spec = resumeDocumentToSpec(doc, selectedTemplate);
  const [downloading, setDownloading] = useState(false);

  const fileStem = resumePdfFileStem(resume?.name ?? "resume", doc);

  async function handleDownload() {
    setDownloading(true);
    try {
      const blob = await pdf(
        <ResumePdfDocument doc={doc} templateId={selectedTemplate} pdfTitle={fileStem} />,
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fileStem}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("PDF downloaded");
    } catch (err: unknown) {
      toast.error("Failed to generate PDF", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl" data-test="resume-preview-tab">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          Preview of <span className="font-medium">{resume?.name ?? "Resume"}</span>
        </p>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={downloading}
          onClick={handleDownload}
          data-test="resume-download-pdf-btn">
          {downloading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Download className="size-4" />
          )}
          Download PDF
        </Button>
      </div>
      <div
        className="resume-preview-paper rounded-lg border bg-white p-8 shadow-sm"
        data-test="resume-preview-paper">
        <JSONUIProvider registry={resumeRegistry}>
          <Renderer spec={spec} registry={resumeRegistry} />
        </JSONUIProvider>
      </div>
    </div>
  );
}
