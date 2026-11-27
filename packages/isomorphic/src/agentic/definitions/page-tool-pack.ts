export const pageToolPacks = [
  "library",
  "experience",
  "job",
  "resume-list",
  "cover-letter",
  "none",
] as const;

/** Which page pack is live. Tools outside it are not sent to the model. */
export type PageToolPack = (typeof pageToolPacks)[number];
