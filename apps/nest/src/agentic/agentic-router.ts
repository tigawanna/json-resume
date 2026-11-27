import {
  getJobToolInputSchema,
  getJobToolOutputSchema,
  listJobsToolInputSchema,
  listJobsToolOutputSchema,
} from '@repo/isomorphic/agentic/tool-schemas/resume/job';
import {
  rankLibraryForJobToolInputSchema,
  rankLibraryForJobToolOutputSchema,
  searchLibraryToolInputSchema,
  searchLibraryToolOutputSchema,
} from '@repo/isomorphic/agentic/tool-schemas/resume/library';
import {
  getResumeToolInputSchema,
  getResumeToolOutputSchema,
  listResumesToolInputSchema,
  listResumesToolOutputSchema,
  rankResumesForJobToolInputSchema,
  rankResumesForJobToolOutputSchema,
} from '@repo/isomorphic/agentic/tool-schemas';
import { resumeReadProcedure } from './agentic-base.js';
import { AgenticJobService } from './agentic-job.service.js';
import { AgenticLibraryService } from './agentic-library.service.js';
import { AgenticResumeService } from './agentic-resume.service.js';

export function createAgenticRouter({
  resumes,
  library,
  jobs,
}: {
  resumes: AgenticResumeService;
  library: AgenticLibraryService;
  jobs: AgenticJobService;
}) {
  const listResumes = resumeReadProcedure
    .route({
      method: 'POST',
      path: '/resumes/list',
      summary: 'List resumes',
      tags: ['Agentic Resumes'],
      successStatus: 200,
    })
    .input(listResumesToolInputSchema)
    .output(listResumesToolOutputSchema)
    .handler(async ({ context, input }) =>
      resumes.listResumes({ userId: context.userId, input }),
    );

  const getResume = resumeReadProcedure
    .route({
      method: 'POST',
      path: '/resumes/get',
      summary: 'Get a resume',
      tags: ['Agentic Resumes'],
      successStatus: 200,
    })
    .input(getResumeToolInputSchema)
    .output(getResumeToolOutputSchema)
    .handler(async ({ context, input }) =>
      resumes.getResume({ userId: context.userId, input }),
    );

  const rankResumes = resumeReadProcedure
    .route({
      method: 'POST',
      path: '/resumes/rank-for-job',
      summary: 'Rank resumes for a job',
      tags: ['Agentic Resumes'],
      successStatus: 200,
    })
    .input(rankResumesForJobToolInputSchema)
    .output(rankResumesForJobToolOutputSchema)
    .handler(async ({ context, input }) =>
      resumes.rankResumes({ userId: context.userId, input }),
    );

  const searchLibrary = resumeReadProcedure
    .route({
      method: 'POST',
      path: '/library/search',
      summary: 'Search the library',
      tags: ['Agentic Library'],
      successStatus: 200,
    })
    .input(searchLibraryToolInputSchema)
    .output(searchLibraryToolOutputSchema)
    .handler(async ({ context, input }) =>
      library.searchLibrary({ userId: context.userId, input }),
    );

  const rankLibrary = resumeReadProcedure
    .route({
      method: 'POST',
      path: '/library/rank-for-job',
      summary: 'Rank library items for a job',
      tags: ['Agentic Library'],
      successStatus: 200,
    })
    .input(rankLibraryForJobToolInputSchema)
    .output(rankLibraryForJobToolOutputSchema)
    .handler(async ({ context, input }) =>
      library.rankLibraryForJob({ userId: context.userId, input }),
    );

  const listJobs = resumeReadProcedure
    .route({
      method: 'POST',
      path: '/jobs/list',
      summary: 'List tracked jobs',
      tags: ['Agentic Jobs'],
      successStatus: 200,
    })
    .input(listJobsToolInputSchema)
    .output(listJobsToolOutputSchema)
    .handler(async ({ context, input }) =>
      jobs.listJobs({ userId: context.userId, input }),
    );

  const getJob = resumeReadProcedure
    .route({
      method: 'POST',
      path: '/jobs/get',
      summary: 'Get a tracked job',
      tags: ['Agentic Jobs'],
      successStatus: 200,
    })
    .input(getJobToolInputSchema)
    .output(getJobToolOutputSchema)
    .handler(async ({ context, input }) =>
      jobs.getJob({ userId: context.userId, input }),
    );

  return {
    resumes: { list: listResumes, get: getResume, rankForJob: rankResumes },
    library: { search: searchLibrary, rankForJob: rankLibrary },
    jobs: { list: listJobs, get: getJob },
  };
}

export type AgenticRouter = ReturnType<typeof createAgenticRouter>;
