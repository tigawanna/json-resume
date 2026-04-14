import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { resumeListQueryOptions } from "@/data-access-layer/resume/resume-query-options";
import { createResume } from "@/data-access-layer/resume/resume.functions";
import { resumeDocumentToPlainText } from "@/features/resume/resume-document-to-plain-text";
import {
  createDefaultResume,
  safeParseResumeJson,
  type ResumeDocumentV1,
} from "@/features/resume/resume-schema";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { BaseResumeSelector } from "./-components/BaseResumeSelector";
import { JsonPasteSection } from "./-components/JsonPasteSection";
import { PromptCopySection } from "./-components/PromptCopySection";

export const Route = createFileRoute("/_dashboard/resumes/create/")({
  component: CreateResumePage,
  head: () => ({
    meta: [{ title: "Create Resume", description: "Create a new tailored resume" }],
  }),
});

type ResumePasteMode = "plain" | "json";

function CreateResumePage() {
  const navigate = useNavigate();
  const { data: existingResumes } = useSuspenseQuery(resumeListQueryOptions);

  const [creationFlow, setCreationFlow] = useState<"tailor" | "import">("tailor");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [selectedBaseId, setSelectedBaseId] = useState<string | null>(null);
  const [resolvedData, setResolvedData] = useState<ResumeDocumentV1 | null>(null);
  const [pastedPlainResume, setPastedPlainResume] = useState("");
  const [pastedJsonResumeSnippet, setPastedJsonResumeSnippet] = useState("");
  const [resumePasteMode, setResumePasteMode] = useState<ResumePasteMode>("plain");

  const baseResume = (() => {
    if (resolvedData) return resolvedData;
    if (selectedBaseId) {
      const found = existingResumes.find((r) => r.id === selectedBaseId);
      if (found) return found.data;
    }
    return createDefaultResume();
  })();

  useEffect(() => {
    if (creationFlow !== "tailor") return;
    if (!selectedBaseId) {
      setPastedPlainResume("");
      return;
    }
    const found = existingResumes.find((r) => r.id === selectedBaseId);
    if (found) {
      setPastedPlainResume(resumeDocumentToPlainText(found.data));
      setResumePasteMode("plain");
      setPastedJsonResumeSnippet("");
    }
  }, [creationFlow, selectedBaseId, existingResumes]);

  const jsonResumePlainPreview = useMemo(() => {
    if (resumePasteMode !== "json") return { ok: true as const, plain: "", error: "" as string };
    const raw = pastedJsonResumeSnippet.trim();
    if (!raw) return { ok: true as const, plain: "", error: "" as string };
    const parsed = safeParseResumeJson(raw);
    if (parsed.ok) {
      return { ok: true as const, plain: resumeDocumentToPlainText(parsed.data), error: "" as string };
    }
    return { ok: false as const, plain: "" as string, error: parsed.error };
  }, [resumePasteMode, pastedJsonResumeSnippet]);

  const plainTextForPrompt =
    resumePasteMode === "plain" ? pastedPlainResume : jsonResumePlainPreview.plain;

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Name is required");
      if (creationFlow === "import" && !resolvedData) {
        throw new Error("Paste and apply resume JSON first");
      }
      return createResume({
        data: {
          name: name.trim(),
          description: description.trim(),
          jobDescription: creationFlow === "import" ? "" : jobDescription.trim(),
          data: baseResume,
        },
      });
    },
    onSuccess(saved) {
      toast.success("Resume created");
      navigate({ to: "/resumes/$resumeId", params: { resumeId: saved.id } });
    },
    onError(err: unknown) {
      toast.error("Failed to create resume", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    },
    meta: { invalidates: [["resumes"]] },
  });

  function handleJsonApply(data: ResumeDocumentV1) {
    setResolvedData(data);
  }

  const canSaveImport = creationFlow === "import" ? resolvedData !== null : true;
  const saveDisabled =
    !name.trim() || saveMutation.isPending || (creationFlow === "import" && !canSaveImport);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6" data-test="create-resume-page">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate({ to: "/resumes" })}>
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Create resume</h1>
          <p className="text-base-content/60 text-sm">
            Tailor from a job posting with an LLM, or import JSON from the model and edit in the
            studio.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="resume-name">Name *</Label>
            <Input
              id="resume-name"
              placeholder="e.g. React Native - Acme Corp"
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-test="resume-name-input"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="resume-description">Description</Label>
            <Input
              id="resume-description"
              placeholder="Brief note about this version"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Tabs
        value={creationFlow}
        onValueChange={(v) => {
          const next = v as "tailor" | "import";
          setCreationFlow(next);
          if (next === "import") {
            setJobDescription("");
          }
        }}
        className="gap-4"
        data-test="create-resume-flow-tabs"
      >
        <TabsList variant="line" className="w-full sm:w-auto">
          <TabsTrigger value="tailor" className="gap-1.5" data-test="tab-tailor-from-jd">
            From job description
          </TabsTrigger>
          <TabsTrigger value="import" className="gap-1.5" data-test="tab-import-json">
            Import JSON
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tailor" className="flex flex-col gap-6">
          <BaseResumeSelector
            resumes={existingResumes}
            selectedId={selectedBaseId}
            onSelect={(id) => {
              setSelectedBaseId(id);
              setResolvedData(null);
            }}
          />

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Existing resume (for the LLM prompt)</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <p className="text-base-content/60 text-sm">
                Optional. Use plain text from a PDF or paste JSON you already have—the prompt will
                include a plain-text section the model can follow. Choosing a saved resume above
                fills this automatically.
              </p>
              <RadioGroup
                value={resumePasteMode}
                onValueChange={(v) => setResumePasteMode(v as ResumePasteMode)}
                className="flex flex-wrap gap-4"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="plain" id="paste-plain" />
                  <Label htmlFor="paste-plain" className="cursor-pointer font-normal">
                    Plain text
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="json" id="paste-json" />
                  <Label htmlFor="paste-json" className="cursor-pointer font-normal">
                    Resume as JSON
                  </Label>
                </div>
              </RadioGroup>
              {resumePasteMode === "plain" ? (
                <Textarea
                  rows={8}
                  placeholder="Paste resume text here (e.g. copy from a PDF)..."
                  value={pastedPlainResume}
                  onChange={(e) => setPastedPlainResume(e.target.value)}
                  data-test="pasted-plain-resume-input"
                />
              ) : (
                <>
                  <Textarea
                    rows={8}
                    className="font-mono text-xs"
                    placeholder='{"version": 1, "meta": {...}, ...}'
                    value={pastedJsonResumeSnippet}
                    onChange={(e) => setPastedJsonResumeSnippet(e.target.value)}
                    data-test="pasted-json-resume-snippet"
                  />
                  {pastedJsonResumeSnippet.trim() && !jsonResumePlainPreview.ok && (
                    <p className="text-destructive text-sm" data-test="json-snippet-parse-error">
                      {jsonResumePlainPreview.error}
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Separator />

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Job description</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                rows={8}
                placeholder="Paste the job posting here..."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                data-test="job-description-input"
              />
            </CardContent>
          </Card>

          {jobDescription.trim() && (
            <>
              <PromptCopySection
                baseResume={baseResume}
                jobDescription={jobDescription}
                pastedPlainResume={plainTextForPrompt}
              />
              <JsonPasteSection onApply={handleJsonApply} />
            </>
          )}

          {resolvedData && (
            <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-3">
              <p className="text-sm font-medium text-green-600">
                LLM JSON applied — the resume data has been updated. Save when ready.
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="import" className="flex flex-col gap-6">
          <p className="text-base-content/60 text-sm">
            Paste valid resume JSON (for example from ChatGPT). It replaces the starter template for
            this new record. Job description is not required on this path.
          </p>
          <JsonPasteSection
            onApply={handleJsonApply}
            title="Paste resume JSON"
            description="Validated against the app schema. Apply, then save to open the editor."
          />
          {resolvedData ? (
            <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-3">
              <p className="text-sm font-medium text-green-600">
                JSON applied — save to create the resume and continue editing.
              </p>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm" data-test="import-json-hint">
              Apply JSON above to enable Save.
            </p>
          )}
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-3 pb-8">
        <Button variant="outline" onClick={() => navigate({ to: "/resumes" })}>
          Cancel
        </Button>
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveDisabled}
          className="gap-2"
          data-test="save-resume-button"
        >
          <Save className="size-4" />
          {saveMutation.isPending ? "Saving..." : "Save resume"}
        </Button>
      </div>
    </div>
  );
}
