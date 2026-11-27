import { describe, expect, it } from 'vitest';
import { collectSkillNames } from './skill-groups.js';

describe('legacy import skill names', () => {
  it('deduplicates skill ids in first-use order across résumé layouts', () => {
    const names = collectSkillNames({
      resumes: [
        { layout: { skillGroups: [{ id: 'group', skills: ['b', 'a', 'b'] }] } },
        { layout: { skillGroups: [{ id: 'group', skills: ['a', 'c'] }] } },
      ],
      skills: [
        { id: 'a', name: 'TypeScript' },
        { id: 'b', name: 'Go' },
        { id: 'c', name: 'Rust' },
      ],
    });
    expect(names.get('group')).toEqual(['Go', 'TypeScript', 'Rust']);
  });

  it('skips malformed layouts and deleted skills', () => {
    const names = collectSkillNames({
      resumes: [
        { layout: null },
        { layout: { skillGroups: [{ id: 'group', skills: ['gone'] }] } },
      ],
      skills: [],
    });
    expect(names.get('group')).toEqual([]);
  });
});
