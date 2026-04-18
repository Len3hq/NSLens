import { pgTable, text, serial, integer, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { contactsTable } from "./contacts";

export const friendshipsTable = pgTable(
  "friendships",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    friendUserId: text("friend_user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    // Optional pointer to the matching contact in this user's CRM. Adding a
    // friend automatically creates a contact if one doesn't exist; this links
    // the two so deletes / updates can keep them in sync. If the contact gets
    // deleted independently, the friendship survives — just unlinked.
    contactId: integer("contact_id").references(() => contactsTable.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("friendships_pair_uidx").on(t.userId, t.friendUserId),
    index("friendships_user_idx").on(t.userId),
  ],
);

export type Friendship = typeof friendshipsTable.$inferSelect;
export type InsertFriendship = typeof friendshipsTable.$inferInsert;
