import { pgTable, text, serial, timestamp, integer, index } from "drizzle-orm/pg-core";

export const interactionsTable = pgTable(
  "interactions",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    contactId: integer("contact_id").notNull(),
    content: text("content").notNull(),
    source: text("source").notNull().default("note"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("interactions_user_idx").on(t.userId),
    index("interactions_contact_idx").on(t.contactId),
  ],
);

export type Interaction = typeof interactionsTable.$inferSelect;
export type InsertInteraction = typeof interactionsTable.$inferInsert;
