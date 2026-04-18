import { pgTable, text, integer, timestamp, boolean, uniqueIndex } from "drizzle-orm/pg-core";

export const usersTable = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email"),
    name: text("name"),
    fullName: text("full_name"),
    username: text("username"),
    telegramUsername: text("telegram_username"),
    xUsername: text("x_username"),
    discordUsername: text("discord_username"),
    reminderDays: integer("reminder_days").notNull().default(21),
    telegramChatId: text("telegram_chat_id"),
    telegramLinkCode: text("telegram_link_code"),
    telegramLinkCodeExpiresAt: timestamp("telegram_link_code_expires_at", {
      withTimezone: true,
    }),
    // True when we've sent the user a "you have N more updates, reply YES"
    // message and are waiting on a reply before flushing more.
    telegramAwaitingMore: boolean("telegram_awaiting_more").notNull().default(false),
    // Random opaque token used to authorize the per-user iCal feed at
    // /api/calendar/<token>.ics so it works in Google/Apple/Outlook calendar
    // subscriptions without a real auth header.
    calendarFeedToken: text("calendar_feed_token"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("users_username_uidx").on(t.username)],
);

export type User = typeof usersTable.$inferSelect;
