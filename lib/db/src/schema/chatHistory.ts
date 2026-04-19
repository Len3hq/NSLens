import { pgTable, text, serial, timestamp, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const chatHistoryTable = pgTable(
  "chat_history",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    role: text("role").notNull(), // "user" | "assistant"
    content: text("content").notNull(),
    // Which surface this message came from. History is shared across surfaces
    // so the same user on Telegram and Discord see a consistent conversation.
    source: text("source").notNull().default("web"), // "web" | "telegram" | "discord"
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("chat_history_user_created_idx").on(t.userId, t.createdAt)],
);

export type ChatHistoryEntry = typeof chatHistoryTable.$inferSelect;
