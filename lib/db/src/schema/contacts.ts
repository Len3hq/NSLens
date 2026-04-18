import { pgTable, text, serial, timestamp, index } from "drizzle-orm/pg-core";

export const contactsTable = pgTable(
  "contacts",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    project: text("project"),
    company: text("company"),
    context: text("context"),
    tags: text("tags").array().notNull().default([]),
    lastInteractionAt: timestamp("last_interaction_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("contacts_user_idx").on(t.userId)],
);

export type Contact = typeof contactsTable.$inferSelect;
export type InsertContact = typeof contactsTable.$inferInsert;
