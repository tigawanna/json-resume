import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { EducationListItemDTO } from "@/data-access-layer/resume/education/education.types";
import { Link } from "@tanstack/react-router";
import { GraduationCap, Trash2 } from "lucide-react";

interface EducationListCardProps {
  education: EducationListItemDTO;
  onDelete?: (id: string) => void;
}

export function EducationListCard({ education, onDelete }: EducationListCardProps) {
  const dateRange = [education.startDate, education.endDate].filter(Boolean).join(" – ");
  const subtitle = [education.degree, education.field].filter(Boolean).join(" in ");

  return (
    <Card className="group relative" data-test={`education-card-${education.id}`}>
      <Link
        to="/resumes/$resumeId"
        params={{ resumeId: education.resumeId }}
        search={(prev) => ({ ...prev, tab: "edit" })}
        className="block">
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
      </Link>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 size-7 opacity-0 transition-opacity group-hover:opacity-100"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDelete?.(education.id);
        }}
        data-test="education-delete-btn">
        <Trash2 className="size-3.5" />
      </Button>
    </Card>
  );
}
