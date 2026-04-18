import { pgTable, text, serial, timestamp, index, vector, boolean } from "drizzle-orm/pg-core";

export const contactsTable = pgTable(
  "contacts",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    project: text("project"),
    company: text("company"),
    context: text("context"),
    email: text("email"),
    telegramUsername: text("telegram_username"),
    xUsername: text("x_username"),
    discordUsername: text("discord_username"),
    tags: text("tags").array().notNull().default([]),
    starred: boolean("starred").default(false).notNull(),
    lastInteractionAt: timestamp("last_interaction_at", { withTimezone: true }),
    embedding: vector("embedding", { dimensions: 384 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("contacts_user_idx").on(t.userId),
    index("contacts_embedding_idx")
      .using("hnsw", t.embedding.op("vector_cosine_ops")),
  ],
);

export type Contact = typeof contactsTable.$inferSelect;
export type InsertContact = typeof contactsTable.$inferInsert;
