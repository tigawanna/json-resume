import { PickFromExistingDialog } from "@/components/PickFromExistingDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createExperience,
  editExperience,
  removeExperience,
  searchExperienceBullets,
  searchExperiences,
  updateExperienceBullets,
} from "@/data-access-layer/resume/resume.functions";
import type { ResumeDetailDTO } from "@/data-access-layer/resume/resume.types";
import { resumeCollection } from "@/data-access-layer/resume/resumes-query-collection";
import { useAppForm } from "@/lib/tanstack/form";
import { unwrapUnknownError } from "@/utils/errors";
import { eq, useLiveSuspenseQuery } from "@tanstack/react-db";
import { formOptions } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { Library, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

interface ExperienceSectionProps {
  resumeId: string;
}

export function ExperienceSection({ resumeId }: ExperienceSectionProps) {
  const { data: resume } = useLiveSuspenseQuery((q) =>
    q
      .from({ resume: resumeCollection })
      .where(({ resume }) => eq(resume.id, resumeId))
      .findOne(),
  );

  const [pickOpen, setPickOpen] = useState(false);

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
        <Button variant="outline" size="sm" onClick={() => setPickOpen(true)}>
          <Library className="mr-1 size-3" /> Pick from Existing
        </Button>
      </div>

      <PickFromExistingDialog
        open={pickOpen}
        onOpenChange={setPickOpen}
        title="Pick from Existing Experiences"
        description="Search across all your resumes to copy an experience entry."
        getSearchQueryKey={(q) => ["resumes", "search", "experiences", q]}
        getSearchQueryFn={(q) => () => searchExperiences({ data: { query: q } })}
        mapToItems={(data) =>
          data.map(
            (exp: {
              id: string;
              company: string;
              role: string;
              startDate: string;
              endDate: string;
            }) => ({
              id: exp.id,
              primary: `${exp.role} at ${exp.company}`,
              secondary: `${exp.startDate} – ${exp.endDate}`,
            }),
          )
        }
        onPick={(items) => {
          toast.info(`Selected ${items.length} experience(s) — add them via the form`);
        }}
      />
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
  const [editing, setEditing] = useState(false);
  const [role, setRole] = useState(experience.role);
  const [company, setCompany] = useState(experience.company);
  const [startDate, setStartDate] = useState(experience.startDate);
  const [endDate, setEndDate] = useState(experience.endDate);
  const [location, setLocation] = useState(experience.location);
  const [bullets, setBullets] = useState(experience.bullets.map((b) => b.text));
  const [bulletPickOpen, setBulletPickOpen] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: async () => removeExperience({ data: { id: experience.id } }),
    onSuccess() {
      toast.success("Experience removed");
      resumeCollection.utils.writeUpdate({
        id: resumeId,
        experiences: allExperiences.filter((e) => e.id !== experience.id),
      });
    },
    onError(err: unknown) {
      toast.error("Failed to remove experience", {
        description: unwrapUnknownError(err).message,
      });
    },
    meta: { invalidates: [["resumes"], ["experiences"]] },
  });

  const saveMutation = useMutation({
    mutationFn: async () =>
      editExperience({
        data: { id: experience.id, role, company, startDate, endDate, location },
      }),
    onSuccess() {
      toast.success("Experience saved");
      setEditing(false);
      resumeCollection.utils.writeUpdate({
        id: resumeId,
        experiences: allExperiences.map((e) =>
          e.id === experience.id ? { ...e, role, company, startDate, endDate, location } : e,
        ),
      });
    },
    onError(err: unknown) {
      toast.error("Failed to save experience", {
        description: unwrapUnknownError(err).message,
      });
    },
    meta: { invalidates: [["resumes"], ["experiences"]] },
  });

  const bulletMutation = useMutation({
    mutationFn: async () =>
      updateExperienceBullets({ data: { experienceId: experience.id, bullets } }),
    onSuccess() {
      toast.success("Bullets saved");
      resumeCollection.utils.writeUpdate({
        id: resumeId,
        experiences: allExperiences.map((e) =>
          e.id === experience.id
            ? {
                ...e,
                bullets: bullets.map((text, i) => ({
                  id: "",
                  experienceId: experience.id,
                  text,
                  sortOrder: i,
                })),
              }
            : e,
        ),
      });
    },
    onError(err: unknown) {
      toast.error("Failed to save bullets", {
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
            <Button variant="ghost" size="icon" className="size-7" onClick={() => setEditing(true)}>
              <Pencil className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}>
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-muted-foreground text-xs">
            {experience.startDate} – {experience.endDate}
            {experience.location ? ` · ${experience.location}` : ""}
          </p>

          <div className="flex flex-col gap-2">
            <Label className="text-xs font-medium">Bullets</Label>
            {experience.bullets.map((bullet, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="text-muted-foreground text-xs">•</span>
                <Input
                  value={bullet.text}
                  onChange={(e) => updateBullet(index, e.target.value)}
                  className="h-8 text-sm"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 shrink-0"
                  onClick={() => removeBullet(index)}>
                  <X className="size-3" />
                </Button>
              </div>
            ))}
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={addBullet}>
                <Plus className="mr-1 size-3" /> Add Bullet
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setBulletPickOpen(true)}>
                <Library className="mr-1 size-3" /> Pick Bullets
              </Button>
              <Button
                size="sm"
                onClick={() => bulletMutation.mutate()}
                disabled={bulletMutation.isPending}>
                Save Bullets
              </Button>
            </div>
          </div>

          <PickFromExistingDialog
            open={bulletPickOpen}
            onOpenChange={setBulletPickOpen}
            title="Pick Experience Bullets"
            description="Search bullet points across all your experiences."
            multi
            getSearchQueryKey={(q) => ["resumes", "search", "experience-bullets", q]}
            getSearchQueryFn={(q) => () => searchExperienceBullets({ data: { query: q } })}
            mapToItems={(data) =>
              data.map((b: { id: string; text: string }) => ({
                id: b.id,
                primary: b.text,
              }))
            }
            onPick={(items) => {
              setBullets((prev) => [...prev, ...items.map((i) => i.primary)]);
              toast.success(`Added ${items.length} bullet(s)`);
            }}
          />
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
                onClick={() => removeBullet(index)}>
                <X className="size-3" />
              </Button>
            </div>
          ))}
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={addBullet}>
              <Plus className="mr-1 size-3" /> Add Bullet
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setBulletPickOpen(true)}>
              <Library className="mr-1 size-3" /> Pick Bullets
            </Button>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !role.trim() || !company.trim()}>
            Save
          </Button>
          <Button
            size="sm"
            onClick={() => bulletMutation.mutate()}
            disabled={bulletMutation.isPending}>
            Save Bullets
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        </div>

        <PickFromExistingDialog
          open={bulletPickOpen}
          onOpenChange={setBulletPickOpen}
          title="Pick Experience Bullets"
          description="Search bullet points across all your experiences."
          multi
          getSearchQueryKey={(q) => ["resumes", "search", "experience-bullets", q]}
          getSearchQueryFn={(q) => () => searchExperienceBullets({ data: { query: q } })}
          mapToItems={(data) =>
            data.map((b: { id: string; text: string }) => ({
              id: b.id,
              primary: b.text,
            }))
          }
          onPick={(items) => {
            setBullets((prev) => [...prev, ...items.map((i) => i.primary)]);
            toast.success(`Added ${items.length} bullet(s)`);
          }}
        />
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
  const [open, setOpen] = useState(false);

  const mutation = useMutation({
    mutationFn: async (values: typeof addExpOpts.defaultValues) =>
      createExperience({
        data: { resumeId, ...values, sortOrder: existingCount, bullets: [] },
      }),
    onSuccess(data, values) {
      toast.success("Experience added");
      setOpen(false);
      resumeCollection.utils.writeUpdate({
        id: resumeId,
        experiences: [
          ...allExperiences,
          {
            id: data.id,
            resumeId,
            company: values.company,
            role: values.role,
            startDate: values.startDate,
            endDate: values.endDate,
            location: values.location || "",
            sortOrder: existingCount,
            bullets: [],
          },
        ],
      });
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
            form.handleSubmit();
          }}
          className="flex flex-col gap-3"
          data-test="add-experience-form">
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
