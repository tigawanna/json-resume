import { Logger } from '@nestjs/common';
import { AdminAuditService } from './admin-audit.service.js';

describe('AdminAuditService', () => {
  afterEach(() => vi.restoreAllMocks());

  it('writes one structured success event with the authenticated actor', async () => {
    const log = vi
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);
    const audit = new AdminAuditService();
    const result = await audit.run({
      action: 'update-row',
      actor: { id: 'admin-1', email: 'admin@example.com' },
      input: { table: 'resume', rowid: 7, columns: ['name'] },
      execute: async () => ({ changed: 1 }),
    });

    expect(result).toEqual({ changed: 1 });
    expect(log).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining('"action":"update-row"'),
    );
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining(
        '"actor":{"id":"admin-1","email":"admin@example.com"}',
      ),
    );
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining('"outcome":"success"'),
    );
    expect(log).toHaveBeenCalledWith(expect.stringContaining('"durationMs":'));
  });

  it('logs the failure and rethrows the original value', async () => {
    const error = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    const audit = new AdminAuditService();
    const failure = new Error('confirmation mismatch');

    await expect(
      audit.run({
        action: 'truncate-table',
        actor: { id: 'admin-1', email: 'admin@example.com' },
        input: { table: 'resume' },
        execute: async () => {
          throw failure;
        },
      }),
    ).rejects.toBe(failure);

    expect(error).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining('"outcome":"error"'),
    );
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining('confirmation mismatch'),
    );
  });
});
