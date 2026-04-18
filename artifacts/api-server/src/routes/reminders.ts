import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { db, contactsTable, notificationsTable, usersTable } from "@workspace/db";
import { and, eq, isNull, or, lt } from "drizzle-orm";

const router: IRouter = Router();

export async function evaluateReminders(userId: string) {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  const days = user?.reminderDays ?? 21;
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const stale = await db
    .select()
    .from(contactsTable)
    .where(
      and(
        eq(contactsTable.userId, userId),
        or(isNull(contactsTable.lastInteractionAt), lt(contactsTable.lastInteractionAt, cutoff)),
      ),
    );
  let flagged = 0;
  const created: typeof notificationsTable.$inferSelect[] = [];
  for (const c of stale) {
    // Only insert if no unread reminder for this contact already
    const [existing] = await db
      .select()
      .from(notificationsTable)
      .where(
        and(
          eq(notificationsTable.userId, userId),
          eq(notificationsTable.contactId, c.id),
          eq(notificationsTable.type, "stale_contact"),
          isNull(notificationsTable.readAt),
        ),
      )
      .limit(1);
    if (existing) continue;
    const [n] = await db
      .insert(notificationsTable)
      .values({
        userId,
        type: "stale_contact",
        title: `Reach out to ${c.name}`,
        body: `It's been a while. Last contact: ${c.lastInteractionAt?.toISOString().slice(0, 10) ?? "never"}.${c.project ? ` (Project: ${c.project})` : ""}`,
        contactId: c.id,
      })
      .returning();
    created.push(n);
    flagged++;
  }
  return { evaluated: stale.length, flagged, notifications: created };
}

router.post("/reminders/run", requireAuth, async (req, res) => {
  const result = await evaluateReminders(req.userId!);
  res.json(result);
});

export default router;
