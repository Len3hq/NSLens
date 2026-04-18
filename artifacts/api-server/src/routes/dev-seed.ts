import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import {
  db,
  contactsTable,
  interactionsTable,
  notificationsTable,
  postsTable,
  usersTable,
} from "@workspace/db";
import { and, eq, inArray, like } from "drizzle-orm";
import { fanOutPost } from "./hub";
import { evaluateReminders } from "./reminders";

const router: IRouter = Router();

// Synthetic peer users (id prefix used so we can easily wipe them).
const PEER_PREFIX = "seed_peer_";
const PEERS = [
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
      "Looking for a CTO with infra experience to join my pre-seed. Building agentic memory systems for sales teams. DM me.",
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
      "Anyone here built evals for an LLM router? We're seeing weird drift on classification accuracy and could use a second pair of eyes.",
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

const USER_POSTS = [
  "Looking for a design partner who's building B2B sales tooling. We just shipped a memory layer for outbound reps and want feedback from teams >10 AEs.",
  "Quick ask — anyone know a great fractional CTO with Postgres + AI infra experience? Backing a stealth team, intros appreciated.",
];

router.post("/dev/seed", requireAuth, async (req, res) => {
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

  // 3. Seed peer posts so the active user sees Hub matches
  for (const peer of PEERS) {
    for (const content of peer.posts) {
      const [post] = await db
        .insert(postsTable)
        .values({ authorId: peer.id, content })
        .returning();
      summary.peerPosts++;
      // Fan-out so the active user gets relevant notifications
      await fanOutPost({
        id: post.id,
        authorId: post.authorId,
        content: post.content,
        authorName: peer.name,
      });
    }
  }

  // 4. Seed the active user's own posts (fan out to peers)
  const [me] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  for (const content of USER_POSTS) {
    const [post] = await db
      .insert(postsTable)
      .values({ authorId: userId, content })
      .returning();
    summary.posts++;
    await fanOutPost({
      id: post.id,
      authorId: post.authorId,
      content: post.content,
      authorName: me?.name ?? me?.email ?? "You",
    });
  }

  // 5. Run reminders to surface the stale contacts
  const r = await evaluateReminders(userId);
  summary.remindersFlagged = r.flagged;

  res.json({ ok: true, summary });
});

router.post("/dev/seed/clear", requireAuth, async (req, res) => {
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
