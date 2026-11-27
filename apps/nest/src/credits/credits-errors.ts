/** Expected outcome: a projected résumé has no credits left. */
export class InsufficientCreditsError extends Error {
  readonly code = 'INSUFFICIENT_CREDITS';
  readonly available: number;

  constructor({ available }: { available: number }) {
    super('Insufficient credits');
    this.name = 'InsufficientCreditsError';
    this.available = available;
  }
}
