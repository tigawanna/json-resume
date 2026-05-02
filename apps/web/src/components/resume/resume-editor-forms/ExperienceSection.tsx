import { PickFromExistingDialog } from "@/components/PickFromExistingDialog";
import { useResumeWorkspace } from "@/components/resume/resume-workspace/ResumeWorkspaceContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { queryKeyPrefixes } from "@/data-access-layer/query-keys";
import type { ResumeDetailDTO } from "@/data-access-layer/resume/resume.types";
import { useAppForm } from "@/lib/tanstack/form";
import { unwrapUnknownError } from "@/utils/errors";
import { formOptions } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Library, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

interface ExperienceSectionProps {
  resumeId: string;
}

export function ExperienceSection({ resumeId }: ExperienceSectionProps) {
  const { resume, searches, createExperience } = useResumeWorkspace();
  const searchExperiences = searches?.experiences;
  const queryClient = useQueryClient();

  const [pickOpen, setPickOpen] = useState(false);

  const pickMutation = useMutation({
    mutationFn: async (
      rawItems: { company: string; role: string; startDate: string; endDate: string }[],
    ) =>
      Promise.all(
        rawItems.map((exp) =>
          createExperience({
            company: exp.company,
            role: exp.role,
            startDate: exp.startDate,
            endDate: exp.endDate,
            location: "",
          }),
        ),
      ),
    onSuccess(_, rawItems) {
      void queryClient.invalidateQueries({ queryKey: [queryKeyPrefixes.resumes] });
      toast.success(`Added ${rawItems.length} experience(s)`);
      setPickOpen(false);
    },
    onError(err: unknown) {
      toast.error("Failed to add experiences", {
        description: unwrapUnknownError(err).message,
      });
    },
  });

  if (!resume) return null;

  return (
    <div className="flex flex-col gap-4" data-test="experience-section">
      {resume.experiences.map((exp) => (
        <ExperienceCard
          key={exp.id}
          resumeId={resume.id}
          experience={exp}
          allExperiences={resume.experiences}
        />
      ))}

      <div className="flex gap-2">
        <AddExperienceForm
          resumeId={resume.id}
          existingCount={resume.experiences.length}
          allExperiences={resume.experiences}
        />
        {searchExperiences && (
          <Button variant="outline" size="sm" onClick={() => setPickOpen(true)}>
            <Library className="mr-1 size-3" /> Pick from Existing
          </Button>
        )}
      </div>

      {searchExperiences && (
        <PickFromExistingDialog
          open={pickOpen}
          onOpenChange={setPickOpen}
          title="Pick from Existing Experiences"
          description="Search across all your resumes to copy an experience entry."
          multi
          getSearchQueryKey={(q) => [queryKeyPrefixes.resumes, "search", "experiences", q]}
          getSearchQueryFn={(q) => () => searchExperiences(q)}
          mapToItems={(data) =>
            data.map((exp) => ({
              id: exp.id,
              primary: `${exp.role} at ${exp.company}`,
              secondary: `${exp.startDate} – ${exp.endDate}`,
            }))
          }
          onPick={(_, rawItems) => pickMutation.mutate(rawItems)}
        />
      )}
    </div>
  );
}

// ─── Single Experience Card (editable) ─────────────────────

interface ExperienceCardProps {
  resumeId: string;
  experience: ResumeDetailDTO["experiences"][number];
  allExperiences: ResumeDetailDTO["experiences"];
}

