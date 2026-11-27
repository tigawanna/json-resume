import { decodeAdminRowKey, encodeAdminRowKey } from './admin-row-key.js';

describe('admin row keys', () => {
  it('round-trips text and numeric primary keys', () => {
    const rowKey = encodeAdminRowKey({ values: ['resume-1', 42n] });
    expect(decodeAdminRowKey({ rowKey })).toEqual(['resume-1', '42']);
  });

  it('rejects malformed keys', () => {
    expect(() => decodeAdminRowKey({ rowKey: 'not-a-key' })).toThrow(
      /Invalid row key/,
    );
  });

  it('rejects unsafe numeric values', () => {
    expect(() =>
      encodeAdminRowKey({ values: [Number.MAX_SAFE_INTEGER + 1] }),
    ).toThrow(/Unsafe numeric primary key/);
  });
});
