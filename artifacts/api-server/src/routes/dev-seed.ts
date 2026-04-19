import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import {
  db,
  contactsTable,
  interactionsTable,
  notificationsTable,
  postsTable,
  usersTable,
  type PostAttachment,
} from "@workspace/db";
import { and, eq, inArray, like } from "drizzle-orm";
import { createHubPost } from "./hub";
import { evaluateReminders } from "./reminders";
import { backfillEmbeddings } from "../lib/embeddings";
import { ObjectStorageService } from "../lib/objectStorage";
import { downloadFromUrl } from "../lib/telegram";

const router: IRouter = Router();

// Synthetic peer users (id prefix used so we can easily wipe them).
const PEER_PREFIX = "seed_peer_";

// Each post can have an attachments[] alongside the text body. Image entries
// reference public sources that we'll download once and re-upload to our own
// object storage during seeding. Link entries are scraped for og metadata.
type SeedPost = {
  content: string;
  attachments?: Array<
    | { kind: "image"; sourceUrl: string; mimeType?: string; caption?: string }
    | { kind: "video"; sourceUrl: string; mimeType?: string; caption?: string }
    | { kind: "link"; url: string }
  >;
};

const PEERS: Array<{
  id: string;
  name: string;
  email: string;
  contacts: Array<{ name: string; project: string; company: string; context: string; tags: string[] }>;
  posts: SeedPost[];
}> = [
  {
    id: `${PEER_PREFIX}aria`,
    name: "Aria Chen",
    email: "aria@seed.dev",
    contacts: [
      { name: "Marcus Liu", project: "vector database for embeddings", company: "Pinecone alum", context: "Building open-source pgvector alternative", tags: ["infra", "ai", "founder"] },
      { name: "Sofia Reyes", project: "AI-native CRM", company: "Stealth", context: "Looking for design partners in B2B SaaS", tags: ["crm", "ai", "founder"] },
      { name: "Ethan Park", project: "developer tools agency", company: "Park Labs", context: "Helps YC startups ship MVPs", tags: ["devtools", "agency"] },
    ],
    posts: [
      {
        content:
          "Looking for a CTO with infra experience to join my pre-seed. Building agentic memory systems for sales teams. DM me.",
        attachments: [
          { kind: "link", url: "https://www.ycombinator.com/library/4A-how-to-find-a-cofounder" },
        ],
      },
      {
        content: "Sneak peek of our memory graph UI. Curious how this lands with infra founders 👇",
        attachments: [
          {
            kind: "image",
            sourceUrl:
              "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&q=80&fm=jpg",
            mimeType: "image/jpeg",
            caption: "Dashboard showing connected entities and recent activity",
          },
        ],
      },
    ],
  },
  {
    id: `${PEER_PREFIX}david`,
    name: "David Okafor",
    email: "david@seed.dev",
    contacts: [
      { name: "Priya Shah", project: "RAG-based legal research", company: "Casetext alum", context: "Wants to chat about chunking strategies", tags: ["ai", "legal"] },
      { name: "Tomás Alvarez", project: "developer tools for AI agents", company: "Independent", context: "Open-source contributor, looking for cofounders", tags: ["devtools", "ai", "open-source"] },
    ],
    posts: [
      {
        content:
          "Anyone here built evals for an LLM router? We're seeing weird drift on classification accuracy and could use a second pair of eyes.",
        attachments: [
          { kind: "link", url: "https://github.com/openai/evals" },
        ],
      },
      {
        content:
          "Reading list this week — chunking strategies for long-doc RAG. Recommendations welcome.",
        attachments: [
          { kind: "link", url: "https://www.pinecone.io/learn/chunking-strategies/" },
          { kind: "link", url: "https://arxiv.org/abs/2312.10997" },
        ],
      },
    ],
  },
];

