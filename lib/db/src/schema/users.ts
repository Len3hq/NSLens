import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email"),
  name: text("name"),
  reminderDays: integer("reminder_days").notNull().default(21),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof usersTable.$inferSelect;
