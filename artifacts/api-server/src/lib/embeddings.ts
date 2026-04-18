import { db, contactsTable, interactionsTable } from "@workspace/db";
import { and, eq, isNull, sql } from "drizzle-orm";

// Local embedding model via transformers.js. The Replit AI integrations proxy
// does not expose an embeddings endpoint, so we run a small sentence-transformer
// in-process. Model is downloaded once on first call (~25MB) then cached.
export const EMBEDDING_MODEL = "Xenova/all-MiniLM-L6-v2";
export const EMBEDDING_DIMS = 384;

let extractorPromise: Promise<(text: string | string[], opts?: unknown) => Promise<unknown>> | null =
  null;

async function getExtractor() {
  if (!extractorPromise) {
    const p = (async () => {
      const { pipeline, env } = await import("@xenova/transformers");
      // @ts-expect-error - allowLocalModels exists at runtime
      env.allowLocalModels = false;
      // @ts-expect-error - same
      env.useBrowserCache = false;
      const extractor = await pipeline("feature-extraction", EMBEDDING_MODEL);
      return extractor as unknown as (
        text: string | string[],
        opts?: unknown,
      ) => Promise<unknown>;
    })();
    // If model load fails, clear the cache so the next call can retry instead
    // of being permanently broken with a rejected promise.
    p.catch(() => {
      if (extractorPromise === p) extractorPromise = null;
    });
    extractorPromise = p;
  }
  return extractorPromise;
}

export function contactEmbeddingText(c: {
  name: string;
  project?: string | null;
  company?: string | null;
  context?: string | null;
  tags?: string[] | null;
}): string {
  return [
    c.name,
    c.project ? `Project: ${c.project}` : null,
    c.company ? `Company: ${c.company}` : null,
    c.context ? `Context: ${c.context}` : null,
    c.tags && c.tags.length ? `Tags: ${c.tags.join(", ")}` : null,
  ]
    .filter(Boolean)
    .join(" • ");
}

function tensorToVectors(out: unknown, batchSize: number): number[][] {
  // transformers.js returns a Tensor with `.data` (Float32Array) and `.dims`.
  const t = out as { data: Float32Array; dims: number[] };
  const flat = Array.from(t.data);
  const dim = flat.length / batchSize;
  const vectors: number[][] = [];
  for (let i = 0; i < batchSize; i++) {
    vectors.push(flat.slice(i * dim, (i + 1) * dim));
  }
  return vectors;
}

export async function embedText(text: string): Promise<number[] | null> {
  const trimmed = text.trim();
  if (!trimmed) return null;
  try {
    const extractor = await getExtractor();
    const out = await extractor(trimmed.slice(0, 8000), { pooling: "mean", normalize: true });
    const [vec] = tensorToVectors(out, 1);
    return vec ?? null;
  } catch (err) {
    console.error("embedText failed", err);
    return null;
  }
}

export async function embedTexts(texts: string[]): Promise<(number[] | null)[]> {
  const cleaned = texts.map((t) => t.trim().slice(0, 8000));
  const nonEmptyIdx: number[] = [];
  const inputs: string[] = [];
  cleaned.forEach((t, i) => {
    if (t) {
      nonEmptyIdx.push(i);
      inputs.push(t);
    }
  });
  if (!inputs.length) return texts.map(() => null);
  try {
    const extractor = await getExtractor();
    const out = await extractor(inputs, { pooling: "mean", normalize: true });
    const vectors = tensorToVectors(out, inputs.length);
    const result: (number[] | null)[] = texts.map(() => null);
    nonEmptyIdx.forEach((origIdx, i) => {
      result[origIdx] = vectors[i] ?? null;
    });
    return result;
  } catch (err) {
    console.error("embedTexts failed", err);
    return texts.map(() => null);
  }
}

