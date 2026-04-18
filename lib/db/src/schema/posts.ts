import { pgTable, text, serial, timestamp, index } from "drizzle-orm/pg-core";

export const postsTable = pgTable(
  "posts",
  {
    id: serial("id").primaryKey(),
    authorId: text("author_id").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("posts_author_idx").on(t.authorId)],
);

export type Post = typeof postsTable.$inferSelect;
export type InsertPost = typeof postsTable.$inferInsert;
