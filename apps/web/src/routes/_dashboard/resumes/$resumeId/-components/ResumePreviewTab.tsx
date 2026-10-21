import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ResumeComponentPaper } from "@/features/resume/ResumeComponentPaper";
import type { ResumeDocumentV1, TemplateId } from "@/features/resume/resume-schema";
import { resumeDocumentToSpec } from "@/features/resume/resume-to-spec";
import { useResumePdf } from "@/features/resume/use-resume-pdf";
import { useThemeContext } from "@/lib/tanstack/router/theme-provider";
import type { Spec } from "@json-render/core";
import { Download, FileText, Loader2, Moon, RefreshCw, Sun } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type PreviewPane = "component" | "pdf";
type PreviewTheme = "light" | "dark";

function pdfPreviewBody({
  generating,
  blobUrl,
  fileLabel,
  empty = "Regenerate to build the PDF preview.",
}: {
  generating: boolean;
  blobUrl: string | null;
  fileLabel: string;
  minHeightClass?: string;
  empty?: string;
  frameClass?: string;
}) {
  if (generating && !blobUrl) {
    return (
      <div className="flex h-[72vh] min-h-150 items-center justify-center">
        <Loader2 className="text-base-content/40 size-8 animate-spin" />
      </div>
    );
  }
  if (blobUrl) {
    return (
      <iframe
        src={blobUrl}
        title={fileLabel}
        className="h-[72vh] min-h-150 w-full rounded-md border bg-white"
        data-test="pdf-preview-iframe"
      />
    );
  }
  return <p className="text-base-content/60 py-12 text-center text-sm">{empty}</p>;
}

function isPreviewPane(value: string): value is PreviewPane {
  return value === "component" || value === "pdf";
}

interface ResumePreviewViewProps {
  resumeName: string;
  selectedTemplate: TemplateId;
  doc: ResumeDocumentV1;
}

export function ResumePreviewView({ resumeName, selectedTemplate, doc }: ResumePreviewViewProps) {
  const { resolvedTheme } = useThemeContext();

  const spec = resumeDocumentToSpec(doc, selectedTemplate);
  const [previewPane, setPreviewPane] = useState<PreviewPane>("component");
  const [previewTheme, setPreviewTheme] = useState<PreviewTheme>(resolvedTheme);
  const [downloading, setDownloading] = useState(false);
  const {
    blobUrl,
    generating,
    fileLabel,
    regenerate: buildPdfPreview,
  } = useResumePdf({ doc, templateId: selectedTemplate, resumeName });

  async function handleDownload() {
    setDownloading(true);
    try {
      const url = blobUrl;
      if (!url) {
        await buildPdfPreview();
        return;
      }
      const a = document.createElement("a");
      a.href = url;
      a.download = fileLabel;
      a.click();
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
    <div className="mx-auto w-full max-w-400" data-test="resume-preview-tab">
      <div className="mb-4">
        <p className="text-muted-foreground text-sm">
          Preview of <span className="font-medium">{resumeName}</span>
        </p>
      </div>

      <Tabs
        value={previewPane}
        onValueChange={(value) => {
          if (isPreviewPane(value)) setPreviewPane(value);
        }}
        className="w-full"
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="component">
              <FileText className="size-4" />
              Component
            </TabsTrigger>
            <TabsTrigger value="pdf">
              <Download className="size-4" />
              PDF
            </TabsTrigger>
          </TabsList>

          {previewPane === "component" ? (
            <ToggleGroup
              type="single"
              value={previewTheme}
              onValueChange={(value) => {
                if (value === "light" || value === "dark") setPreviewTheme(value);
              }}
              variant="outline"
              size="sm"
              data-test="resume-preview-theme-toggle"
            >
              <ToggleGroupItem value="light" aria-label="Show light component preview">
                <Sun className="size-4" />
                Light
              </ToggleGroupItem>
              <ToggleGroupItem value="dark" aria-label="Show dark component preview">
                <Moon className="size-4" />
                Dark
              </ToggleGroupItem>
            </ToggleGroup>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={generating}
                onClick={() => void buildPdfPreview()}
                data-test="resume-regenerate-pdf-btn"
              >
                {generating ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <RefreshCw className="size-4" />
                )}
                Regenerate PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={downloading || generating || !blobUrl}
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
          )}
        </div>

        <TabsContent value="component" className="mt-0">
          <ResumeComponentPreviewPanel spec={spec} theme={previewTheme} />
        </TabsContent>

        <TabsContent value="pdf" className="mt-0">
          <section
            className="bg-base-200 border-base-content/10 min-w-0 overflow-hidden rounded-lg border"
            data-test="resume-pdf-preview-panel"
          >
            <div className="border-base-content/10 flex min-h-12 items-center justify-between gap-3 border-b px-4 py-3">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold">PDF preview</h2>
                <p className="text-muted-foreground truncate text-xs">{fileLabel}</p>
              </div>
              {generating ? (
                <span className="text-muted-foreground inline-flex items-center gap-2 text-xs">
                  <Loader2 className="size-3.5 animate-spin" />
                  Rendering
                </span>
              ) : null}
            </div>
            <div className="bg-base-100 p-3">
              {pdfPreviewBody({
                generating,
                blobUrl,
                fileLabel,
                minHeightClass: "h-[72vh] min-h-150",
                empty: "Regenerate to build the PDF preview.",
                frameClass: "rounded-md border bg-white",
              })}
            </div>
          </section>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ResumeComponentPreviewPanel({ spec, theme }: { spec: Spec; theme: PreviewTheme }) {
  return (
    <section
      className="bg-base-200 border-base-content/10 min-w-0 overflow-hidden rounded-lg border"
      data-test={`resume-component-preview-${theme}`}
    >
      <div className="border-base-content/10 border-b px-4 py-3">
        <h2 className="text-sm font-semibold">
          {theme === "light" ? "Light" : "Dark"} component preview
        </h2>
      </div>
      <div
        className="h-[72vh] min-h-150 overflow-auto bg-base-100 p-6"
        data-test={`resume-preview-paper-${theme}`}
      >
        <ResumeComponentPaper spec={spec} theme={theme} />
      </div>
    </section>
  );
}
