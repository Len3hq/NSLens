import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import {
  db,
  postsTable,
  usersTable,
  contactsTable,
  notificationsTable,
  type PostAttachment,
} from "@workspace/db";
import { desc, eq, ne } from "drizzle-orm";
import { openai, CHAT_MODEL } from "../lib/openai";
import { enqueueTelegram } from "../lib/telegramQueue";
import { embedText, similarContacts } from "../lib/embeddings";

const router: IRouter = Router();

// ---------- Public read ----------

// Public, unauthenticated read of a single post — used by Telegram fan-out
// deep links so recipients can preview the post without logging in.
router.get("/hub/public/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "bad id" });
    return;
  }
  const [row] = await db
    .select({
      id: postsTable.id,
      authorId: postsTable.authorId,
      content: postsTable.content,
      attachments: postsTable.attachments,
      createdAt: postsTable.createdAt,
      authorName: usersTable.name,
      authorEmail: usersTable.email,
    })
    .from(postsTable)
    .leftJoin(usersTable, eq(usersTable.id, postsTable.authorId))
    .where(eq(postsTable.id, id))
    .limit(1);
  if (!row) {
    res.status(404).json({ error: "not found" });
    return;
  }
  res.json({
    id: row.id,
    authorId: row.authorId,
    content: row.content,
    attachments: row.attachments ?? [],
    createdAt: row.createdAt,
    authorName: row.authorName ?? row.authorEmail ?? "Anonymous",
  });
});

router.get("/hub", requireAuth, async (_req, res) => {
  const rows = await db
    .select({
      id: postsTable.id,
      authorId: postsTable.authorId,
      content: postsTable.content,
      attachments: postsTable.attachments,
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
      attachments: r.attachments ?? [],
      createdAt: r.createdAt,
      authorName: r.authorName ?? r.authorEmail ?? "Anonymous",
    })),
  );
});

// ---------- Attachment enrichment ----------

function publicObjectUrl(objectPath: string): string {
  // Build an absolute URL the GPT vision endpoint can fetch from.
  const base =
    process.env.PUBLIC_API_URL ||
    (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "") ||
    `http://localhost:${process.env.PORT ?? "8080"}`;
  return `${base.replace(/\/+$/, "")}/api/storage${objectPath}`;
}

// Block SSRF: only allow http(s), reject obvious internal hosts. We don't do
// DNS resolution here (cheap heuristic), but we do block the most common
// targets: localhost, *.internal, link-local 169.254.*, and the RFC1918 ranges.
function isSafePublicUrl(raw: string): boolean {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return false;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return false;
  const host = u.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host === "0.0.0.0" ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host === "metadata.google.internal" ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    /^169\.254\./.test(host) ||
    host === "::1" ||
    host.startsWith("fc") ||
    host.startsWith("fd") ||
    host.startsWith("fe80")
  ) {
    return false;
  }
  return true;
}

async function describeImage(imageUrl: string, caption?: string): Promise<string> {
  try {
    const completion = await openai.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You describe images that a founder posted to share progress. Respond with 1–3 short sentences focused on what the image shows, the product/topic/industry, and any visible text — no fluff.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: caption ? `Caption: ${caption}` : "Describe this image." },
            { type: "image_url", image_url: { url: imageUrl } },
          ] as never,
        },
      ],
    });
    return completion.choices[0]?.message?.content?.trim() ?? "";
  } catch (err) {
    console.error("describeImage failed", err);
    return "";
  }
}

async function fetchLinkPreview(url: string): Promise<{
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
}> {
  if (!isSafePublicUrl(url)) {
    console.warn("fetchLinkPreview: refused unsafe url", { url });
    return {};
  }
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    const r = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: { "User-Agent": "NetworkBrainBot/1.0 (+https://replit.com)" },
    });
    clearTimeout(timer);
    if (!r.ok) return {};
    // After redirects the final URL must also be safe.
    if (!isSafePublicUrl(r.url)) return {};
    const html = (await r.text()).slice(0, 200_000);
    const pick = (re: RegExp) => html.match(re)?.[1]?.trim();
    return {
      ogTitle:
        pick(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i) ??
        pick(/<title[^>]*>([^<]+)<\/title>/i),
      ogDescription:
        pick(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i) ??
        pick(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i),
      ogImage: pick(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i),
    };
  } catch (err) {
    console.error("fetchLinkPreview failed", { url, err });
    return {};
  }
}

