import { pgTable, text, serial, timestamp, integer, index, vector } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { contactsTable } from "./contacts";

export const interactionsTable = pgTable(
  "interactions",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    contactId: integer("contact_id")
      .notNull()
      .references(() => contactsTable.id, { onDelete: "cascade" }),
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
