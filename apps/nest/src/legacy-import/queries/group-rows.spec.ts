import { describe, expect, it } from 'vitest';
import { newestByKey } from './group-rows.js';

describe('legacy import row grouping', () => {
  it('keeps the newest duplicate without changing first-seen group order', () => {
    const rows = [
      { id: 'a-old', key: 'a', updatedAt: new Date('2024-01-01') },
      { id: 'b', key: 'b', updatedAt: new Date('2024-01-02') },
      { id: 'a-new', key: 'a', updatedAt: new Date('2024-01-03') },
    ];
    expect(
      newestByKey({ rows, key: (row) => row.key }).map((row) => row.id),
    ).toEqual(['a-new', 'b']);
  });
});