export async function enrichAttachments(
  attachments: PostAttachment[],
): Promise<PostAttachment[]> {
  return Promise.all(
    attachments.map(async (a) => {
      if (a.type === "image" && a.objectPath && !a.aiDescription) {
        const desc = await describeImage(publicObjectUrl(a.objectPath), a.caption);
        return { ...a, aiDescription: desc || undefined };
      }
      if (a.type === "link" && a.url && !a.ogTitle) {
        const og = await fetchLinkPreview(a.url);
        return { ...a, ...og };
      }
      return a;
    }),
  );
}

export function buildSearchableText(
  content: string,
  attachments: PostAttachment[],
): string {
  const parts: string[] = [content];
  for (const a of attachments) {
    if (a.caption) parts.push(`Caption: ${a.caption}`);
    if (a.aiDescription) parts.push(`Image shows: ${a.aiDescription}`);
    if (a.ogTitle) parts.push(`Link title: ${a.ogTitle}`);
    if (a.ogDescription) parts.push(`Link description: ${a.ogDescription}`);
    if (a.url) parts.push(`URL: ${a.url}`);
    if (a.type === "video") parts.push("(includes a video attachment)");
  }
  return parts.filter(Boolean).join("\n");
}

// ---------- Fan-out ----------

const RELEVANCE_PROMPT = `You decide whether a public post from one founder is relevant to specific contacts in another founder's network. Consider both the post content and any image/link descriptions.
Reply with strict JSON: { "relevant": true|false, "reason": "...", "matchedNames": ["Name", ...] }. Only true if the post clearly aligns with one or more contacts (similar project, complementary need, shared topic). Keep "reason" to one sentence written directly to the recipient (the network owner), e.g. "Sara at Anthropic is building agents — this RAG demo could be useful to her."`;

