import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createTalk, editTalk, removeTalk } from "@/data-access-layer/resume/resume.functions";
import type { ResumeDetailDTO } from "@/data-access-layer/resume/resume.types";
import { resumeCollection } from "@/data-access-layer/resume/resumes-query-collection";
import { useAppForm } from "@/lib/tanstack/form";
import { unwrapUnknownError } from "@/utils/errors";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { formOptions } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

interface TalksSectionProps {
  resumeId: string;
}

export function TalksSection({ resumeId }: TalksSectionProps) {
  const { data: resume } = useLiveQuery((q) =>
    q
      .from({ resume: resumeCollection })
      .where(({ resume }) => eq(resume.id, resumeId))
      .findOne(),
  );

  if (!resume) return null;
  return (
    <div className="flex flex-col gap-4" data-test="talks-section">
      {resume.talks.map((talk) => (
        <TalkCard key={talk.id} talk={talk} resumeId={resumeId} allTalks={resume.talks} />
      ))}
      <AddTalkForm resumeId={resumeId} existingCount={resume.talks.length} allTalks={resume.talks} />
    </div>
  );
}

// ─── Single Talk Card ───────────────────────────────────────

interface TalkCardProps {
  talk: ResumeDetailDTO["talks"][number];
  resumeId: string;
  allTalks: ResumeDetailDTO["talks"];
}

function TalkCard({ talk, resumeId, allTalks }: TalkCardProps) {
  const [links, setLinks] = useState<{ label: string; url: string }[]>(() => {
    try {
      const parsed: unknown = JSON.parse(talk.links);
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (x): x is { label: string; url: string } =>
            typeof x === "object" &&
            x !== null &&
            typeof (x as Record<string, unknown>).label === "string" &&
            typeof (x as Record<string, unknown>).url === "string",
        );
      }
      return [];
    } catch {
      return [];
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async () => removeTalk({ data: { id: talk.id } }),
    onSuccess() {
      toast.success("Talk removed");
      resumeCollection.utils.writeUpdate({
        id: resumeId,
        talks: allTalks.filter((t) => t.id !== talk.id),
      });
    },
    onError(err: unknown) {
      toast.error("Failed to remove talk", {
        description: unwrapUnknownError(err).message,
      });
    },
    meta: { invalidates: [["resumes"]] },
  });

  const updateMutation = useMutation({
    mutationFn: async () => editTalk({ data: { id: talk.id, links } }),
    onSuccess() {
      toast.success("Talk links saved");
      resumeCollection.utils.writeUpdate({
        id: resumeId,
        talks: allTalks.map((t) =>
          t.id === talk.id ? { ...t, links: JSON.stringify(links) } : t,
        ),
      });
    },
    onError(err: unknown) {
      toast.error("Failed to update talk", {
        description: unwrapUnknownError(err).message,
      });
    },
    meta: { invalidates: [["resumes"]] },
  });

  function addLink() {
    setLinks((prev) => [...prev, { label: "", url: "" }]);
  }

  function removeLink(index: number) {
    setLinks((prev) => prev.filter((_, i) => i !== index));
  }

  function updateLink(index: number, key: "label" | "url", value: string) {
    setLinks((prev) => prev.map((l, i) => (i === index ? { ...l, [key]: value } : l)));
  }

  return (
    <Card data-test={`talk-card-${talk.id}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">{talk.title}</CardTitle>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={() => deleteMutation.mutate()}
          disabled={deleteMutation.isPending}>
          <Trash2 className="size-3.5" />
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-muted-foreground text-xs">
          {talk.event}
          {talk.date ? ` · ${talk.date}` : ""}
        </p>

        <div className="flex flex-col gap-2">
          <Label className="text-xs font-medium">Links</Label>
          {links.map((link, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                value={link.label}
                onChange={(e) => updateLink(index, "label", e.target.value)}
                placeholder="Label"
                className="h-8 text-sm"
              />
              <Input
                value={link.url}
                onChange={(e) => updateLink(index, "url", e.target.value)}
                placeholder="URL"
                className="h-8 text-sm"
              />
              <Button
                variant="ghost"
                size="icon"
                className="size-6 shrink-0"
                onClick={() => removeLink(index)}>
                <X className="size-3" />
              </Button>
            </div>
          ))}
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={addLink}>
              <Plus className="mr-1 size-3" /> Add Link
            </Button>
            <Button
              size="sm"
              onClick={() => updateMutation.mutate()}
              disabled={updateMutation.isPending}>
              Save Links
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Add Talk Form ──────────────────────────────────────────

const addTalkFormOpts = formOptions({
  defaultValues: {
    title: "",
    event: "",
    date: "",
  },
});

function AddTalkForm({
  resumeId,
  existingCount,
  allTalks,
}: {
  resumeId: string;
  existingCount: number;
  allTalks: ResumeDetailDTO["talks"];
}) {
  const mutation = useMutation({
    mutationFn: async (values: typeof addTalkFormOpts.defaultValues) =>
      createTalk({
        data: {
          resumeId,
          title: values.title,
          event: values.event,
          date: values.date,
          sortOrder: existingCount,
        },
      }),
    onSuccess(data, values) {
      toast.success("Talk added");
      resumeCollection.utils.writeUpdate({
        id: resumeId,
        talks: [
          ...allTalks,
          {
            id: data.id,
            resumeId,
            title: values.title,
            event: values.event || "",
            date: values.date || "",
            description: "",
            links: "[]",
            sortOrder: existingCount,
          },
        ],
      });
    },
    onError(err: unknown) {
      toast.error("Failed to add talk", {
        description: unwrapUnknownError(err).message,
      });
    },
    meta: { invalidates: [["resumes"]] },
  });

  const form = useAppForm({
    ...addTalkFormOpts,
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value);
      form.reset();
    },
  });

  return (
    <Card data-test="add-talk-form">
      <CardContent className="pt-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
          className="flex flex-col gap-3">
          <form.AppField
            name="title"
            validators={{ onChange: z.string().min(1, "Title is required") }}>
            {(field) => <field.TextField label="Title" />}
          </form.AppField>

          <div className="grid gap-3 sm:grid-cols-2">
            <form.AppField name="event">
              {(field) => <field.TextField label="Event" />}
            </form.AppField>
            <form.AppField name="date">{(field) => <field.TextField label="Date" />}</form.AppField>
          </div>

          <form.AppForm>
            <form.SubmitButton label="Add Talk" />
          </form.AppForm>
        </form>
      </CardContent>
    </Card>
  );
}