export async function embedAndSetContact(contactId: number): Promise<void> {
  const [c] = await db.select().from(contactsTable).where(eq(contactsTable.id, contactId)).limit(1);
  if (!c) return;
  const v = await embedText(contactEmbeddingText(c));
  if (!v) return;
  await db.update(contactsTable).set({ embedding: v }).where(eq(contactsTable.id, contactId));
}

export async function embedAndSetInteraction(interactionId: number): Promise<void> {
  const [i] = await db
    .select()
    .from(interactionsTable)
    .where(eq(interactionsTable.id, interactionId))
    .limit(1);
  if (!i) return;
  const v = await embedText(i.content);
  if (!v) return;
  await db.update(interactionsTable).set({ embedding: v }).where(eq(interactionsTable.id, interactionId));
}

export async function backfillEmbeddings(opts: { batch?: number } = {}): Promise<{
  contacts: number;
  interactions: number;
}> {
  const batch = opts.batch ?? 32;
  let contactsDone = 0;
  let interactionsDone = 0;

  while (true) {
    const rows = await db
      .select()
      .from(contactsTable)
      .where(isNull(contactsTable.embedding))
      .orderBy(contactsTable.id)
      .limit(batch);
    if (rows.length === 0) break;
    const vectors = await embedTexts(rows.map((r) => contactEmbeddingText(r)));
    let updated = 0;
    for (let i = 0; i < rows.length; i++) {
      const v = vectors[i];
      if (!v) continue;
      await db.update(contactsTable).set({ embedding: v }).where(eq(contactsTable.id, rows[i].id));
      contactsDone++;
      updated++;
    }
    // If embedding failed for the entire batch, abort to avoid an infinite loop.
    if (updated === 0) break;
    if (rows.length < batch) break;
  }

  while (true) {
    const rows = await db
      .select()
      .from(interactionsTable)
      .where(isNull(interactionsTable.embedding))
      .orderBy(interactionsTable.id)
      .limit(batch);
    if (rows.length === 0) break;
    const vectors = await embedTexts(rows.map((r) => r.content));
    let updated = 0;
    for (let i = 0; i < rows.length; i++) {
      const v = vectors[i];
      if (!v) continue;
      await db
        .update(interactionsTable)
        .set({ embedding: v })
        .where(eq(interactionsTable.id, rows[i].id));
      interactionsDone++;
      updated++;
    }
    if (updated === 0) break;
    if (rows.length < batch) break;
  }

  return { contacts: contactsDone, interactions: interactionsDone };
}

export async function similarContacts(
  userId: string,
  queryEmbedding: number[],
  limit = 8,
) {
  const distance = sql<number>`${contactsTable.embedding} <=> ${JSON.stringify(queryEmbedding)}::vector`;
  return db
    .select({
      id: contactsTable.id,
      name: contactsTable.name,
      project: contactsTable.project,
      company: contactsTable.company,
      context: contactsTable.context,
      tags: contactsTable.tags,
      lastInteractionAt: contactsTable.lastInteractionAt,
      similarity: sql<number>`1 - (${distance})`.as("similarity"),
    })
    .from(contactsTable)
    .where(and(eq(contactsTable.userId, userId), sql`${contactsTable.embedding} is not null`))
    .orderBy(distance)
    .limit(limit);
}

export async function similarInteractions(
  userId: string,
  queryEmbedding: number[],
  limit = 10,
) {
  const distance = sql<number>`${interactionsTable.embedding} <=> ${JSON.stringify(queryEmbedding)}::vector`;
  return db
    .select({
      id: interactionsTable.id,
      contactId: interactionsTable.contactId,
      content: interactionsTable.content,
      occurredAt: interactionsTable.occurredAt,
      contactName: contactsTable.name,
      similarity: sql<number>`1 - (${distance})`.as("similarity"),
    })
    .from(interactionsTable)
    .innerJoin(contactsTable, eq(contactsTable.id, interactionsTable.contactId))
    .where(
      and(
        eq(interactionsTable.userId, userId),
        sql`${interactionsTable.embedding} is not null`,
      ),
    )
    .orderBy(distance)
    .limit(limit);
}
