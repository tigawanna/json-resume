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
      <Card
        className="flex flex-row items-start gap-2 py-6"
        data-test={`certification-card-${certification.id}`}
      >
        <CardHeader className="min-w-0 flex-1 space-y-0 p-0 px-6 pr-3 pb-0">
          <div className="flex min-w-0 items-start gap-3">
            <Award className="text-primary mt-0.5 size-5 shrink-0" />
            <div className="min-w-0 flex-1">
              <CardTitle className="truncate text-base">{certification.name}</CardTitle>
              {certification.issuer && (
                <CardDescription className="mt-1 truncate text-xs">
                  {certification.issuer}
                </CardDescription>
              )}
              {certification.date && (
                <p className="text-muted-foreground mt-1 text-xs">{certification.date}</p>
              )}
              <Badge variant="outline" className="mt-2 max-w-48 truncate text-xs">
                {certification.resumeName}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <div className="flex shrink-0 flex-col gap-0.5 pr-6">
          <Button
            variant="ghost"
            size="icon"
            className="size-7 shrink-0"
            onClick={() => setOpen(true)}
            data-test="certification-edit-btn"
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 shrink-0"
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
