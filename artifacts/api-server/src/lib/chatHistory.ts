import { db, chatHistoryTable } from "@workspace/db";
import { and, desc, eq, lte } from "drizzle-orm";

export type ChatSource = "web" | "telegram" | "discord";
export type HistoryMessage = { role: "user" | "assistant"; content: string };

// Load the most recent `limit` messages for a user, oldest-first so they can
// be passed directly as the `messages` array in an OpenAI chat completion.
export async function loadHistory(userId: string, limit = 10): Promise<HistoryMessage[]> {
  const rows = await db
    .select({ role: chatHistoryTable.role, content: chatHistoryTable.content })
    .from(chatHistoryTable)
    .where(eq(chatHistoryTable.userId, userId))
    .orderBy(desc(chatHistoryTable.createdAt))
    .limit(limit);
  return rows.reverse().map((r: { role: string; content: string }) => ({
    role: r.role as "user" | "assistant",
    content: r.content,
  }));
}

// Append one exchange (user message + assistant reply) atomically.
export async function appendHistory(
  userId: string,
  userMessage: string,
  assistantReply: string,
  source: ChatSource = "web",
): Promise<void> {
  await db.insert(chatHistoryTable).values([
    { userId, role: "user", content: userMessage, source },
    { userId, role: "assistant", content: assistantReply, source },
  ]);
  // Keep the table lean: trim to the latest 100 messages per user.
  pruneHistory(userId, 100).catch(() => {});
}

async function pruneHistory(userId: string, keep: number): Promise<void> {
  const rows = await db
    .select({ id: chatHistoryTable.id })
    .from(chatHistoryTable)
    .where(eq(chatHistoryTable.userId, userId))
    .orderBy(desc(chatHistoryTable.createdAt))
    .limit(keep + 1);
  if (rows.length <= keep) return;
  const cutoffId = rows[keep]?.id;
  if (cutoffId !== undefined) {
    await db
      .delete(chatHistoryTable)
      .where(and(eq(chatHistoryTable.userId, userId), lte(chatHistoryTable.id, cutoffId)));
  }
}
