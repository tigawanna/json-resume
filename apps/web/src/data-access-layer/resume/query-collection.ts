import { createCollection } from "@tanstack/db";
import {
  createBrowserWASQLitePersistence,
  openBrowserWASQLiteOPFSDatabase,
  persistedCollectionOptions,
} from "@tanstack/browser-db-sqlite-persistence";

type Resume = {
  id: string;
  name: string;
  description: string;
  jobDescription: string;
  data: string;
  createdAt: number;
  updatedAt: number;
};

const database = await openBrowserWASQLiteOPFSDatabase({
  databaseName: `tanstack-db.sqlite`,
});

const persistence = createBrowserWASQLitePersistence({
  database,
});

export const todosCollection = createCollection(
  persistedCollectionOptions<Resume, string>({
    id: `resume`,
    getKey: (resume) => resume.id,
    persistence,
    schemaVersion: 1,
  }),
);
