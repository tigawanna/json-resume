import type { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createLegacyImportTestApp,
  legacyImportRequest,
} from './support/create-legacy-import-test-app.js';
import { seedLegacyImportRows } from './support/legacy-import-fixtures.js';
import { personas } from './support/personas.js';

describe('legacy remote-library import API', () => {
  let app: INestApplication<App>;
  let close: () => Promise<void>;
  const owner = { 'x-mock-user': personas.member.id };
  const other = { 'x-mock-user': personas.admin.id };

  function generatedOperationId({ operationId }: { operationId: string }) {
    const [controller, method] = operationId.split('_');
    if (!controller || !method)
      throw new Error(`Unexpected operation id: ${operationId}`);
    return `${controller[0]?.toLowerCase()}${controller.slice(1)}${method[0]?.toUpperCase()}${method.slice(1)}`;
  }

  beforeAll(async () => {
    const started = await createLegacyImportTestApp();
    app = started.app;
    close = started.close;
    await seedLegacyImportRows({ db: started.db });
  });

  afterAll(async () => {
    await close();
  });

  it('requires authentication', async () => {
    await legacyImportRequest(app).get('/api/legacy-import/talks').expect(401);
  });

  it('documents the stable generated operation names under one tag', async () => {
    const response = await legacyImportRequest(app)
      .get('/api/docs-json')
      .expect(200);
    const document: {
      paths: Record<
        string,
        Record<string, { operationId: string; tags: string[] }>
      >;
    } = response.body;
    const operations = Object.values(document.paths)
      .flatMap((path) => Object.values(path))
      .filter((operation) => operation.tags?.includes('legacy-import'));
    expect(
      operations
        .map((operation) =>
          generatedOperationId({ operationId: operation.operationId }),
        )
        .sort(),
    ).toEqual(
      [
        'legacyImportLibraryControllerListCertifications',
        'legacyImportLibraryControllerListContacts',
        'legacyImportLibraryControllerListEducation',
        'legacyImportLibraryControllerListExperiences',
        'legacyImportLibraryControllerListLanguages',
        'legacyImportLibraryControllerListLinks',
        'legacyImportLibraryControllerListProjects',
        'legacyImportLibraryControllerListSkillGroups',
        'legacyImportLibraryControllerListSummaries',
        'legacyImportLibraryControllerListTalks',
        'legacyImportLibraryControllerListVolunteers',
        'legacyImportResumeControllerGetResume',
        'legacyImportResumeControllerListResumes',
      ].sort(),
    );
  });

  it("pages and searches only the owner's rows with case-insensitive search", async () => {
    const first = await legacyImportRequest(app)
      .get('/api/legacy-import/talks')
      .set(owner)
      .expect(200);
    expect(first.body.items).toHaveLength(12);
    expect(first.body.items.map((row: { id: string }) => row.id)).not.toContain(
      'talk-admin',
    );
    expect(first.body.nextCursor).toBe('talk-12');
    expect(first.body.previousCursor).toBeUndefined();

    const second = await legacyImportRequest(app)
      .get('/api/legacy-import/talks')
      .query({ cursor: first.body.nextCursor, direction: 'after' })
      .set(owner)
      .expect(200);
    expect(second.body.items.map((row: { id: string }) => row.id)).toEqual([
      'talk-13',
    ]);
    expect(second.body.previousCursor).toBe('talk-13');

    const previous = await legacyImportRequest(app)
      .get('/api/legacy-import/talks')
      .query({ cursor: 'talk-13', direction: 'before' })
      .set(owner)
      .expect(200);
    expect(previous.body.items).toHaveLength(12);
    expect(previous.body.items[0].id).toBe('talk-01');

    const search = await legacyImportRequest(app)
      .get('/api/legacy-import/talks')
      .query({ keyword: 'needle' })
      .set(owner)
      .expect(200);
    expect(search.body.items.map((row: { id: string }) => row.id)).toEqual([
      'talk-12',
    ]);
    expect(search.body.items[0].createdAt).toBe('2024-01-01T00:00:00.000Z');
  });

  it('deduplicates contacts and links before cursor paging', async () => {
    const contacts = await legacyImportRequest(app)
      .get('/api/legacy-import/contacts')
      .set(owner)
      .expect(200);
    expect(contacts.body.items).toHaveLength(1);
    expect(contacts.body.items[0]).toMatchObject({
      id: 'contact-2-new',
      type: 'email',
      value: 'ada@example.com',
    });

    const links = await legacyImportRequest(app)
      .get('/api/legacy-import/links')
      .set(owner)
      .expect(200);
    expect(links.body.items).toHaveLength(1);
    expect(links.body.items[0].id).toBe('link-new');
  });

  it("groups skill names from only the owner's résumé layouts", async () => {
    const response = await legacyImportRequest(app)
      .get('/api/legacy-import/skill-groups')
      .set(owner)
      .expect(200);
    expect(response.body.items).toHaveLength(1);
    expect(JSON.parse(response.body.items[0].skills)).toEqual([
      'Go',
      'TypeScript',
    ]);
  });

  it('assembles owner-scoped résumé detail and excludes foreign-parent bullets', async () => {
    const response = await legacyImportRequest(app)
      .get('/api/legacy-import/resumes/resume-owner')
      .set(owner)
      .expect(200);
    expect(response.body).toMatchObject({
      id: 'resume-owner',
      fullName: 'Ada Lovelace',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-02-01T00:00:00.000Z',
      job: { id: 'job-owner', description: 'Build the Difference Engine' },
    });
    expect(
      response.body.experiences[0].bullets.map((row: { id: string }) => row.id),
    ).toEqual(['bullet-owner']);
    expect(response.body.education[0].bullets[0].id).toBe('education-bullet');
    expect(
      response.body.skillGroups[0].skills.map(
        (row: { name: string }) => row.name,
      ),
    ).toEqual(['Go', 'TypeScript', 'Go']);

    await legacyImportRequest(app)
      .get('/api/legacy-import/resumes/resume-owner')
      .set(other)
      .expect(200)
      .expect((response) => expect(response.text).toBe(''));
  });

  it("lists and searches only the owner's résumés", async () => {
    const response = await legacyImportRequest(app)
      .get('/api/legacy-import/resumes')
      .query({ keyword: 'owner' })
      .set(owner)
      .expect(200);
    expect(response.body.map((row: { id: string }) => row.id)).toEqual([
      'resume-owner',
    ]);
  });
});
