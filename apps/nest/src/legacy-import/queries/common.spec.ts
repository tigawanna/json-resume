import { describe, expect, it } from 'vitest';
import { pageRows } from './common.js';

const rows = Array.from({ length: 13 }, (_, index) => ({
  id: `row-${index + 1}`,
}));
const getId = (row: { id: string }) => row.id;

describe('legacy import cursor pages', () => {
  it('returns the default page and an after cursor', () => {
    const page = pageRows({ rows, direction: 'after', getId });
    expect(page.items).toHaveLength(12);
    expect(page.items[0]?.id).toBe('row-1');
    expect(page.nextCursor).toBe('row-12');
    expect(page.previousCursor).toBeUndefined();
  });

  it('returns a previous cursor on later after pages', () => {
    const page = pageRows({
      rows: [{ id: 'row-13' }],
      cursor: 'row-12',
      direction: 'after',
      getId,
    });
    expect(page.items.map((row) => row.id)).toEqual(['row-13']);
    expect(page.nextCursor).toBeUndefined();
    expect(page.previousCursor).toBe('row-13');
  });

  it('reverses before pages back into ascending display order', () => {
    const page = pageRows({
      rows: rows.slice(0, 12).reverse(),
      cursor: 'row-13',
      direction: 'before',
      getId,
    });
    expect(page.items[0]?.id).toBe('row-1');
    expect(page.items.at(-1)?.id).toBe('row-12');
    expect(page.previousCursor).toBeUndefined();
    expect(page.nextCursor).toBe('row-12');
  });
});
