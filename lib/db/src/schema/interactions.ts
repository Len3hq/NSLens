import { pgTable, text, serial, timestamp, integer, index, vector } from "drizzle-orm/pg-core";

export const interactionsTable = pgTable(
  "interactions",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    contactId: integer("contact_id").notNull(),
    content: text("content").notNull(),
    source: text("source").notNull().default("note"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    embedding: vector("embedding", { dimensions: 384 }),
  },
  (t) => [
    index("interactions_user_idx").on(t.userId),
    index("interactions_contact_idx").on(t.contactId),
    index("interactions_embedding_idx")
      .using("hnsw", t.embedding.op("vector_cosine_ops")),
  ],
);

export type Interaction = typeof interactionsTable.$inferSelect;
export type InsertInteraction = typeof interactionsTable.$inferInsert;
