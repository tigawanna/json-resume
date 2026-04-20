import { Button } from "@/components/ui/button";
import { createResumeMuationOptions } from "@/data-access-layer/resume/resume-mutatin-options";
import { useMutation } from "@tanstack/react-query";
import { Plus } from "lucide-react";

export function NewResumeButton() {
  const createMutation = useMutation(createResumeMuationOptions);
  return (
    <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
      <Plus className="mr-2 size-4" />
      {createMutation.isPending ? "(Creating...)" : "New Resume"}
    </Button>
  );
}
