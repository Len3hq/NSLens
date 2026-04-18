import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { db, contactsTable, notificationsTable, usersTable, followUpsTable } from "@workspace/db";
import { and, eq, isNull, or, lt, lte } from "drizzle-orm";
import { sendTelegramMessage } from "../lib/telegram";

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
    if (user?.telegramChatId) {
      sendTelegramMessage(
        user.telegramChatId,
        `🔔 ${n.title}\n${n.body}`,
      ).catch(() => {});
    }
  }
  // Also surface any due follow-ups as notifications.
  const dueFollowUps = await db
    .select({
      id: followUpsTable.id,
      contactId: followUpsTable.contactId,
      dueAt: followUpsTable.dueAt,
      note: followUpsTable.note,
      contactName: contactsTable.name,
    })
    .from(followUpsTable)
    .leftJoin(contactsTable, eq(contactsTable.id, followUpsTable.contactId))
    .where(
      and(
        eq(followUpsTable.userId, userId),
        isNull(followUpsTable.completedAt),
        lte(followUpsTable.dueAt, new Date()),
      ),
    );
  for (const f of dueFollowUps) {
    // Dedupe per follow-up (not per contact) so multiple due follow-ups for the
    // same contact each get a notification.
    const dedupeType = `followup_due:${f.id}`;
    const [existing] = await db
      .select()
      .from(notificationsTable)
      .where(
        and(eq(notificationsTable.userId, userId), eq(notificationsTable.type, dedupeType)),
      )
      .limit(1);
    if (existing) continue;
    const title = `Follow up with ${f.contactName ?? "contact"}`;
    const body = `Due ${f.dueAt.toISOString().slice(0, 10)}${f.note ? ` — ${f.note}` : ""}`;
    const [n] = await db
      .insert(notificationsTable)
      .values({
        userId,
        type: dedupeType,
        title,
        body,
        contactId: f.contactId,
      })
      .returning();
    created.push(n);
    flagged++;
    if (user?.telegramChatId) {
      sendTelegramMessage(user.telegramChatId, `📅 ${title}\n${body}`).catch(() => {});
    }
  }

  return { evaluated: stale.length + dueFollowUps.length, flagged, notifications: created };
}

router.post("/reminders/run", requireAuth, async (req, res) => {
  const result = await evaluateReminders(req.userId!);
  res.json(result);
});

export default router;
