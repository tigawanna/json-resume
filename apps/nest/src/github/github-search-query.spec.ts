import { describe, expect, it } from 'vitest';
import { buildGithubSearchQuery } from './github-search-query.js';

describe('GitHub search query', () => {
  it('combines user scope, filters, and quoted qualifiers', () => {
    expect(
      buildGithubSearchQuery({
        login: 'octocat',
        params: {
          query: 'resume builder',
          language: 'type script',
          topic: 'developer tools',
          minStars: 10,
          fork: 'fork',
          archived: 'active',
          sort: 'stars',
          order: 'desc',
        },
      }),
    ).toBe(
      'user:octocat resume builder language:"type script" topic:"developer tools" stars:>=10 fork:only archived:false',
    );
  });

  it('supports all forks and archived repositories', () => {
    expect(
      buildGithubSearchQuery({
        login: 'octocat',
        params: {
          query: '',
          language: '',
          topic: '',
          fork: 'all',
          archived: 'archived',
          sort: 'best-match',
          order: 'asc',
        },
      }),
    ).toBe('user:octocat fork:true archived:true');
  });
});
