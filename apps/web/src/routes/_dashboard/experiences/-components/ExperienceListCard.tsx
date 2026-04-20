import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ExperienceListItemDTO } from "@/data-access-layer/resume/experiences/experience.types";
import { Link } from "@tanstack/react-router";
import { Briefcase, Trash2 } from "lucide-react";

interface ExperienceListCardProps {
  experience: ExperienceListItemDTO;
  onDelete?: (id: string) => void;
}

export function ExperienceListCard({ experience, onDelete }: ExperienceListCardProps) {
  const dateRange = [experience.startDate, experience.endDate].filter(Boolean).join(" – ");

  return (
    <Card className="group relative" data-test={`experience-card-${experience.id}`}>
      <Link
        to="/resumes/$resumeId"
        params={{ resumeId: experience.resumeId }}
        search={(prev) => ({ ...prev, tab: "edit" })}
        className="block">
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
      </Link>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 size-7 opacity-0 transition-opacity group-hover:opacity-100"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDelete?.(experience.id);
        }}
        data-test="experience-delete-btn">
        <Trash2 className="size-3.5" />
      </Button>
    </Card>
  );
}
