import { pgTable, serial, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { contactsTable } from "./contacts";

export const followUpsTable = pgTable(
  "follow_ups",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    contactId: integer("contact_id")
      .notNull()
      .references(() => contactsTable.id, { onDelete: "cascade" }),
    dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
    note: text("note"),
    source: text("source").notNull().default("manual"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("follow_ups_user_due_idx").on(t.userId, t.dueAt),
    index("follow_ups_contact_idx").on(t.contactId),
  ],
);

export type FollowUp = typeof followUpsTable.$inferSelect;
export type InsertFollowUp = typeof followUpsTable.$inferInsert;
