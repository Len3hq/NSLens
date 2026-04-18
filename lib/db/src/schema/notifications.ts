import { pgTable, text, serial, timestamp, integer, index, boolean } from "drizzle-orm/pg-core";

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
    // Short, ready-to-send Telegram body (with link). Set when this notification
    // should also be sent over Telegram. The pump function flushes these in
    // batches of 3 so users aren't overwhelmed.
    telegramText: text("telegram_text"),
    telegramQueued: boolean("telegram_queued").notNull().default(false),
    telegramSentAt: timestamp("telegram_sent_at", { withTimezone: true }),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("notifications_user_idx").on(t.userId),
    index("notifications_telegram_queue_idx").on(t.userId, t.telegramQueued),
  ],
);

export type Notification = typeof notificationsTable.$inferSelect;
export type InsertNotification = typeof notificationsTable.$inferInsert;
