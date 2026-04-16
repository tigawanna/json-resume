import { Button } from "@/components/ui/button";
import { Card, CardTitle, CardHeader, CardContent, CardDescription } from "@/components/ui/card";
import { resumeCollection } from "@/data-access-layer/resume/query-collection";
import { useLiveQuery } from "@tanstack/react-db";
interface TanstackDbProps {}

export default function TanstackDb({}: TanstackDbProps) {
  const { data, isLoading } = useLiveQuery((q) => q.from({ resumes: resumeCollection }));

  const addRandomResume = () => {
    const newResume = Array.from({ length: 10 }, () => ({
      id: crypto.randomUUID(),
      name: `Resume ${Math.random()}`,
      description: `Description ${Math.random()}`,
      jobDescription: `Job Description ${Math.random()}`,
      data: `Data ${Math.random()}`,
      createdAt: new Date().getTime(),
      updatedAt: new Date().getTime(),
    }));
    const oneResume = newResume[0];
    resumeCollection.insert(oneResume);
  };
  return (
    <div className="w-full h-full min-h-screen flex flex-col items-center justify-center">
      <h1>Tanstack Db</h1>
      <Button onClick={addRandomResume}>Add Random Resume</Button>
      {isLoading && <div>Loading...</div>}
      <div className="flex flex-col gap-2 w-full">
        {data?.map((resume) => (
          <Card key={resume.id} className="w-full">
            <CardHeader>
              <CardTitle>{resume.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>{resume.description}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
