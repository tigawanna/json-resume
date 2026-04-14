import { CollapsibleJsonView } from "@/components/CollapsibleJsonView";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { updateResume } from "@/data-access-layer/resume/resume.functions";
import type { ResumeDTO } from "@/data-access-layer/resume/resume.types";
import { resumeRegistry } from "@/features/resume/resume-catalog";
import { ResumePdfDocument } from "@/features/resume/resume-pdf";
import {
  safeParseResumeJson,
  TEMPLATE_IDS,
  TEMPLATE_LABELS,
  type ResumeDocumentV1,
  type TemplateId,
} from "@/features/resume/resume-schema";
import { resumeDocumentToSpec } from "@/features/resume/resume-to-spec";
import { ResumeEditForm } from "@/routes/_public/resume/-components/ResumeEditForm";
import { JSONUIProvider, Renderer } from "@json-render/react";
import { PatchDiff } from "@pierre/diffs/react";
import { pdf } from "@react-pdf/renderer";
import { useMutation } from "@tanstack/react-query";
import { createPatch } from "diff";
import { Download, Loader2, RefreshCw, Save } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { twMerge } from "tailwind-merge";

interface SavedResumeWorkbenchProps {
  savedResume: ResumeDTO;
}

export function SavedResumeWorkbench({ savedResume }: SavedResumeWorkbenchProps) {
  const initialDoc = savedResume.data;
  const [doc, setDoc] = useState<ResumeDocumentV1>(initialDoc);
  const [name, setName] = useState(savedResume.name);
  const [description, setDescription] = useState(savedResume.description);
  const [jobDescription, setJobDescription] = useState(savedResume.jobDescription);
  const [baselineJson, setBaselineJson] = useState<string | null>(null);
  const [importText, setImportText] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const initialJson = useRef(JSON.stringify(initialDoc));

  useEffect(() => {
    const currentJson = JSON.stringify(doc);
    const metaChanged =
      name !== savedResume.name ||
      description !== savedResume.description ||
      jobDescription !== savedResume.jobDescription;
    setHasUnsavedChanges(currentJson !== initialJson.current || metaChanged);
  }, [doc, name, description, jobDescription, savedResume]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      return updateResume({
        data: {
          id: savedResume.id,
          name: name.trim(),
          description: description.trim(),
          jobDescription: jobDescription.trim(),
          data: doc,
        },
      });
    },
    onSuccess() {
      initialJson.current = JSON.stringify(doc);
      setHasUnsavedChanges(false);
      toast.success("Resume saved");
    },
    onError(err: unknown) {
      toast.error("Failed to save", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    },
    meta: { invalidates: [["resumes"]] },
  });

  const templateId = doc.meta.templateId;

  function setTemplate(tid: TemplateId) {
    setDoc((prev) => ({ ...prev, meta: { ...prev.meta, templateId: tid } }));
  }

  const previewSpec = resumeDocumentToSpec(doc, templateId);
  const currentJson = JSON.stringify(doc, null, 2);
  const exportJsonTree = useMemo(() => {
    try {
      return JSON.parse(currentJson) as unknown;
    } catch {
      return null;
    }
  }, [currentJson]);

  const diffPatch = (() => {
    const before = baselineJson ?? "";
    return createPatch("resume.json", before, currentJson, "", "", { context: 3 });
  })();

  function applyImport() {
    const r = safeParseResumeJson(importText);
    if (r.ok) {
      setDoc(r.data);
      toast.success("JSON applied");
    } else {
      toast.error("Invalid resume JSON", { description: r.error });
    }
  }

  return (
    <div className="flex w-full flex-col gap-6" data-test="saved-resume-workbench">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-name" className="text-xs">
              Name
            </Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="max-w-md"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-desc" className="text-xs">
              Description
            </Label>
            <Input
              id="edit-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="max-w-md"
              placeholder="Brief note about this version"
            />
          </div>
        </div>
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || !hasUnsavedChanges}
          className="shrink-0 gap-2">
          <Save className="size-4" />
          {saveMutation.isPending ? "Saving..." : hasUnsavedChanges ? "Save changes" : "Saved"}
        </Button>
      </div>

      <TemplatePicker selected={templateId} onSelect={setTemplate} />

      <Tabs defaultValue="edit" className="w-full">
        <TabsList className="flex flex-wrap gap-1">
          <TabsTrigger value="edit">Edit</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="pdf">PDF</TabsTrigger>
          <TabsTrigger value="diff">Diff</TabsTrigger>
          <TabsTrigger value="json">JSON</TabsTrigger>
          <TabsTrigger value="jd">Job description</TabsTrigger>
        </TabsList>

        <TabsContent value="edit" className="mt-4">
          <ResumeEditForm doc={doc} onChange={setDoc} />
        </TabsContent>

        <TabsContent value="preview" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>json-render preview</CardTitle>
              <CardDescription>
                Read-only UI from your data. Tailor the underlying JSON in an LLM, then paste it on
                the JSON tab.
              </CardDescription>
            </CardHeader>
            <CardContent className="bg-base-200 rounded-lg border p-4">
              <JSONUIProvider registry={resumeRegistry}>
                <Renderer spec={previewSpec} registry={resumeRegistry} />
              </JSONUIProvider>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pdf" className="mt-4">
          <PdfPreview doc={doc} templateId={templateId} />
        </TabsContent>

        <TabsContent value="diff" className="mt-4 flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => setBaselineJson(currentJson)}>
              Set baseline from current
            </Button>
            <Button type="button" variant="outline" onClick={() => setBaselineJson(null)}>
              Clear baseline
            </Button>
          </div>
          {!baselineJson ? (
            <p className="text-base-content/60 text-sm">
              Set a baseline to compare future edits (e.g. before pasting LLM output).
            </p>
          ) : (
            <div className="bg-base-200 min-h-[320px] w-full overflow-auto rounded-lg border p-2">
              <PatchDiff patch={diffPatch} className="w-full" disableWorkerPool />
            </div>
          )}
        </TabsContent>

        <TabsContent value="json" className="mt-4 flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Export / import</CardTitle>
              <CardDescription>
                Copy this JSON into your assistant with a job description, then paste the result
                below.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <CardDescription className="pb-1">
                Expand keys to inspect nested data. Long strings stay collapsed until opened.
              </CardDescription>
              {exportJsonTree !== null ? (
                <div data-test="resume-json-export">
                  <CollapsibleJsonView data={exportJsonTree} />
                </div>
              ) : (
                <Textarea readOnly className="font-mono text-xs" rows={12} value={currentJson} />
              )}
              <Button
                type="button"
                variant="secondary"
                onClick={async () => {
                  await navigator.clipboard.writeText(currentJson);
                  toast.success("Copied to clipboard");
                }}>
                Copy JSON
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Paste JSON</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Textarea
                className="font-mono text-xs"
                rows={10}
                placeholder="{ ... }"
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
              />
              <Button type="button" onClick={applyImport}>
                Apply JSON
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="jd" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Job description</CardTitle>
              <CardDescription>
                The job posting this resume was tailored for. Update it anytime.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                rows={12}
                placeholder="Paste the job posting here..."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PdfPreview({ doc, templateId }: { doc: ResumeDocumentV1; templateId: TemplateId }) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const prevUrlRef = useRef<string | null>(null);

  async function generate() {
    setGenerating(true);
    try {
      const blob = await pdf(<ResumePdfDocument doc={doc} templateId={templateId} />).toBlob();
      if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current);
      const url = URL.createObjectURL(blob);
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
    a.download = "resume.pdf";
    a.click();
    toast.success("PDF downloaded");
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>PDF preview</CardTitle>
            <CardDescription>Regenerate after edits to see the latest version.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={generating}
              onClick={() => void generate()}
              className="gap-1.5">
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
              className="gap-1.5">
              <Download className="size-4" />
              Download
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {generating && !blobUrl ? (
          <div className="flex min-h-[600px] items-center justify-center">
            <Loader2 className="text-base-content/40 size-8 animate-spin" />
          </div>
        ) : blobUrl ? (
          <iframe
            src={blobUrl}
            title="PDF preview"
            className="h-[80vh] min-h-[600px] w-full rounded-lg border"
            data-test="pdf-preview-iframe"
          />
        ) : (
          <p className="text-base-content/60 py-12 text-center text-sm">
            Click Regenerate to build the PDF preview.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

const TEMPLATE_DESCRIPTIONS: Record<TemplateId, string> = {
  classic: "Single column, centered headings, clean dividers",
  sidebar: "Two columns — main left, sidebar right",
  accent: "Single column with warm accent color",
  modern: "Two columns with cool accent color",
};

function TemplatePicker({
  selected,
  onSelect,
}: {
  selected: TemplateId;
  onSelect: (id: TemplateId) => void;
}) {
  return (
    <div className="flex flex-col gap-2" data-test="template-picker">
      <h2 className="text-base-content text-sm font-medium">Template</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {TEMPLATE_IDS.map((tid) => (
          <button
            key={tid}
            type="button"
            onClick={() => onSelect(tid)}
            className={twMerge(
              "flex flex-col items-start gap-1 rounded-lg border-2 p-3 text-left transition-colors",
              tid === selected
                ? "border-primary bg-primary/5"
                : "border-base-300 hover:border-base-content/30",
            )}
            data-test={`template-${tid}`}>
            <span className="text-base-content text-sm font-semibold">{TEMPLATE_LABELS[tid]}</span>
            <span className="text-base-content/60 text-xs">{TEMPLATE_DESCRIPTIONS[tid]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
