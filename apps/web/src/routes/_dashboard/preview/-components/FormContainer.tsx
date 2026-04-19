import { MetadataForm } from "@/components/resume/resume-editor-forms/MetadataForm";
import { resumeCollection } from "@/data-access-layer/resume/resumes-query-collection";
import { eq, useLiveQuery } from "@tanstack/react-db";

interface FormContainerProps {}

export function FormContainer({}: FormContainerProps) {
  const resumeId = "3d93e569-ef45-40de-9efa-6050d93fbea2";
  const { data, isLoading } = useLiveQuery((q) =>
    q
      .from({ resume: resumeCollection })
      .where(({ resume }) => eq(resume.id, resumeId))
      .findOne(),
  );
  if (isLoading) {
    return <p>Loading...</p>;
  }
  if (!data) {
    return <p>No resume found.</p>;
  }
  return (
    <div className="w-full h-full flex flex-col items-center justify-center">
      <MetadataForm resumeId={resumeId} />
    </div>
  );
}
