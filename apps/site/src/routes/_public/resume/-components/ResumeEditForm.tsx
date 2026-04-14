import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  createDefaultResume,
  moveSectionOrder,
  SECTION_KEYS,
  type ResumeDocumentV1,
  type SectionKey,
} from "@/features/resume/resume-schema";
import { ChevronDown, ChevronUp, GripVertical, Plus, Trash2 } from "lucide-react";

function SectionOrderControls({
  sectionKey,
  order,
  onReorder,
}: {
  sectionKey: SectionKey;
  order: SectionKey[];
  onReorder: (next: SectionKey[]) => void;
}) {
  const idx = order.indexOf(sectionKey);
  const canMoveUp = idx > 0;
  const canMoveDown = idx >= 0 && idx < order.length - 1;
  return (
    <div className="flex gap-1" data-test={`section-order-${sectionKey}`}>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="size-8"
        disabled={!canMoveUp}
        onClick={() => onReorder(moveSectionOrder(order, sectionKey, -1))}
        aria-label="Move section up"
      >
        <ChevronUp className="size-4" />
      </Button>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="size-8"
        disabled={!canMoveDown}
        onClick={() => onReorder(moveSectionOrder(order, sectionKey, 1))}
        aria-label="Move section down"
      >
        <ChevronDown className="size-4" />
      </Button>
    </div>
  );
}

function reorderArray<T>(arr: T[], fromIdx: number, toIdx: number): T[] {
  const copy = [...arr];
  const [removed] = copy.splice(fromIdx, 1);
  if (removed === undefined) return arr;
  copy.splice(toIdx, 0, removed);
  return copy;
}

function normalizeSectionOrder(order: SectionKey[]): SectionKey[] {
  const seen = new Set<SectionKey>();
  const out: SectionKey[] = [];
  for (const k of order) {
    if (SECTION_KEYS.includes(k) && !seen.has(k)) {
      seen.add(k);
      out.push(k);
    }
  }
  for (const k of SECTION_KEYS) {
    if (!seen.has(k)) {
      out.push(k);
    }
  }
  return out;
}

