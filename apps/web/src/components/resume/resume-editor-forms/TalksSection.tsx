import { PickFromExistingDialog } from "@/components/PickFromExistingDialog";
import { useResumeWorkspace } from "@/components/resume/resume-workspace/ResumeWorkspaceContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { queryKeyPrefixes } from "@/data-access-layer/query-keys";
import type { ResumeDetailDTO } from "@/data-access-layer/resume/resume.types";
import { useAppForm } from "@/lib/tanstack/form";
import { unwrapUnknownError } from "@/utils/errors";
import { formOptions } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Library, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

function parseLinks(raw: string): { label: string; url: string }[] {
  try {
    const parsed: unknown = JSON.parse(raw);
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
}

interface TalksSectionProps {
  resumeId: string;
}

export function TalksSection({ resumeId }: TalksSectionProps) {
  const { resume, searches, createTalk } = useResumeWorkspace();
  const searchTalks = searches?.talks;
  const queryClient = useQueryClient();

  const [pickOpen, setPickOpen] = useState(false);

  const pickMutation = useMutation({
    mutationFn: async (rawItems: { title: string; event: string; date: string }[]) =>
      Promise.all(
        rawItems.map((talk) =>
          createTalk({
            title: talk.title,
            event: talk.event,
            date: talk.date,
            description: "",
          }),
        ),
      ),
    onSuccess(_, rawItems) {
      void queryClient.invalidateQueries({ queryKey: [queryKeyPrefixes.resumes] });
      toast.success(`Added ${rawItems.length} talk(s)`);
      setPickOpen(false);
    },
    onError(err: unknown) {
      toast.error("Failed to add talks", {
        description: unwrapUnknownError(err).message,
      });
    },
  });

  if (!resume) return null;
  return (
    <div className="flex flex-col gap-4" data-test="talks-section">
      {resume.talks.map((talk) => (
        <TalkCard key={talk.id} talk={talk} resumeId={resumeId} allTalks={resume.talks} />
      ))}
      <div className="flex gap-2">
        <AddTalkForm
          resumeId={resumeId}
          existingCount={resume.talks.length}
          allTalks={resume.talks}
        />
        {searchTalks && (
          <Button variant="outline" size="sm" onClick={() => setPickOpen(true)}>
            <Library className="mr-1 size-3" /> Pick from Existing
          </Button>
        )}
      </div>

      {searchTalks && (
        <PickFromExistingDialog
          open={pickOpen}
          onOpenChange={setPickOpen}
          title="Pick from Existing Talks"
          description="Search across all your resumes to copy a talk entry."
          multi
          getSearchQueryKey={(q) => [queryKeyPrefixes.resumes, "search", "talks", q]}
          getSearchQueryFn={(q) => () => searchTalks(q)}
          mapToItems={(data) =>
            data.map((talk) => ({
              id: talk.id,
              primary: talk.title,
              secondary: `${talk.event}${talk.date ? ` · ${talk.date}` : ""}`,
            }))
          }
          onPick={(_, rawItems) => pickMutation.mutate(rawItems)}
        />
      )}
    </div>
  );
}

// ─── Single Talk Card (editable) ────────────────────────────

interface TalkCardProps {
  talk: ResumeDetailDTO["talks"][number];
  resumeId: string;
  allTalks: ResumeDetailDTO["talks"];
}

function TalkCard({ talk, resumeId, allTalks }: TalkCardProps) {
  const { updateTalk, deleteTalk } = useResumeWorkspace();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(talk.title);
  const [event, setEvent] = useState(talk.event);
  const [date, setDate] = useState(talk.date);
  const [description, setDescription] = useState(talk.description);
  const [links, setLinks] = useState<{ label: string; url: string }[]>(() =>
    parseLinks(talk.links),
  );

  const deleteMutation = useMutation({
    mutationFn: async () => deleteTalk(talk.id),
    onSuccess() {
      toast.success("Talk removed");
    },
    onError(err: unknown) {
      toast.error("Failed to remove talk", {
        description: unwrapUnknownError(err).message,
      });
    },
    meta: { invalidates: [["resumes"]] },
  });

  const saveMutation = useMutation({
    mutationFn: async () => updateTalk(talk.id, { title, event, date, description, links }),
    onSuccess() {
      toast.success("Talk saved");
      setEditing(false);
    },
    onError(err: unknown) {
      toast.error("Failed to save talk", {
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

  const parsedLinks = parseLinks(talk.links);

  if (!editing) {
    return (
      <Card data-test={`talk-card-${talk.id}`}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">{talk.title}</CardTitle>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="size-7" onClick={() => setEditing(true)}>
              <Pencil className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-1.5">
          <p className="text-muted-foreground text-xs">
            {talk.event}
            {talk.date ? ` · ${talk.date}` : ""}
          </p>
          {talk.description && <p className="mt-1 text-sm">{talk.description}</p>}
          {parsedLinks.length > 0 && (
            <div className="mt-1 flex flex-col gap-1">
              {parsedLinks.map((link, i) => (
                <a
                  key={i}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary inline-flex items-center gap-1 text-xs hover:underline"
                >
                  <ExternalLink className="size-3" />
                  {link.label || link.url}
                </a>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-test={`talk-card-${talk.id}`}>
      <CardContent className="flex flex-col gap-3 pt-4">
        <div>
          <Label className="text-xs">Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Event</Label>
            <Input value={event} onChange={(e) => setEvent(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Date</Label>
            <Input value={date} onChange={(e) => setDate(e.target.value)} className="mt-1" />
          </div>
        </div>
        <div>
          <Label className="text-xs">Description</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1"
            rows={2}
          />
        </div>

        {/* Links (video, slides, etc.) */}
        <div className="flex flex-col gap-2">
          <Label className="text-xs font-medium">Links (video, slides, etc.)</Label>
          {links.map((link, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                value={link.label}
                onChange={(e) => updateLink(index, "label", e.target.value)}
                placeholder="Label (e.g. Video, Slides)"
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
                onClick={() => removeLink(index)}
              >
                <X className="size-3" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addLink} className="w-fit">
            <Plus className="mr-1 size-3" /> Add Link
          </Button>
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !title.trim()}
          >
            Save
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
            Cancel
          </Button>
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
    description: "",
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
  const { createTalk } = useResumeWorkspace();
  const [open, setOpen] = useState(false);

  const mutation = useMutation({
    mutationFn: async (values: typeof addTalkFormOpts.defaultValues) =>
      createTalk({
        title: values.title,
        event: values.event,
        date: values.date,
        description: values.description,
      }),
    onSuccess() {
      toast.success("Talk added");
      setOpen(false);
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
    },
  });

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus className="mr-1 size-3" /> Add Talk
      </Button>
    );
  }

  return (
    <Card data-test="add-talk-form" className="w-full">
      <CardContent className="pt-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();

            void form.handleSubmit();
          }}
          className="flex flex-col gap-3"
        >
          <form.AppField
            name="title"
            validators={{ onChange: z.string().min(1, "Title is required") }}
          >
            {(field) => <field.TextField label="Title" />}
          </form.AppField>

          <div className="grid gap-3 sm:grid-cols-2">
            <form.AppField name="event">
              {(field) => <field.TextField label="Event" />}
            </form.AppField>
            <form.AppField name="date">{(field) => <field.TextField label="Date" />}</form.AppField>
          </div>

          <form.AppField name="description">
            {(field) => <field.TextAreaField label="Description" />}
          </form.AppField>

          <div className="flex gap-2">
            <form.AppForm>
              <form.SubmitButton label="Add Talk" />
            </form.AppForm>
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