function ExperienceCard({ resumeId, experience, allExperiences }: ExperienceCardProps) {
  const { deleteExperience, updateExperience, updateExperienceBullets, searches } =
    useResumeWorkspace();
  const searchExperienceBullets = searches?.experienceBullets;
  const [editing, setEditing] = useState(false);
  const [role, setRole] = useState(experience.role);
  const [company, setCompany] = useState(experience.company);
  const [startDate, setStartDate] = useState(experience.startDate);
  const [endDate, setEndDate] = useState(experience.endDate);
  const [location, setLocation] = useState(experience.location);
  const [bullets, setBullets] = useState(experience.bullets.map((b) => b.text));
  const [bulletPickOpen, setBulletPickOpen] = useState(false);

  function enterEdit() {
    setRole(experience.role);
    setCompany(experience.company);
    setStartDate(experience.startDate);
    setEndDate(experience.endDate);
    setLocation(experience.location);
    setBullets(experience.bullets.map((b) => b.text));
    setEditing(true);
  }

  const deleteMutation = useMutation({
    mutationFn: async () => deleteExperience(experience.id),
    onSuccess() {
      toast.success("Experience removed");
    },
    onError(err: unknown) {
      toast.error("Failed to remove experience", {
        description: unwrapUnknownError(err).message,
      });
    },
    meta: { invalidates: [["resumes"], ["experiences"]] },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      await updateExperience(experience.id, { role, company, startDate, endDate, location });
      await updateExperienceBullets(experience.id, bullets);
    },
    onSuccess() {
      toast.success("Experience saved");
      setEditing(false);
    },
    onError(err: unknown) {
      toast.error("Failed to save experience", {
        description: unwrapUnknownError(err).message,
      });
    },
    meta: { invalidates: [["resumes"], ["experiences"]] },
  });

  function addBullet() {
    setBullets((prev) => [...prev, ""]);
  }

  function removeBullet(index: number) {
    setBullets((prev) => prev.filter((_, i) => i !== index));
  }

  function updateBullet(index: number, text: string) {
    setBullets((prev) => prev.map((b, i) => (i === index ? text : b)));
  }

  if (!editing) {
    return (
      <Card data-test={`experience-card-${experience.id}`}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">
            {experience.role} at {experience.company}
          </CardTitle>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="size-7" onClick={enterEdit}>
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
        <CardContent className="flex flex-col gap-2">
          <p className="text-muted-foreground text-xs">
            {experience.startDate} – {experience.endDate}
            {experience.location ? ` · ${experience.location}` : ""}
          </p>
          {experience.bullets.length > 0 && (
            <ul className="flex flex-col gap-1 pl-1">
              {experience.bullets.map((bullet, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="text-muted-foreground mt-0.5 shrink-0">•</span>
                  <span>{bullet.text}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-test={`experience-card-${experience.id}`}>
      <CardContent className="flex flex-col gap-3 pt-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Job Title</Label>
            <Input value={role} onChange={(e) => setRole(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Company</Label>
            <Input value={company} onChange={(e) => setCompany(e.target.value)} className="mt-1" />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Start Date</Label>
            <Input
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">End Date</Label>
            <Input value={endDate} onChange={(e) => setEndDate(e.target.value)} className="mt-1" />
          </div>
        </div>

        <div>
          <Label className="text-xs">Location</Label>
          <Input value={location} onChange={(e) => setLocation(e.target.value)} className="mt-1" />
        </div>

        <div className="flex flex-col gap-2">
          <Label className="text-xs font-medium">Bullets</Label>
          {bullets.map((bullet, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="text-muted-foreground text-xs">•</span>
              <Input
                value={bullet}
                onChange={(e) => updateBullet(index, e.target.value)}
                className="h-8 text-sm"
              />
              <Button
                variant="ghost"
                size="icon"
                className="size-6 shrink-0"
                onClick={() => removeBullet(index)}
              >
                <X className="size-3" />
              </Button>
            </div>
          ))}
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={addBullet}>
              <Plus className="mr-1 size-3" /> Add Bullet
            </Button>
            {searchExperienceBullets && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setBulletPickOpen(true)}
              >
                <Library className="mr-1 size-3" /> Pick Bullets
              </Button>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !role.trim() || !company.trim()}
          >
            {saveMutation.isPending ? "Saving…" : "Save"}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        </div>

        {searchExperienceBullets && (
          <PickFromExistingDialog
            open={bulletPickOpen}
            onOpenChange={setBulletPickOpen}
            title="Pick Experience Bullets"
            description="Search bullet points across all your experiences."
            multi
            getSearchQueryKey={(q) => [queryKeyPrefixes.resumes, "search", "experience-bullets", q]}
            getSearchQueryFn={(q) => () => searchExperienceBullets(q)}
            mapToItems={(data) =>
              data.map((b) => ({
                id: b.id,
                primary: b.text,
              }))
            }
            onPick={(items) => {
              setBullets((prev) => [...prev, ...items.map((i) => i.primary)]);
              toast.success(`Added ${items.length} bullet(s)`);
            }}
          />
        )}
      </CardContent>
    </Card>
  );
}

// ─── Add Experience Form ────────────────────────────────────

const addExpOpts = formOptions({
  defaultValues: {
    company: "",
    role: "",
    startDate: "",
    endDate: "",
    location: "",
  },
});

function AddExperienceForm({
  resumeId,
  existingCount,
  allExperiences,
}: {
  resumeId: string;
  existingCount: number;
  allExperiences: ResumeDetailDTO["experiences"];
}) {
  const { createExperience } = useResumeWorkspace();
  const [open, setOpen] = useState(false);

  const mutation = useMutation({
    mutationFn: async (values: typeof addExpOpts.defaultValues) => createExperience(values),
    onSuccess() {
      toast.success("Experience added");
      setOpen(false);
    },
    onError(err: unknown) {
      toast.error("Failed to add experience", {
        description: unwrapUnknownError(err).message,
      });
    },
    meta: { invalidates: [["resumes"], ["experiences"]] },
  });

  const form = useAppForm({
    ...addExpOpts,
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value);
    },
  });

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus className="mr-1 size-3" /> Add Experience
      </Button>
    );
  }

  return (
    <Card className="w-full">
      <CardContent className="pt-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();

            void form.handleSubmit();
          }}
          className="flex flex-col gap-3"
          data-test="add-experience-form"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <form.AppField name="company" validators={{ onChange: z.string().min(1, "Required") }}>
              {(field) => <field.TextField label="Company" />}
            </form.AppField>
            <form.AppField name="role" validators={{ onChange: z.string().min(1, "Required") }}>
              {(field) => <field.TextField label="Role" />}
            </form.AppField>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <form.AppField name="startDate">
              {(field) => <field.TextField label="Start Date" />}
            </form.AppField>
            <form.AppField name="endDate">
              {(field) => <field.TextField label="End Date" />}
            </form.AppField>
            <form.AppField name="location">
              {(field) => <field.TextField label="Location" />}
            </form.AppField>
          </div>
          <div className="flex gap-2">
            <form.AppForm>
              <form.SubmitButton label="Add" />
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
