import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { resumeListQueryOptions } from "@/data-access-layer/resume/resume-query-options";
import { createResume } from "@/data-access-layer/resume/resume.functions";
import { createDefaultResume, type ResumeDocumentV1 } from "@/features/resume/resume-schema";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Save } from "lucide-react";
import { useState } from "react";
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

function CreateResumePage() {
  const navigate = useNavigate();
  const { data: existingResumes } = useSuspenseQuery(resumeListQueryOptions);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [selectedBaseId, setSelectedBaseId] = useState<string | null>(null);
  const [resolvedData, setResolvedData] = useState<ResumeDocumentV1 | null>(null);

  const baseResume = (() => {
    if (resolvedData) return resolvedData;
    if (selectedBaseId) {
      const found = existingResumes.find((r) => r.id === selectedBaseId);
      if (found) return found.data;
    }
    return createDefaultResume();
  })();

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Name is required");
      return createResume({
        data: {
          name: name.trim(),
          description: description.trim(),
          jobDescription: jobDescription.trim(),
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

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6" data-test="create-resume-page">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate({ to: "/resumes" })}>
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Create resume</h1>
          <p className="text-base-content/60 text-sm">
            Start from an existing resume or a blank template, then tailor it with an LLM.
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

      <BaseResumeSelector
        resumes={existingResumes}
        selectedId={selectedBaseId}
        onSelect={(id) => {
          setSelectedBaseId(id);
          setResolvedData(null);
        }}
      />

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
          <PromptCopySection baseResume={baseResume} jobDescription={jobDescription} />
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

      <div className="flex justify-end gap-3 pb-8">
        <Button variant="outline" onClick={() => navigate({ to: "/resumes" })}>
          Cancel
        </Button>
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={!name.trim() || saveMutation.isPending}
          className="gap-2">
          <Save className="size-4" />
          {saveMutation.isPending ? "Saving..." : "Save resume"}
        </Button>
      </div>
    </div>
  );
}
