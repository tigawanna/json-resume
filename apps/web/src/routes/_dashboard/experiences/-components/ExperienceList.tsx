import { experiencesCollection } from "@/data-access-layer/resume/experiences/experience.collection";
import { deleteExperienceMutationOptions } from "@/data-access-layer/resume/experiences/experience.mutation-options";
import { ilike, or, useLiveSuspenseQuery } from "@tanstack/react-db";
import { useMutation } from "@tanstack/react-query";
import { Briefcase } from "lucide-react";
import { Route } from "..";
import { ExperienceListCard } from "./ExperienceListCard";

export function ExperienceList() {
  const { sq } = Route.useSearch();

  const { data: experiences } = useLiveSuspenseQuery(
    (q) => {
      let query = q.from({ experience: experiencesCollection });
      if (sq) {
        const pattern = `%${sq}%`;
        query = query.where(({ experience }) =>
          or(
            ilike(experience.company, pattern),
            ilike(experience.role, pattern),
            ilike(experience.location, pattern),
          ),
        );
      }
      return query;
    },
    [sq],
  );

  const deleteMutation = useMutation(deleteExperienceMutationOptions);

  return (
    <div className="flex w-full h-full flex-col gap-6" data-test="experience-list-page">
      <div className="flex-1" data-test="experience-list">
        {experiences.length === 0 ? (
          <div className="flex flex-col h-full items-center justify-center gap-4 py-16">
            <Briefcase className="text-muted-foreground size-12" />
            <p className="text-muted-foreground text-sm">
              No experiences found. Add experiences to your resumes first.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {experiences.map((experience) => (
              <ExperienceListCard
                key={experience.id}
                experience={experience}
                onDelete={(id) => {
                  experiencesCollection.utils.writeDelete(id);
                  deleteMutation.mutate(id);
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
