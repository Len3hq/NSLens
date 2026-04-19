import { pgTable, text, serial, timestamp, integer, index, boolean } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { contactsTable } from "./contacts";
import { postsTable } from "./posts";

export const notificationsTable = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    // If the referenced contact / post is deleted we just null out the link;
    // the notification itself can stay readable in the user's history.
    contactId: integer("contact_id").references(() => contactsTable.id, {
      onDelete: "set null",
    }),
    postId: integer("post_id").references(() => postsTable.id, {
      onDelete: "set null",
    }),
    // Short, ready-to-send Telegram body (with link). Set when this notification
    // should also be sent over Telegram. The pump function flushes these in
    // batches of 3 so users aren't overwhelmed.
    telegramText: text("telegram_text"),
    telegramQueued: boolean("telegram_queued").notNull().default(false),
    telegramSentAt: timestamp("telegram_sent_at", { withTimezone: true }),
    discordText: text("discord_text"),
    discordQueued: boolean("discord_queued").notNull().default(false),
    discordSentAt: timestamp("discord_sent_at", { withTimezone: true }),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("notifications_user_idx").on(t.userId),
    index("notifications_telegram_queue_idx").on(t.userId, t.telegramQueued),
    index("notifications_discord_queue_idx").on(t.userId, t.discordQueued),
  ],
);

export type Notification = typeof notificationsTable.$inferSelect;
export type InsertNotification = typeof notificationsTable.$inferInsert;
