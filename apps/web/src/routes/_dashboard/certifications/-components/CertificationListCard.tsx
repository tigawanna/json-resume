import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { CertificationListItemDTO } from "@/data-access-layer/resume/certifications/certification.types";
import { Award, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { CertificationEditForm } from "./CertificationEditForm";

interface CertificationListCardProps {
  certification: CertificationListItemDTO;
  onDelete?: (id: string) => void;
}

export function CertificationListCard({ certification, onDelete }: CertificationListCardProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Card className="group relative" data-test={`certification-card-${certification.id}`}>
        <CardHeader>
          <div className="flex items-start gap-3">
            <Award className="text-primary mt-0.5 size-5 shrink-0" />
            <div className="min-w-0 flex-1">
              <CardTitle className="truncate text-base">{certification.name}</CardTitle>
              {certification.issuer && (
                <CardDescription className="mt-1 text-xs">{certification.issuer}</CardDescription>
              )}
              {certification.date && (
                <p className="text-muted-foreground mt-1 text-xs">{certification.date}</p>
              )}
              <Badge variant="outline" className="mt-2 text-xs">
                {certification.resumeName}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => setOpen(true)}
            data-test="certification-edit-btn"
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => onDelete?.(certification.id)}
            data-test="certification-delete-btn"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </Card>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Certification</DialogTitle>
          </DialogHeader>
          <CertificationEditForm certification={certification} onSuccess={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
