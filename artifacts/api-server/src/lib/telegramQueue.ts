import { db, usersTable, notificationsTable } from "@workspace/db";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { sendTelegramMessage } from "./telegram";

// In-process pump locks so two concurrent enqueue calls (e.g. from a
// Promise.all fan-out) can't both pull the same queued rows and double-send.
const pumpLocks = new Map<string, Promise<{ sent: number; remaining: number }>>();

// Cap how many Telegram messages we ever push to a user without them asking
// for more, so a chatty Hub or a backlog never floods their phone.
export const TELEGRAM_BATCH_SIZE = 3;

/**
 * Mark a notification as a Telegram-eligible delivery and try to flush the
 * user's queue right away. If the queue already has items waiting on the
 * user's "yes" reply, the new one just stacks behind.
 */
export async function enqueueTelegram(
  userId: string,
  notificationId: number,
  shortText: string,
): Promise<void> {
  await db
    .update(notificationsTable)
    .set({ telegramText: shortText, telegramQueued: true })
    .where(eq(notificationsTable.id, notificationId));
  await pumpTelegramQueue(userId);
}

/**
 * Send up to TELEGRAM_BATCH_SIZE queued messages to this user. If any remain
 * afterwards, send a single conversational prompt and pause the queue until
 * the user replies (handled in the telegram webhook).
 *
 * Idempotent and safe to call from many code paths; if the user is currently
 * awaiting a reply we won't push more.
 */
export async function pumpTelegramQueue(userId: string): Promise<{ sent: number; remaining: number }> {
  // Serialize per-user pumps so concurrent enqueue calls can't double-send.
  const existing = pumpLocks.get(userId);
  if (existing) return existing;
  const run = (async () => {
    try {
      return await pumpInner(userId);
    } finally {
      pumpLocks.delete(userId);
    }
  })();
  pumpLocks.set(userId, run);
  return run;
}

async function pumpInner(userId: string): Promise<{ sent: number; remaining: number }> {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  if (!user?.telegramChatId) return { sent: 0, remaining: 0 };
  if (user.telegramAwaitingMore) {
    const remaining = await countQueued(userId);
    return { sent: 0, remaining };
  }

  // Peek the next batch (+1 to detect overflow).
  const peek = await db
    .select({ id: notificationsTable.id })
    .from(notificationsTable)
    .where(and(eq(notificationsTable.userId, userId), eq(notificationsTable.telegramQueued, true)))
    .orderBy(asc(notificationsTable.createdAt))
    .limit(TELEGRAM_BATCH_SIZE + 1);
  if (peek.length === 0) return { sent: 0, remaining: 0 };

  const peekIds = peek.slice(0, TELEGRAM_BATCH_SIZE).map((p) => p.id);

  // Atomically claim the rows: only ones still queued become ours. Any other
  // pump that lost the race will get an empty claimed[] for these ids.
  const claimed = await db
    .update(notificationsTable)
    .set({ telegramQueued: false })
    .where(
      and(
        inArray(notificationsTable.id, peekIds),
        eq(notificationsTable.telegramQueued, true),
      ),
    )
    .returning();
  // Preserve original send order.
  claimed.sort((a, b) => peekIds.indexOf(a.id) - peekIds.indexOf(b.id));

  let sent = 0;
  for (const n of claimed) {
    // Re-check the chat link before every send: an unlink or account delete
    // may have happened between when we loaded `user` and now. Without this
    // check we'd keep flushing notifications to a chat the user just
    // disconnected.
    const [fresh] = await db
      .select({ telegramChatId: usersTable.telegramChatId })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);
    if (!fresh?.telegramChatId) {
      // Bail out: stop sending to this (now-disconnected) chat. The remaining
      // claimed rows are not re-queued because the user no longer wants them.
      break;
    }
    const text = n.telegramText ?? `${n.title}\n${n.body}`;
    const ok = await sendTelegramMessage(fresh.telegramChatId, text);
    if (ok) {
      await db
        .update(notificationsTable)
        .set({ telegramSentAt: new Date() })
        .where(eq(notificationsTable.id, n.id));
      sent++;
    } else {
      // Re-queue so we retry on the next pump rather than silently dropping.
      await db
        .update(notificationsTable)
        .set({ telegramQueued: true })
        .where(eq(notificationsTable.id, n.id));
    }
  }

  const remaining = peek.length > TELEGRAM_BATCH_SIZE ? await countQueued(userId) : 0;
  if (remaining > 0 && sent > 0) {
    // Atomically set telegramAwaitingMore only if it's still false; the
    // "matched count" tells us if we actually flipped it, so only one pump
    // sends the conversational follow-up.
    const flipped = await db
      .update(usersTable)
      .set({ telegramAwaitingMore: true })
      .where(and(eq(usersTable.id, userId), eq(usersTable.telegramAwaitingMore, false)))
      .returning({ id: usersTable.id });
    if (flipped.length > 0) {
      await sendTelegramMessage(
        user.telegramChatId,
        `You have ${remaining} more update${remaining === 1 ? "" : "s"} waiting. Reply YES to see them, or NO to skip.`,
      );
    }
  }

  return { sent, remaining };
}

async function countQueued(userId: string): Promise<number> {
  const rows = await db
    .select({ id: notificationsTable.id })
    .from(notificationsTable)
    .where(and(eq(notificationsTable.userId, userId), eq(notificationsTable.telegramQueued, true)));
  return rows.length;
}

/**
 * The user has answered the "want more updates?" prompt. YES → flush another
 * batch of 3. NO → drop the queue entirely so they aren't pestered later.
 * Returns true if the input was an answer to the prompt.
 */
export async function handleTelegramQueueReply(userId: string, text: string): Promise<boolean> {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  if (!user?.telegramAwaitingMore) return false;

  const trimmed = text.trim().toLowerCase();
  const yes = /^(y|yes|sure|ok|okay|yep|please|continue|more|go|si|sí)\b/.test(trimmed);
  const no = /^(n|no|stop|skip|later|nope|cancel)\b/.test(trimmed);
  if (!yes && !no) return false;

  await db
    .update(usersTable)
    .set({ telegramAwaitingMore: false })
    .where(eq(usersTable.id, userId));

  if (no) {
    // Clear the queue so the user really gets quiet.
    await db
      .update(notificationsTable)
      .set({ telegramQueued: false })
      .where(and(eq(notificationsTable.userId, userId), eq(notificationsTable.telegramQueued, true)));
    if (user.telegramChatId) {
      await sendTelegramMessage(user.telegramChatId, "Got it — I'll keep things quiet here. Open the app any time to catch up.");
    }
    return true;
  }

  // yes → flush another batch
  await pumpTelegramQueue(userId);
  return true;
}
