import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { db, postsTable, usersTable, contactsTable, notificationsTable } from "@workspace/db";
import { desc, eq, ne, ilike, or, sql, and } from "drizzle-orm";
import { openai, CHAT_MODEL } from "../lib/openai";

const router: IRouter = Router();

router.get("/hub", requireAuth, async (_req, res) => {
  const rows = await db
    .select({
      id: postsTable.id,
      authorId: postsTable.authorId,
      content: postsTable.content,
      createdAt: postsTable.createdAt,
      authorName: usersTable.name,
      authorEmail: usersTable.email,
    })
    .from(postsTable)
    .leftJoin(usersTable, eq(usersTable.id, postsTable.authorId))
    .orderBy(desc(postsTable.createdAt))
    .limit(100);
  res.json(
    rows.map((r) => ({
      id: r.id,
      authorId: r.authorId,
      content: r.content,
      createdAt: r.createdAt,
      authorName: r.authorName ?? r.authorEmail ?? "Anonymous",
    })),
  );
});

const RELEVANCE_PROMPT = `You decide whether a public post from one founder is relevant to another founder based on that founder's contacts.
Reply with strict JSON: { "relevant": true|false, "reason": "..." }. Be strict — only true if the post clearly aligns with someone in the contacts (similar project, complementary need, shared topic).`;

export async function fanOutPost(post: { id: number; authorId: string; content: string; authorName: string }) {
  // For every other user, check their contacts for relevance
  const others = await db
    .select()
    .from(usersTable)
    .where(ne(usersTable.id, post.authorId));
  // Run per-user evaluations in parallel (capped) to avoid head-of-line blocking.
  await Promise.all(others.map(async (u) => {
    // Find at most a few candidate contacts via simple keyword overlap
    const keywords = post.content
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length > 4)
      .slice(0, 8);
    if (!keywords.length) return;
    const conds = keywords.flatMap((k) => [
      ilike(contactsTable.project, `%${k}%`),
      ilike(contactsTable.context, `%${k}%`),
      ilike(contactsTable.company, `%${k}%`),
      sql`array_to_string(${contactsTable.tags}, ' ') ILIKE ${`%${k}%`}`,
    ]);
    const candidates = await db
      .select()
      .from(contactsTable)
      .where(and(eq(contactsTable.userId, u.id), or(...conds)))
      .limit(5);
    if (!candidates.length) return;
    const contactSummary = candidates
      .map(
        (c) =>
          `- ${c.name}${c.project ? ` (project: ${c.project})` : ""}${c.company ? ` @ ${c.company}` : ""}${c.context ? ` — ${c.context}` : ""}`,
      )
      .join("\n");
    let relevant = false;
    let reason = "";
    try {
      const completion = await openai.chat.completions.create({
        model: CHAT_MODEL,
        messages: [
          { role: "system", content: RELEVANCE_PROMPT },
          {
            role: "user",
            content: `POST by ${post.authorName}:\n${post.content}\n\nMY CONTACTS:\n${contactSummary}`,
          },
        ],
        response_format: { type: "json_object" },
      });
      const parsed = JSON.parse(completion.choices[0]?.message?.content ?? "{}");
      relevant = !!parsed.relevant;
      reason = parsed.reason ?? "";
    } catch {
      // fall through
    }
    if (relevant) {
      await db.insert(notificationsTable).values({
        userId: u.id,
        type: "hub_match",
        title: `New post matches your network: "${post.content.slice(0, 60)}${post.content.length > 60 ? "…" : ""}"`,
        body: `${reason || "This post might be relevant to people in your network."}\nMatched contacts: ${candidates.map((c) => c.name).join(", ")}`,
        postId: post.id,
      });
    }
  }));
}

router.post("/hub", requireAuth, async (req, res) => {
  const { content } = req.body ?? {};
  if (!content || typeof content !== "string" || !content.trim()) {
    res.status(400).json({ error: "content is required" });
    return;
  }
  const [post] = await db
    .insert(postsTable)
    .values({ authorId: req.userId!, content: content.trim() })
    .returning();
  const [author] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.userId!))
    .limit(1);
  // Fire-and-forget fan-out
  fanOutPost({
    id: post.id,
    authorId: post.authorId,
    content: post.content,
    authorName: author?.name ?? author?.email ?? "Someone",
  }).catch((err) => {
    req.log?.error({ err }, "fan-out failed");
  });
  res.status(201).json({
    id: post.id,
    authorId: post.authorId,
    authorName: author?.name ?? author?.email ?? "You",
    content: post.content,
    createdAt: post.createdAt,
  });
});

export default router;