// Realistic contact set for the active user.
const USER_CONTACTS = [
  {
    name: "Lena Park",
    project: "AI-powered relationship CRM",
    company: "Stealth",
    context: "Met at SF Tech Week. Building memory layer for founders. Strong infra background.",
    tags: ["ai", "crm", "founder", "sf"],
    daysAgo: 3,
    note: "Coffee at Sightglass. She's hiring a founding engineer who loves Postgres + LLMs.",
  },
  {
    name: "Jordan Mehta",
    project: "developer tools for LLM evals",
    company: "OpenEval",
    context: "Y Combinator W26. Wants intros to AI infra founders.",
    tags: ["devtools", "ai", "yc", "founder"],
    daysAgo: 8,
    note: "Demo'd OpenEval. Fast eval harness for prompt regressions. Could plug into a CI pipeline.",
  },
  {
    name: "Naomi Singh",
    project: "vector search at scale",
    company: "Pinecone",
    context: "PMM. Met at AI Engineer Summit panel.",
    tags: ["ai", "infra", "marketing"],
    daysAgo: 14,
    note: "Walked the floor together. Will intro me to two of their early customers.",
  },
  {
    name: "Hugo Bernard",
    project: "design partner for B2B SaaS",
    company: "Lattice (alum)",
    context: "Now consulting solo, helps founders find first 10 customers.",
    tags: ["sales", "consulting", "design-partner"],
    daysAgo: 22,
    note: "Slack DM. Said he'd review my outbound sequence next week.",
  },
  {
    name: "Priya Shah",
    project: "RAG for legal research",
    company: "Casetext (alum)",
    context: "Going deep on chunking + reranking for long documents.",
    tags: ["ai", "rag", "legal"],
    daysAgo: 35,
    note: "Coffee chat. Recommended hybrid search (BM25 + cosine) over pure vector.",
  },
  {
    name: "Marcus Liu",
    project: "open-source pgvector tools",
    company: "Independent",
    context: "Solo founder. Building a managed pgvector with a Supabase-style DX.",
    tags: ["infra", "ai", "open-source", "founder"],
    daysAgo: 5,
    note: "Twitter DM. Sent me a private repo to play with.",
  },
  {
    name: "Sofia Reyes",
    project: "AI-native CRM",
    company: "Stealth",
    context: "Looking for design partners. Explicitly wants founders building dev tools.",
    tags: ["ai", "crm", "founder", "design-partner"],
    daysAgo: 18,
    note: "Intro from a mutual. Quick Zoom — wants to see early traction stats.",
  },
  // Stale ones (>21 days) so reminders fire
  {
    name: "Tomás Alvarez",
    project: "developer tools for AI agents",
    company: "Independent",
    context: "Open-source contributor, looking for cofounders.",
    tags: ["devtools", "ai", "open-source"],
    daysAgo: 45,
    note: "Met at a hackathon. Want to revisit the cofounder conversation in Q2.",
  },
  {
    name: "Avery Cole",
    project: "founder community ops",
    company: "On Deck",
    context: "Community manager. Useful for warm intros across cohorts.",
    tags: ["community", "ops"],
    daysAgo: 60,
    note: "Last touched at Founder Friday. Owe her a follow-up about the speaker series.",
  },
  {
    name: "Riku Yamada",
    project: "robotics + perception",
    company: "Stealth",
    context: "Hardware founder, looking for an AI advisor for spatial agents.",
    tags: ["robotics", "ai", "hardware"],
    daysAgo: 90,
    note: "Met at Tokyo meetup. Quiet for months — should ping with the new memory demo.",
  },
];

const USER_POSTS: SeedPost[] = [
  {
    content:
      "Looking for a design partner who's building B2B sales tooling. We just shipped a memory layer for outbound reps and want feedback from teams >10 AEs.",
    attachments: [
      { kind: "link", url: "https://www.lennysnewsletter.com/p/finding-design-partners" },
    ],
  },
  {
    content:
      "Quick ask — anyone know a great fractional CTO with Postgres + AI infra experience? Backing a stealth team, intros appreciated.",
  },
  {
    content: "Mood board for our new contact-detail page. Going for calm, info-dense, no clutter.",
    attachments: [
      {
        kind: "image",
        sourceUrl:
          "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1200&q=80&fm=jpg",
        mimeType: "image/jpeg",
        caption: "Calm minimalist workspace inspiration",
      },
    ],
  },
];

// Convert a SeedPost's attachments into runtime PostAttachment[].
// Image / video sources are downloaded and pushed to our object storage so the
// resulting post objectPath is served from /api/storage/objects/...
async function materializeAttachments(
  post: SeedPost,
  storage: ObjectStorageService,
): Promise<PostAttachment[]> {
  const out: PostAttachment[] = [];
  for (const a of post.attachments ?? []) {
    if (a.kind === "link") {
      out.push({ type: "link", url: a.url });
      continue;
    }
    // image | video — fetch + upload
    const data = await downloadFromUrl(a.sourceUrl);
    if (!data) {
      // Fall back to a link attachment so the post still has something to render.
      out.push({ type: "link", url: a.sourceUrl });
      continue;
    }
    const mime =
      data.contentType !== "application/octet-stream"
        ? data.contentType
        : a.mimeType ?? (a.kind === "image" ? "image/jpeg" : "video/mp4");
    const objectPath = await storage.uploadBuffer(data.buffer, mime);
    out.push({ type: a.kind, objectPath, mimeType: mime, caption: a.caption });
  }
  return out;
}

