/** How many résumés a full history seed writes. Tests pass a smaller count. */
export const HISTORY_RESUMES = 50;

/** Updates after the create, per résumé and per child row. */
export const HISTORY_UPDATES = 20;

const owned = {
  userId: "u1" as string | null,
  searchableText: "",
  embedding: null as number[] | null,
  embeddingModel: null as string | null,
  createdAt: 1,
  updatedAt: 1,
};

export const childStamp = {
  searchableText: "",
  embedding: null as number[] | null,
  embeddingModel: null as string | null,
  createdAt: 1,
  updatedAt: 1,
};

export const parentStamp = owned;

export async function persisted(write: { isPersisted: { promise: Promise<unknown> } }) {
  await write.isPersisted.promise;
}
