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
import { Textarea } from "@/components/ui/textarea";
import { queryKeyPrefixes } from "@/data-access-layer/query-keys";
import { educationCollection } from "@/data-access-layer/resume/education/education.collection";
import type { EducationListItemDTO } from "@/data-access-layer/resume/education/education.types";
import { editEducation } from "@/data-access-layer/resume/resume.functions";
import { unwrapUnknownError } from "@/utils/errors";
import { useMutation } from "@tanstack/react-query";
import { GraduationCap, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface EducationListCardProps {
  education: EducationListItemDTO;
  onDelete?: (id: string) => void;
}

export function EducationListCard({ education, onDelete }: EducationListCardProps) {
  const [open, setOpen] = useState(false);
  const [school, setSchool] = useState(education.school);
  const [degree, setDegree] = useState(education.degree);
  const [field, setField] = useState(education.field);
  const [startDate, setStartDate] = useState(education.startDate);
  const [endDate, setEndDate] = useState(education.endDate);
  const [description, setDescription] = useState(education.description);

  function resetFields() {
    setSchool(education.school);
    setDegree(education.degree);
    setField(education.field);
    setStartDate(education.startDate);
    setEndDate(education.endDate);
    setDescription(education.description);
  }

  const saveMutation = useMutation({
    mutationFn: async () =>
      editEducation({
        data: { id: education.id, school, degree, field, startDate, endDate, description },
      }),
    onSuccess() {
      toast.success("Education saved");
      setOpen(false);
      educationCollection.utils.writeUpdate({
        ...education,
        school,
        degree,
        field,
        startDate,
        endDate,
        description,
      });
    },
    onError(err: unknown) {
      toast.error("Failed to save education", {
        description: unwrapUnknownError(err).message,
      });
    },
    meta: {
      invalidates: [[queryKeyPrefixes.education], [queryKeyPrefixes.resumes]],
    },
  });

  const dateRange = [education.startDate, education.endDate].filter(Boolean).join(" – ");
  const subtitle = [education.degree, education.field].filter(Boolean).join(" in ");

  return (
    <>
      <Card className="group relative" data-test={`education-card-${education.id}`}>
        <CardHeader>
          <div className="flex items-start gap-3">
            <GraduationCap className="text-primary mt-0.5 size-5 shrink-0" />
            <div className="min-w-0 flex-1">
              <CardTitle className="truncate text-base">{education.school}</CardTitle>
              {subtitle && <CardDescription className="mt-1 text-xs">{subtitle}</CardDescription>}
              {dateRange && <p className="text-muted-foreground mt-1 text-xs">{dateRange}</p>}
              <Badge variant="outline" className="mt-2 text-xs">
                {education.resumeName}
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
            data-test="education-edit-btn">
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => onDelete?.(education.id)}
            data-test="education-delete-btn">
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </Card>

      <Dialog open={open} onOpenChange={(v) => { if (!v) resetFields(); setOpen(v); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Education</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs">School</Label>
                <Input value={school} onChange={(e) => setSchool(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Degree</Label>
                <Input value={degree} onChange={(e) => setDegree(e.target.value)} className="mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Field of Study</Label>
              <Input value={field} onChange={(e) => setField(e.target.value)} className="mt-1" />
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
              <Label className="text-xs">Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { resetFields(); setOpen(false); }}>
              Cancel
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !school.trim() || !degree.trim()}>
              {saveMutation.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