router.post("/dev/seed", requireAuth, async (req, res) => {
  if (process.env.NODE_ENV === "production") {
    res.status(403).json({ error: "Seed endpoint is disabled in production" });
    return;
  }
  const userId = req.userId!;
  const summary = {
    contacts: 0,
    interactions: 0,
    posts: 0,
    peers: 0,
    peerPosts: 0,
    remindersFlagged: 0,
  };

  // 1. Seed peers (idempotent on id)
  for (const peer of PEERS) {
    if (peer.id === userId) continue;
    await db
      .insert(usersTable)
      .values({ id: peer.id, name: peer.name, email: peer.email })
      .onConflictDoNothing();
    summary.peers++;
    // Each peer gets contacts
    const existing = await db
      .select({ id: contactsTable.id })
      .from(contactsTable)
      .where(eq(contactsTable.userId, peer.id))
      .limit(1);
    if (existing.length === 0) {
      await db.insert(contactsTable).values(
        peer.contacts.map((c) => ({
          userId: peer.id,
          name: c.name,
          project: c.project,
          company: c.company,
          context: c.context,
          tags: c.tags,
          lastInteractionAt: new Date(Date.now() - 7 * 86400000),
        })),
      );
    }
  }

  // 2. Seed the active user's contacts + interactions
  for (const c of USER_CONTACTS) {
    const last = new Date(Date.now() - c.daysAgo * 86400000);
    const [created] = await db
      .insert(contactsTable)
      .values({
        userId,
        name: c.name,
        project: c.project,
        company: c.company,
        context: c.context,
        tags: c.tags,
        lastInteractionAt: last,
      })
      .returning();
    summary.contacts++;
    await db.insert(interactionsTable).values({
      userId,
      contactId: created.id,
      content: c.note,
      source: "seed",
      occurredAt: last,
    });
    summary.interactions++;
  }

  const storage = new ObjectStorageService();

  // 3. Seed peer posts so the active user sees Hub matches.
  //    createHubPost handles attachment enrichment + semantic fan-out internally.
  for (const peer of PEERS) {
    for (const sp of peer.posts) {
      const attachments = await materializeAttachments(sp, storage);
      await createHubPost(peer.id, sp.content, attachments);
      summary.peerPosts++;
    }
  }

  // 4. Seed the active user's own posts (fan out to peers)
  for (const sp of USER_POSTS) {
    const attachments = await materializeAttachments(sp, storage);
    await createHubPost(userId, sp.content, attachments);
    summary.posts++;
  }

  // 5. Embed all newly seeded contacts + interactions (idempotent — only fills nulls).
  await backfillEmbeddings();

  // 6. Run reminders to surface the stale contacts
  const r = await evaluateReminders(userId);
  summary.remindersFlagged = r.flagged;

  res.json({ ok: true, summary });
});

router.post("/dev/seed/clear", requireAuth, async (req, res) => {
  if (process.env.NODE_ENV === "production") {
    res.status(403).json({ error: "Seed endpoint is disabled in production" });
    return;
  }
  const userId = req.userId!;
  // Active user's data
  await db.delete(notificationsTable).where(eq(notificationsTable.userId, userId));
  await db.delete(interactionsTable).where(eq(interactionsTable.userId, userId));
  await db.delete(contactsTable).where(eq(contactsTable.userId, userId));
  await db.delete(postsTable).where(eq(postsTable.authorId, userId));
  // Synthetic peers and their data
  const peerIds = PEERS.map((p) => p.id);
  await db.delete(notificationsTable).where(inArray(notificationsTable.userId, peerIds));
  await db.delete(interactionsTable).where(inArray(interactionsTable.userId, peerIds));
  await db.delete(contactsTable).where(inArray(contactsTable.userId, peerIds));
  await db.delete(postsTable).where(inArray(postsTable.authorId, peerIds));
  await db.delete(usersTable).where(and(like(usersTable.id, `${PEER_PREFIX}%`)));
  res.json({ ok: true });
});

export default router;
