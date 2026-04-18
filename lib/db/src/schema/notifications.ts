import { pgTable, text, serial, timestamp, integer, index } from "drizzle-orm/pg-core";

export const notificationsTable = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    contactId: integer("contact_id"),
    postId: integer("post_id"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("notifications_user_idx").on(t.userId)],
);

export type Notification = typeof notificationsTable.$inferSelect;
export type InsertNotification = typeof notificationsTable.$inferInsert;