function publicAppUrl(path: string): string {
  const base =
    process.env.PUBLIC_APP_URL ||
    process.env.PUBLIC_API_URL ||
    (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "") ||
    "http://localhost:5000";
  return `${base.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function fanOutPost(post: {
  id: number;
  authorId: string;
  authorName: string;
  searchableText: string;
  preview: string;
}) {
  const queryEmbedding = await embedText(post.searchableText);
  if (!queryEmbedding) {
    console.error("fanOutPost: failed to embed post; skipping fan-out", { postId: post.id });
    return;
  }
  const others = await db
    .select()
    .from(usersTable)
    .where(ne(usersTable.id, post.authorId));

  // Score every recipient first; we'll pick the top N for Telegram afterwards
  // so a single fan-out can never blast more than MAX_TELEGRAM_FANOUT DMs.
  type Match = {
    user: (typeof others)[number];
    notificationId: number;
    reason: string;
    score: number;
  };
  const matches: Match[] = [];

  await Promise.all(
    others.map(async (u) => {
      const candidates = await similarContacts(u.id, queryEmbedding, 6);
      const filtered = candidates.filter((c) => (c.similarity ?? 0) >= 0.2);
      if (!filtered.length) return;

      const contactSummary = filtered
        .map(
          (c) =>
            `- ${c.name}${c.project ? ` (project: ${c.project})` : ""}${c.company ? ` @ ${c.company}` : ""}${c.context ? ` — ${c.context}` : ""} [sim ${(c.similarity ?? 0).toFixed(2)}]`,
        )
        .join("\n");

      let relevant = false;
      let reason = "";
      let matchedNames: string[] = [];
      try {
        const completion = await openai.chat.completions.create({
          model: CHAT_MODEL,
          messages: [
            { role: "system", content: RELEVANCE_PROMPT },
            {
              role: "user",
              content: `POST by ${post.authorName}:\n${post.searchableText}\n\nMY NETWORK (top semantic matches):\n${contactSummary}`,
            },
          ],
          response_format: { type: "json_object" },
        });
        const parsed = JSON.parse(completion.choices[0]?.message?.content ?? "{}");
        relevant = !!parsed.relevant;
        reason = parsed.reason ?? "";
        matchedNames = Array.isArray(parsed.matchedNames) ? parsed.matchedNames : [];
      } catch (err) {
        console.error("fanOutPost relevance call failed", { userId: u.id, postId: post.id, err });
        return;
      }
      if (!relevant) return;

      const matched = matchedNames.length
        ? matchedNames
        : filtered.slice(0, 3).map((c) => c.name);
      const title = `New post matches your network: "${post.preview}"`;
      const body = `${reason || "This might be relevant to people you know."}\nMatched contacts: ${matched.join(", ")}`;

      // Always create the in-app notification — that's not noisy.
      const [notif] = await db
        .insert(notificationsTable)
        .values({
          userId: u.id,
          type: "hub_match",
          title,
          body,
          postId: post.id,
        })
        .returning();

      matches.push({
        user: u,
        notificationId: notif.id,
        reason: reason || `${post.authorName} posted something that matches your network.`,
        score: filtered[0]?.similarity ?? 0,
      });
    }),
  );

  // Queue a SHORT Telegram message for every linked recipient — the queue
  // itself enforces the 3-at-a-time cap and the "want more?" follow-up.
  // The /hub/p/:id route is public so recipients can read without logging in.
  const postUrl = publicAppUrl(`/hub/p/${post.id}`);
  await Promise.all(
    matches
      .filter((m) => m.user.telegramChatId)
      .sort((a, b) => b.score - a.score)
      .map((m) => {
        const oneLine = m.reason.replace(/\s+/g, " ").trim().slice(0, 140);
        const text = `🤝 ${oneLine}\n${postUrl}`;
        return enqueueTelegram(m.user.id, m.notificationId, text).catch(() => {});
      }),
  );
}

// ---------- Create post ----------

export async function createHubPost(
  authorId: string,
  rawContent: string,
  rawAttachments: PostAttachment[] = [],
) {
  const content = (rawContent ?? "").trim();
  // Normalize incoming attachments — drop unknown shapes.
  const attachments: PostAttachment[] = (rawAttachments ?? []).filter(
    (a) =>
      a &&
      typeof a === "object" &&
      ["image", "video", "link", "file"].includes(a.type),
  );
  if (!content && !attachments.length) {
    throw new Error("post must include content or at least one attachment");
  }

  // Insert immediately so the user gets a fast response. Enrichment + fan-out
  // run in the background — the post row is updated in place when ready.
  const [post] = await db
    .insert(postsTable)
    .values({
      authorId,
      content,
      attachments,
      searchableText: buildSearchableText(content, attachments),
    })
    .returning();
  const [author] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, authorId))
    .limit(1);
  const authorName = author?.name ?? author?.email ?? "Someone";

  // Fire-and-forget: enrich attachments, persist, then fan out.
  (async () => {
    let finalAttachments = attachments;
    try {
      finalAttachments = await enrichAttachments(attachments);
      const searchableText = buildSearchableText(content, finalAttachments);
      await db
        .update(postsTable)
        .set({ attachments: finalAttachments, searchableText })
        .where(eq(postsTable.id, post.id));
      const preview =
        (content || finalAttachments[0]?.aiDescription || finalAttachments[0]?.ogTitle || "(media post)").slice(
          0,
          60,
        ) + ((content || "").length > 60 ? "…" : "");
      await fanOutPost({
        id: post.id,
        authorId,
        authorName,
        searchableText,
        preview,
      });
    } catch (err) {
      console.error("post enrichment / fan-out failed", { postId: post.id, err });
    }
  })();

  return {
    id: post.id,
    authorId: post.authorId,
    authorName,
    content: post.content,
    attachments: post.attachments,
    createdAt: post.createdAt,
  };
}

router.post("/hub", requireAuth, async (req, res) => {
  const { content, attachments } = req.body ?? {};
  if (typeof content !== "string" && !Array.isArray(attachments)) {
    res.status(400).json({ error: "content or attachments is required" });
    return;
  }
  try {
    const created = await createHubPost(req.userId!, content ?? "", attachments ?? []);
    res.status(201).json(created);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

export default router;
