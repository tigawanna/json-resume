import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { queryKeyPrefixes } from "@/data-access-layer/query-keys";
import { experiencesCollection } from "@/data-access-layer/resume/experiences/experience.collection";
import type { ExperienceListItemDTO } from "@/data-access-layer/resume/experiences/experience.types";
import { editExperience } from "@/data-access-layer/resume/resume.functions";
import { unwrapUnknownError } from "@/utils/errors";
import { useMutation } from "@tanstack/react-query";
import { Briefcase, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface ExperienceListCardProps {
  experience: ExperienceListItemDTO;
  onDelete?: (id: string) => void;
}

export function ExperienceListCard({ experience, onDelete }: ExperienceListCardProps) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState(experience.role);
  const [company, setCompany] = useState(experience.company);
  const [startDate, setStartDate] = useState(experience.startDate);
  const [endDate, setEndDate] = useState(experience.endDate);
  const [location, setLocation] = useState(experience.location);

  function resetFields() {
    setRole(experience.role);
    setCompany(experience.company);
    setStartDate(experience.startDate);
    setEndDate(experience.endDate);
    setLocation(experience.location);
  }

  const saveMutation = useMutation({
    mutationFn: async () =>
      editExperience({
        data: { id: experience.id, role, company, startDate, endDate, location },
      }),
    onSuccess() {
      toast.success("Experience saved");
      setOpen(false);
      experiencesCollection.utils.writeUpdate({
        ...experience,
        role,
        company,
        startDate,
        endDate,
        location,
      });
    },
    onError(err: unknown) {
      toast.error("Failed to save experience", {
        description: unwrapUnknownError(err).message,
      });
    },
    meta: {
      invalidates: [[queryKeyPrefixes.experiences], [queryKeyPrefixes.resumes]],
    },
  });

  const dateRange = [experience.startDate, experience.endDate].filter(Boolean).join(" – ");

  return (
    <>
      <Card className="group relative" data-test={`experience-card-${experience.id}`}>
        <CardHeader>
          <div className="flex items-start gap-3">
            <Briefcase className="text-primary mt-0.5 size-5 shrink-0" />
            <div className="min-w-0 flex-1">
              <CardTitle className="truncate text-base">{experience.role}</CardTitle>
              <CardDescription className="mt-1 text-xs">{experience.company}</CardDescription>
              {dateRange && <p className="text-muted-foreground mt-1 text-xs">{dateRange}</p>}
              {experience.location && (
                <p className="text-muted-foreground text-xs">{experience.location}</p>
              )}
              <Badge variant="outline" className="mt-2 text-xs">
                {experience.resumeName}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => {
              resetFields();
              setOpen(true);
            }}
            data-test="experience-edit-btn">
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => onDelete?.(experience.id)}
            data-test="experience-delete-btn">
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </Card>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!v) resetFields();
          setOpen(v);
        }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Experience</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs">Job Title</Label>
                <Input value={role} onChange={(e) => setRole(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Company</Label>
                <Input
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="mt-1"
                />
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
                <Input
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Location</Label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                resetFields();
                setOpen(false);
              }}>
              Cancel
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !role.trim() || !company.trim()}>
              {saveMutation.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
