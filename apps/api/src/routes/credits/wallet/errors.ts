/**
 * Typed wallet errors. They are expected outcomes (not bugs), so routes map
 * them to HTTP codes instead of letting them hit onError.
 */

/** Thrown when a spend would take the balance below zero. Expected, not a bug. */
export class InsufficientCreditsError extends Error {
  readonly code = "INSUFFICIENT_CREDITS";
  readonly available: number;

  constructor(input: { available: number }) {
    super("Insufficient credits");
    this.name = "InsufficientCreditsError";
    this.available = input.available;
  }
}

export class UnknownUserError extends Error {
  readonly code = "UNKNOWN_USER";
  constructor() {
    super("Unknown user");
    this.name = "UnknownUserError";
  }
}

export class BannedUserError extends Error {
  readonly code = "USER_BANNED";
  constructor() {
    super("Banned users cannot receive credits");
    this.name = "BannedUserError";
  }
}

export class AdjustmentBelowZeroError extends Error {
  readonly code = "ADJUSTMENT_BELOW_ZERO";
  readonly bucket: string;

  constructor(input: { bucket: string }) {
    super("Adjustment would take the bucket below zero");
    this.name = "AdjustmentBelowZeroError";
    this.bucket = input.bucket;
  }
}