export function ResumeEditForm({
  doc,
  onChange,
}: {
  doc: ResumeDocumentV1;
  onChange: (next: ResumeDocumentV1) => void;
}) {
  function set<K extends keyof ResumeDocumentV1>(key: K, value: ResumeDocumentV1[K]) {
    onChange({ ...doc, [key]: value });
  }

  const orderedKeys = normalizeSectionOrder(doc.sectionOrder);

  return (
    <div className="flex flex-col gap-6" data-test="resume-edit-form">
      {orderedKeys.map((sectionKey) => {
        switch (sectionKey) {
          case "header":
            return (
              <Card key={sectionKey}>
                <CardHeader>
                  <div className="flex flex-row flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-1">
                      <CardTitle>Profile</CardTitle>
                      <SectionOrderControls
                        sectionKey="header"
                        order={doc.sectionOrder}
                        onReorder={(next) => set("sectionOrder", next)}
                      />
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Label htmlFor="en-header">On</Label>
                      <Switch
                        id="en-header"
                        checked={doc.header.enabled}
                        onCheckedChange={(v) => set("header", { ...doc.header, enabled: v })}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="fullName">Full name</Label>
                    <Input
                      id="fullName"
                      value={doc.header.fullName}
                      onChange={(e) => set("header", { ...doc.header, fullName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="headline">Headline</Label>
                    <Input
                      id="headline"
                      value={doc.header.headline}
                      onChange={(e) => set("header", { ...doc.header, headline: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={doc.header.email}
                      onChange={(e) => set("header", { ...doc.header, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={doc.header.location}
                      onChange={(e) => set("header", { ...doc.header, location: e.target.value })}
                    />
                  </div>
                  <div className="md:col-span-2 space-y-3">
                    <Label>Links</Label>
                    {doc.header.links.map((link, i) => (
                      <div key={i} className="flex gap-2">
                        <Input
                          placeholder="Label"
                          value={link.label}
                          onChange={(e) => {
                            const links = [...doc.header.links];
                            const cur = links[i];
                            if (cur) links[i] = { ...cur, label: e.target.value };
                            set("header", { ...doc.header, links });
                          }}
                        />
                        <Input
                          placeholder="https://"
                          value={link.url}
                          onChange={(e) => {
                            const links = [...doc.header.links];
                            const cur = links[i];
                            if (cur) links[i] = { ...cur, url: e.target.value };
                            set("header", { ...doc.header, links });
                          }}
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() =>
                            set("header", {
                              ...doc.header,
                              links: doc.header.links.filter((_, j) => j !== i),
                            })
                          }
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={() =>
                        set("header", {
                          ...doc.header,
                          links: [...doc.header.links, { label: "", url: "" }],
                        })
                      }
                    >
                      <Plus className="size-4" />
                      Add link
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          case "summary":
            return (
              <Card key={sectionKey}>
                <CardHeader>
                  <div className="flex flex-row flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-1">
                      <CardTitle>Summary</CardTitle>
                      <SectionOrderControls
                        sectionKey="summary"
                        order={doc.sectionOrder}
                        onReorder={(next) => set("sectionOrder", next)}
                      />
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Label htmlFor="en-sum">On</Label>
                      <Switch
                        id="en-sum"
                        checked={doc.summary.enabled}
                        onCheckedChange={(v) => set("summary", { ...doc.summary, enabled: v })}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Textarea
                    rows={5}
                    value={doc.summary.text}
                    onChange={(e) => set("summary", { ...doc.summary, text: e.target.value })}
                  />
                </CardContent>
              </Card>
            );
          case "experience":
            return (
              <Card key={sectionKey}>
                <CardHeader>
                  <div className="flex flex-row flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-1">
                      <CardTitle>Experience</CardTitle>
                      <SectionOrderControls
                        sectionKey="experience"
                        order={doc.sectionOrder}
                        onReorder={(next) => set("sectionOrder", next)}
                      />
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Switch
                        checked={doc.experience.enabled}
                        onCheckedChange={(v) =>
                          set("experience", { ...doc.experience, enabled: v })
                        }
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-6">
                  {doc.experience.items.map((ex, i) => (
                    <div key={i} className="border-base-300 space-y-3 rounded-lg border p-4">
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Company</Label>
                          <Input
                            value={ex.company}
                            onChange={(e) => {
                              const items = [...doc.experience.items];
                              const cur = items[i];
                              if (cur) items[i] = { ...cur, company: e.target.value };
                              set("experience", { ...doc.experience, items });
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Role</Label>
                          <Input
                            value={ex.role}
                            onChange={(e) => {
                              const items = [...doc.experience.items];
                              const cur = items[i];
                              if (cur) items[i] = { ...cur, role: e.target.value };
                              set("experience", { ...doc.experience, items });
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Start</Label>
                          <Input
                            value={ex.start}
                            onChange={(e) => {
                              const items = [...doc.experience.items];
                              const cur = items[i];
                              if (cur) items[i] = { ...cur, start: e.target.value };
                              set("experience", { ...doc.experience, items });
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>End</Label>
                          <Input
                            value={ex.end}
                            onChange={(e) => {
                              const items = [...doc.experience.items];
                              const cur = items[i];
                              if (cur) items[i] = { ...cur, end: e.target.value };
                              set("experience", { ...doc.experience, items });
                            }}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Bullets</Label>
                        <div className="flex flex-col gap-2" data-test={`experience-bullets-${i}`}>
                          {(ex.bullets.length > 0 ? ex.bullets : [""]).map((bullet, bi) => (
                            <div
                              key={`${i}-${bi}`}
                              className="border-base-300 flex items-start gap-2 rounded-md border bg-transparent p-1.5"
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.dataTransfer.dropEffect = "move";
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                const from = Number(e.dataTransfer.getData("text/plain"));
                                if (Number.isNaN(from)) return;
                                const to = bi;
                                if (from === to) return;
                                const items = [...doc.experience.items];
                                const cur = items[i];
                                if (!cur) return;
                                const raw = cur.bullets.length > 0 ? [...cur.bullets] : [""];
                                const nextBullets = reorderArray(raw, from, to);
                                items[i] = { ...cur, bullets: nextBullets };
                                set("experience", { ...doc.experience, items });
                              }}
                            >
                              <button
                                type="button"
                                draggable
                                onDragStart={(e) => {
                                  e.dataTransfer.setData("text/plain", String(bi));
                                  e.dataTransfer.effectAllowed = "move";
                                }}
                                className="text-muted-foreground hover:text-foreground mt-2 cursor-grab p-0.5 active:cursor-grabbing"
                                aria-label="Drag to reorder bullet"
                              >
                                <GripVertical className="size-4 shrink-0" />
                              </button>
                              <Input
                                className="min-w-0 flex-1"
                                value={bullet}
                                placeholder="Achievement or responsibility"
                                onChange={(e) => {
                                  const items = [...doc.experience.items];
                                  const cur = items[i];
                                  if (!cur) return;
                                  const padded =
                                    cur.bullets.length > 0 ? [...cur.bullets] : [""];
                                  while (padded.length <= bi) padded.push("");
                                  padded[bi] = e.target.value;
                                  items[i] = { ...cur, bullets: padded };
                                  set("experience", { ...doc.experience, items });
                                }}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="size-8 shrink-0"
                                aria-label="Remove bullet"
                                onClick={() => {
                                  const items = [...doc.experience.items];
                                  const cur = items[i];
                                  if (!cur) return;
                                  const rowCount = cur.bullets.length > 0 ? cur.bullets.length : 1;
                                  const next = cur.bullets.filter((_, j) => j !== bi);
                                  items[i] = {
                                    ...cur,
                                    bullets: rowCount <= 1 && next.length === 0 ? [] : next,
                                  };
                                  set("experience", { ...doc.experience, items });
                                }}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </div>
                          ))}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="self-start"
                            onClick={() => {
                              const items = [...doc.experience.items];
                              const cur = items[i];
                              if (!cur) return;
                              const base = cur.bullets.length > 0 ? [...cur.bullets] : [""];
                              items[i] = { ...cur, bullets: [...base, ""] };
                              set("experience", { ...doc.experience, items });
                            }}
                          >
                            <Plus className="mr-1 size-4" />
                            Add bullet
                          </Button>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          set("experience", {
                            ...doc.experience,
                            items: doc.experience.items.filter((_, j) => j !== i),
                          })
                        }
                      >
                        Remove role
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      set("experience", {
                        ...doc.experience,
                        items: [
                          ...doc.experience.items,
                          {
                            company: "",
                            role: "",
                            start: "",
                            end: "",
                            bullets: [],
                          },
                        ],
                      })
                    }
                  >
                    Add experience
                  </Button>
                </CardContent>
              </Card>
            );
          case "education":
            return (
              <Card key={sectionKey}>
                <CardHeader>
                  <div className="flex flex-row flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-1">
                      <CardTitle>Education</CardTitle>
                      <SectionOrderControls
                        sectionKey="education"
                        order={doc.sectionOrder}
                        onReorder={(next) => set("sectionOrder", next)}
                      />
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Switch
                        checked={doc.education.enabled}
                        onCheckedChange={(v) => set("education", { ...doc.education, enabled: v })}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  {doc.education.items.map((ed, i) => (
                    <div key={i} className="grid gap-2 md:grid-cols-3">
                      <Input
                        placeholder="School"
                        value={ed.school}
                        onChange={(e) => {
                          const items = [...doc.education.items];
                          const cur = items[i];
                          if (cur) items[i] = { ...cur, school: e.target.value };
                          set("education", { ...doc.education, items });
                        }}
                      />
                      <Input
                        placeholder="Degree"
                        value={ed.degree}
                        onChange={(e) => {
                          const items = [...doc.education.items];
                          const cur = items[i];
                          if (cur) items[i] = { ...cur, degree: e.target.value };
                          set("education", { ...doc.education, items });
                        }}
                      />
                      <Input
                        placeholder="Year"
                        value={ed.year}
                        onChange={(e) => {
                          const items = [...doc.education.items];
                          const cur = items[i];
                          if (cur) items[i] = { ...cur, year: e.target.value };
                          set("education", { ...doc.education, items });
                        }}
                      />
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      set("education", {
                        ...doc.education,
                        items: [...doc.education.items, { school: "", degree: "", year: "" }],
                      })
                    }
                  >
                    Add education
                  </Button>
                </CardContent>
              </Card>
            );
          case "projects":
            return (
              <Card key={sectionKey}>
                <CardHeader>
                  <div className="flex flex-row flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-1">
                      <CardTitle>Projects</CardTitle>
                      <SectionOrderControls
                        sectionKey="projects"
                        order={doc.sectionOrder}
                        onReorder={(next) => set("sectionOrder", next)}
                      />
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Switch
                        checked={doc.projects.enabled}
                        onCheckedChange={(v) => set("projects", { ...doc.projects, enabled: v })}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  {doc.projects.items.map((p, i) => (
                    <div key={i} className="border-base-300 space-y-2 rounded-lg border p-4">
                      <Input
                        placeholder="Name"
                        value={p.name}
                        onChange={(e) => {
                          const items = [...doc.projects.items];
                          const cur = items[i];
                          if (cur) items[i] = { ...cur, name: e.target.value };
                          set("projects", { ...doc.projects, items });
                        }}
                      />
                      <Input
                        placeholder="URL"
                        value={p.url}
                        onChange={(e) => {
                          const items = [...doc.projects.items];
                          const cur = items[i];
                          if (cur) items[i] = { ...cur, url: e.target.value };
                          set("projects", { ...doc.projects, items });
                        }}
                      />
                      <Textarea
                        placeholder="Description"
                        value={p.description}
                        onChange={(e) => {
                          const items = [...doc.projects.items];
                          const cur = items[i];
                          if (cur) items[i] = { ...cur, description: e.target.value };
                          set("projects", { ...doc.projects, items });
                        }}
                      />
                      <Input
                        placeholder="Tech (comma-separated)"
                        value={p.tech.join(", ")}
                        onChange={(e) => {
                          const items = [...doc.projects.items];
                          const cur = items[i];
                          if (cur)
                            items[i] = {
                              ...cur,
                              tech: e.target.value
                                .split(",")
                                .map((s) => s.trim())
                                .filter(Boolean),
                            };
                          set("projects", { ...doc.projects, items });
                        }}
                      />
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      set("projects", {
                        ...doc.projects,
                        items: [
                          ...doc.projects.items,
                          { name: "", url: "", description: "", tech: [] },
                        ],
                      })
                    }
                  >
                    Add project
                  </Button>
                </CardContent>
              </Card>
            );
          case "skills":
            return (
              <Card key={sectionKey}>
                <CardHeader>
                  <div className="flex flex-row flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-1">
                      <CardTitle>Skills</CardTitle>
                      <SectionOrderControls
                        sectionKey="skills"
                        order={doc.sectionOrder}
                        onReorder={(next) => set("sectionOrder", next)}
                      />
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Switch
                        checked={doc.skills.enabled}
                        onCheckedChange={(v) => set("skills", { ...doc.skills, enabled: v })}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  {doc.skills.groups.map((g, gi) => (
                    <div key={gi} className="space-y-2">
                      <Input
                        placeholder="Group name"
                        value={g.name}
                        onChange={(e) => {
                          const groups = [...doc.skills.groups];
                          const cur = groups[gi];
                          if (cur) groups[gi] = { ...cur, name: e.target.value };
                          set("skills", { ...doc.skills, groups });
                        }}
                      />
                      <Textarea
                        placeholder="Skills (one per line)"
                        rows={3}
                        value={g.items.join("\n")}
                        onChange={(e) => {
                          const groups = [...doc.skills.groups];
                          const cur = groups[gi];
                          if (cur)
                            groups[gi] = {
                              ...cur,
                              items: e.target.value.split("\n").filter(Boolean),
                            };
                          set("skills", { ...doc.skills, groups });
                        }}
                      />
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      set("skills", {
                        ...doc.skills,
                        groups: [...doc.skills.groups, { name: "", items: [] }],
                      })
                    }
                  >
                    Add skill group
                  </Button>
                </CardContent>
              </Card>
            );
          default:
            return null;
        }
      })}

      <div className="flex gap-2">
        <Button type="button" variant="secondary" onClick={() => onChange(createDefaultResume())}>
          Reset to sample
        </Button>
      </div>
    </div>
  );
}
