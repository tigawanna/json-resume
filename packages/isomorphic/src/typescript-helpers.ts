/**
 * Utility type that converts readonly types to mutable ones
 * Recursively removes `readonly` modifiers and converts readonly arrays to mutable arrays
 */
export type ReadonlyToMutable<T> = {
  -readonly [K in keyof T]: T[K] extends readonly (infer U)[]
    ? U[]
    : T[K] extends object
      ? ReadonlyToMutable<T[K]>
      : T[K];
};
