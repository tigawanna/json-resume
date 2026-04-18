import { Button } from "@/components/ui/button";
import { resumeDetailToDocument } from "@/data-access-layer/resume/resume-converters";
import type { ResumeDetailDTO } from "@/data-access-layer/resume/resume.types";
import { resumeRegistry } from "@/features/resume/resume-catalog";
import { ResumePdfDocument } from "@/features/resume/resume-pdf";
import { resumePdfFileStem } from "@/features/resume/resume-pdf-filename";
import type { TemplateId } from "@/features/resume/resume-schema";
import { resumeDocumentToSpec } from "@/features/resume/resume-to-spec";
import { JSONUIProvider, Renderer } from "@json-render/react";
import { pdf } from "@react-pdf/renderer";
import { Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface ResumePreviewTabProps {
  resume: ResumeDetailDTO;
  templateId?: TemplateId;
}

export function ResumePreviewTab({ resume, templateId }: ResumePreviewTabProps) {
  const tid = (templateId ?? resume.templateId) as TemplateId;
  const doc = resumeDetailToDocument(resume);
  const spec = resumeDocumentToSpec(doc, tid);
  const [downloading, setDownloading] = useState(false);

  const fileStem = resumePdfFileStem(resume.name, doc);

  async function handleDownload() {
    setDownloading(true);
    try {
      const blob = await pdf(
        <ResumePdfDocument doc={doc} templateId={tid} pdfTitle={fileStem} />,
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
          Preview of <span className="font-medium">{resume.name}</span>
        </p>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={downloading}
          onClick={handleDownload}
          data-test="resume-download-pdf-btn"
        >
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
        data-test="resume-preview-paper"
      >
        <JSONUIProvider registry={resumeRegistry}>
          <Renderer spec={spec} registry={resumeRegistry} />
        </JSONUIProvider>
      </div>
    </div>
  );
}
