import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { LanguageListItemDTO } from "@/data-access-layer/resume/languages/language.types";
import { Globe, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { LanguageEditForm } from "./LanguageEditForm";

interface LanguageListCardProps {
  language: LanguageListItemDTO;
  onDelete?: (id: string) => void;
}

export function LanguageListCard({ language, onDelete }: LanguageListCardProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Card className="group relative" data-test={`language-card-${language.id}`}>
        <CardHeader>
          <div className="flex items-start gap-3">
            <Globe className="text-primary mt-0.5 size-5 shrink-0" />
            <div className="min-w-0 flex-1">
              <CardTitle className="truncate text-base">{language.name}</CardTitle>
              {language.proficiency && (
                <CardDescription className="mt-1 text-xs">{language.proficiency}</CardDescription>
              )}
              <Badge variant="outline" className="mt-2 text-xs">
                {language.resumeName}
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
            data-test="language-edit-btn"
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => onDelete?.(language.id)}
            data-test="language-delete-btn"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </Card>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Language</DialogTitle>
          </DialogHeader>
          <LanguageEditForm language={language} onSuccess={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
