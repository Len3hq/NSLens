import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { db, contactsTable, interactionsTable, notificationsTable, usersTable } from "@workspace/db";
import { and, desc, eq, isNull, lt, or, sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/dashboard", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  const days = user?.reminderDays ?? 21;
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [{ count: contactCount }] = await db
    .select({ count: sql<number>`cast(count(*) as integer)` })
    .from(contactsTable)
    .where(eq(contactsTable.userId, userId));

  const [{ count: interactionCount }] = await db
    .select({ count: sql<number>`cast(count(*) as integer)` })
    .from(interactionsTable)
    .where(eq(interactionsTable.userId, userId));

  const [{ count: staleCount }] = await db
    .select({ count: sql<number>`cast(count(*) as integer)` })
    .from(contactsTable)
    .where(
      and(
        eq(contactsTable.userId, userId),
        or(isNull(contactsTable.lastInteractionAt), lt(contactsTable.lastInteractionAt, cutoff)),
      ),
    );

  const [{ count: unreadNotificationCount }] = await db
    .select({ count: sql<number>`cast(count(*) as integer)` })
    .from(notificationsTable)
    .where(
      and(eq(notificationsTable.userId, userId), isNull(notificationsTable.readAt)),
    );

  const recentContacts = await db
    .select()
    .from(contactsTable)
    .where(eq(contactsTable.userId, userId))
    .orderBy(desc(contactsTable.createdAt))
    .limit(5);

  const recentInteractions = await db
    .select()
    .from(interactionsTable)
    .where(eq(interactionsTable.userId, userId))
    .orderBy(desc(interactionsTable.occurredAt))
    .limit(5);

  res.json({
    contactCount,
    interactionCount,
    staleCount,
    unreadNotificationCount,
    recentContacts,
    recentInteractions,
  });
});

export default router;
