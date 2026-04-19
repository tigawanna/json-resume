import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateLinks } from "@/data-access-layer/resume/resume.functions";
import { unwrapUnknownError } from "@/utils/errors";
import { useMutation } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";


interface LinkRow {
  label: string;
  url: string;
  icon?: string;
}

export function LinksForm() {
  const resume = useWorkbench((s) => s.resume);
  const [links, setLinks] = useState<LinkRow[]>(
    resume.links.map((l) => ({ label: l.label, url: l.url, icon: l.icon ?? undefined })),
  );

  const mutation = useMutation({
    mutationFn: async () => updateLinks({ data: { resumeId: resume.id, links } }),
    onSuccess() {
      toast.success("Links saved");
    },
    onError(err: unknown) {
      toast.error("Failed to save links", {
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

  function updateLink(index: number, field: keyof LinkRow, value: string) {
    setLinks((prev) => prev.map((l, i) => (i === index ? { ...l, [field]: value } : l)));
  }

  return (
    <div className="flex flex-col gap-4" data-test="links-form">
      {links.map((link, index) => (
        <div key={index} className="flex items-end gap-2">
          <div className="w-32">
            <Label className="text-xs">Label</Label>
            <Input
              value={link.label}
              onChange={(e) => updateLink(index, "label", e.target.value)}
              placeholder="GitHub"
            />
          </div>
          <div className="flex-1">
            <Label className="text-xs">URL</Label>
            <Input
              value={link.url}
              onChange={(e) => updateLink(index, "url", e.target.value)}
              placeholder="https://github.com/username"
            />
          </div>
          <div className="w-24">
            <Label className="text-xs">Icon</Label>
            <Input
              value={link.icon ?? ""}
              onChange={(e) => updateLink(index, "icon", e.target.value)}
              placeholder="github"
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={() => removeLink(index)}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ))}
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={addLink}>
          <Plus className="mr-1 size-3" /> Add Link
        </Button>
        <Button size="sm" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          Save Links
        </Button>
      </div>
    </div>
  );
}
