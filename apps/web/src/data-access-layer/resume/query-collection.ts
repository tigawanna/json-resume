import { queryClient } from "@/lib/tanstack/query/queryclient";
import {
  createBrowserWASQLitePersistence,
  openBrowserWASQLiteOPFSDatabase,
  persistedCollectionOptions,
} from "@tanstack/browser-db-sqlite-persistence";
import { createCollection } from "@tanstack/db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { z } from "zod";

export const resumeSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  jobDescription: z.string(),
  data: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export type Resume = z.infer<typeof resumeSchema>;

async function getResume(): Promise<Resume[]> {
  return [
    {
      id: "1",
      name: "John Doe",
      description: "John Doe is a software engineer",
      jobDescription: "John Doe is a software engineer",
      data: "John Doe is a software engineer",
      createdAt: new Date().getTime(),
      updatedAt: new Date().getTime(),
    },
  ];
}

const database = await openBrowserWASQLiteOPFSDatabase({
  databaseName: `tanstack-db.sqlite`,
});

const persistence = createBrowserWASQLitePersistence({
  database,
});

export const resumeCollection = createCollection(
  persistedCollectionOptions<Resume, string>({
    persistence,
    schemaVersion: 1,
    ...queryCollectionOptions({
      queryKey: ["resume"],
      queryFn: () => getResume(),
      getKey: (resume) => resume.id,
      queryClient: queryClient,
    }),
  }),
);
