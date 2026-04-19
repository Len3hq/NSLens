import { db, usersTable, notificationsTable } from "@workspace/db";
import { and, asc, eq, inArray } from "drizzle-orm";
import { sendDiscordDM } from "./discordBot";

const pumpLocks = new Map<string, Promise<{ sent: number; remaining: number }>>();

export const DISCORD_BATCH_SIZE = 3;

export async function enqueueDiscord(
  userId: string,
  notificationId: number,
  text: string,
): Promise<void> {
  await db
    .update(notificationsTable)
    .set({ discordText: text, discordQueued: true })
    .where(eq(notificationsTable.id, notificationId));
  await pumpDiscordQueue(userId);
}

export async function pumpDiscordQueue(userId: string): Promise<{ sent: number; remaining: number }> {
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
  if (!user?.discordDmChannelId) return { sent: 0, remaining: 0 };
  if (user.discordAwaitingMore) {
    const remaining = await countQueued(userId);
    return { sent: 0, remaining };
  }

  const peek = await db
    .select({ id: notificationsTable.id })
    .from(notificationsTable)
    .where(and(eq(notificationsTable.userId, userId), eq(notificationsTable.discordQueued, true)))
    .orderBy(asc(notificationsTable.createdAt))
    .limit(DISCORD_BATCH_SIZE + 1);
  if (peek.length === 0) return { sent: 0, remaining: 0 };

  const peekIds = peek.slice(0, DISCORD_BATCH_SIZE).map((p: { id: number }) => p.id);
  const claimed = await db
    .update(notificationsTable)
    .set({ discordQueued: false })
    .where(
      and(
        inArray(notificationsTable.id, peekIds),
        eq(notificationsTable.discordQueued, true),
      ),
    )
    .returning();
  claimed.sort((a: { id: number }, b: { id: number }) => peekIds.indexOf(a.id) - peekIds.indexOf(b.id));

  let sent = 0;
  for (const n of claimed) {
    const [fresh] = await db
      .select({ discordDmChannelId: usersTable.discordDmChannelId })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);
    if (!fresh?.discordDmChannelId) break;

    const text = n.discordText ?? `${n.title}\n${n.body}`;
    const ok = await sendDiscordDM(fresh.discordDmChannelId, text);
    if (ok) {
      await db
        .update(notificationsTable)
        .set({ discordSentAt: new Date() })
        .where(eq(notificationsTable.id, n.id));
      sent++;
    } else {
      await db
        .update(notificationsTable)
        .set({ discordQueued: true })
        .where(eq(notificationsTable.id, n.id));
    }
  }

  const remaining = peek.length > DISCORD_BATCH_SIZE ? await countQueued(userId) : 0;
  if (remaining > 0 && sent > 0) {
    const flipped = await db
      .update(usersTable)
      .set({ discordAwaitingMore: true })
      .where(and(eq(usersTable.id, userId), eq(usersTable.discordAwaitingMore, false)))
      .returning({ id: usersTable.id });
    if (flipped.length > 0) {
      const [u] = await db.select({ discordDmChannelId: usersTable.discordDmChannelId }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);
      if (u?.discordDmChannelId) {
        await sendDiscordDM(
          u.discordDmChannelId,
          `You have ${remaining} more update${remaining === 1 ? "" : "s"} waiting. Reply **yes** to see them, or **no** to skip.`,
        );
      }
    }
  }

  return { sent, remaining };
}

async function countQueued(userId: string): Promise<number> {
  const rows = await db
    .select({ id: notificationsTable.id })
    .from(notificationsTable)
    .where(and(eq(notificationsTable.userId, userId), eq(notificationsTable.discordQueued, true)));
  return rows.length;
}

export async function handleDiscordQueueReply(userId: string, text: string): Promise<boolean> {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  if (!user?.discordAwaitingMore) return false;

  const trimmed = text.trim().toLowerCase();
  const yes = /^(y|yes|sure|ok|okay|yep|please|continue|more|go)\b/.test(trimmed);
  const no = /^(n|no|stop|skip|later|nope|cancel)\b/.test(trimmed);
  if (!yes && !no) return false;

  await db
    .update(usersTable)
    .set({ discordAwaitingMore: false })
    .where(eq(usersTable.id, userId));

  if (no) {
    await db
      .update(notificationsTable)
      .set({ discordQueued: false })
      .where(and(eq(notificationsTable.userId, userId), eq(notificationsTable.discordQueued, true)));
    if (user.discordDmChannelId) {
      await sendDiscordDM(user.discordDmChannelId, "Got it — keeping things quiet. Open the app any time to catch up.");
    }
    return true;
  }

  await pumpDiscordQueue(userId);
  return true;
}
