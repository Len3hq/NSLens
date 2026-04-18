import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { openai, CHAT_MODEL } from "../lib/openai";
import { extractFromText, persistEntities } from "./ingest";
import { answerWithMemory } from "./chat";
import { createHubPost } from "./hub";
import { db, contactsTable, followUpsTable } from "@workspace/db";
import { and, eq, ilike, isNull, asc, sql } from "drizzle-orm";

const router: IRouter = Router();

const ROUTER_PROMPT = `You are an intent router for a personal CRM agent. Classify the user's message into one of:
- INGEST: they're describing people they met / interacted with / want to remember (notes, transcripts, lists of names, "I just met X").
- QUERY: they're asking a question about their network / contacts / past interactions.
- POST: they explicitly want to publish/share a public update or ask their hub feed (e.g. "post to hub", "share this", "broadcast", "ask my network").
- FOLLOWUP_SET: they want to schedule a follow-up with a specific contact (e.g. "remind me to email Sara next Tuesday", "follow up with Tom in 3 days").
- FOLLOWUP_LIST: they want to see their upcoming follow-ups ("what's on my agenda", "follow-ups due", "who am I supposed to reach out to").
- PRIORITY: they want to know who matters most in their network ("top contacts", "who should I focus on", "who matters most").
- TAG_LIST: they want to list contacts that match a tag ("show me my investors", "list designers I know").
- UNKNOWN: anything else.

Reply with strict JSON. For FOLLOWUP_SET also include "contactName" (the name to look up) and "dueAt" (ISO date in UTC). Today is ${new Date().toISOString().slice(0, 10)}; resolve relative dates accordingly. For TAG_LIST include "tag". Examples:
{ "intent": "FOLLOWUP_SET", "contactName": "Sara", "dueAt": "2026-04-25T15:00:00Z", "note": "send the deck" }
{ "intent": "TAG_LIST", "tag": "investor" }
{ "intent": "QUERY" }`;

export type AgentIntent =
  | "INGEST"
  | "QUERY"
  | "POST"
  | "FOLLOWUP_SET"
  | "FOLLOWUP_LIST"
  | "PRIORITY"
  | "TAG_LIST"
  | "UNKNOWN";

type Routed = {
  intent: AgentIntent;
  contactName?: string;
  dueAt?: string;
  note?: string;
  tag?: string;
};

async function classifyIntent(message: string): Promise<Routed> {
  try {
    const completion = await openai.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        { role: "system", content: ROUTER_PROMPT },
        { role: "user", content: message },
      ],
      response_format: { type: "json_object" },
    });
    const parsed = JSON.parse(completion.choices[0]?.message?.content ?? "{}");
    const valid: AgentIntent[] = [
      "INGEST", "QUERY", "POST", "FOLLOWUP_SET", "FOLLOWUP_LIST", "PRIORITY", "TAG_LIST", "UNKNOWN",
    ];
    const intent: AgentIntent = valid.includes(parsed.intent) ? parsed.intent : "UNKNOWN";
    return {
      intent,
      contactName: typeof parsed.contactName === "string" ? parsed.contactName : undefined,
      dueAt: typeof parsed.dueAt === "string" ? parsed.dueAt : undefined,
      note: typeof parsed.note === "string" ? parsed.note : undefined,
      tag: typeof parsed.tag === "string" ? parsed.tag : undefined,
    };
  } catch {
    return { intent: "UNKNOWN" };
  }
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export async function runAgent(
  userId: string,
  message: string,
): Promise<{ intent: AgentIntent; reply: string; result: Record<string, unknown> }> {
  const routed = await classifyIntent(message);
  const intent = routed.intent;

  if (intent === "INGEST") {
    const entities = await extractFromText(message);
    const { created, updated } = await persistEntities(userId, entities, message, "agent");
    const reply = entities.length
      ? `Saved ${created.length} new contact${created.length === 1 ? "" : "s"}${updated.length ? ` and updated ${updated.length}` : ""}: ${[...created, ...updated].map((c) => c.name).join(", ")}.`
      : `I couldn't find anyone to save in that message. Try mentioning specific names.`;
    return { intent, reply, result: { created, updated, rawExtraction: entities } };
  }

  if (intent === "QUERY") {
    const result = await answerWithMemory(userId, message);
    return { intent, reply: result.answer, result: { sources: result.sources } };
  }

  if (intent === "POST") {
    const cleaned = message.replace(/^\s*post\s*:\s*/i, "").trim();
    const created = await createHubPost(userId, cleaned, []);
    return {
      intent,
      reply: `Posted to the Founders Hub. Your network will be notified if relevant.`,
      result: created,
    };
  }

  if (intent === "FOLLOWUP_SET") {
    if (!routed.contactName || !routed.dueAt) {
      return {
        intent,
        reply: "Tell me who to follow up with and when (e.g. 'remind me to email Sara next Tuesday').",
        result: {},
      };
    }
    const due = new Date(routed.dueAt);
    if (Number.isNaN(due.getTime())) {
      return { intent, reply: "I couldn't understand that date. Try a more specific one.", result: {} };
    }
    const [contact] = await db
      .select()
      .from(contactsTable)
      .where(and(eq(contactsTable.userId, userId), ilike(contactsTable.name, `%${routed.contactName}%`)))
      .limit(1);
    if (!contact) {
      return {
        intent,
        reply: `I don't have a contact matching "${routed.contactName}" in your CRM yet.`,
        result: {},
      };
    }
    const [created] = await db
      .insert(followUpsTable)
      .values({
        userId,
        contactId: contact.id,
        dueAt: due,
        note: routed.note ?? null,
        source: "agent",
      })
      .returning();
    return {
      intent,
      reply: `Got it — I'll remind you to follow up with ${contact.name} on ${fmtDate(due)}${routed.note ? ` (${routed.note})` : ""}.`,
      result: { followUp: created, contact },
    };
  }

  if (intent === "FOLLOWUP_LIST") {
    const rows = await db
      .select({
        id: followUpsTable.id,
        dueAt: followUpsTable.dueAt,
        note: followUpsTable.note,
        contactName: contactsTable.name,
      })
      .from(followUpsTable)
      .leftJoin(contactsTable, eq(contactsTable.id, followUpsTable.contactId))
      .where(and(eq(followUpsTable.userId, userId), isNull(followUpsTable.completedAt)))
      .orderBy(asc(followUpsTable.dueAt))
      .limit(10);
    if (!rows.length) return { intent, reply: "No open follow-ups. You're all clear.", result: { rows } };
    const lines = rows.map(
      (r) =>
        `• ${fmtDate(r.dueAt)} — ${r.contactName ?? "?"}${r.note ? `: ${r.note}` : ""}`,
    );
    return {
      intent,
      reply: `You have ${rows.length} follow-up${rows.length === 1 ? "" : "s"}:\n${lines.join("\n")}`,
      result: { rows },
    };
  }

  if (intent === "PRIORITY") {
    const rows = await db
      .select({
        id: contactsTable.id,
        name: contactsTable.name,
        project: contactsTable.project,
        company: contactsTable.company,
        starred: contactsTable.starred,
        lastInteractionAt: contactsTable.lastInteractionAt,
        score: sql<number>`(
          (CASE WHEN ${contactsTable.starred} THEN 3.0 ELSE 0 END)
          + GREATEST(0, 1.0 - (
              EXTRACT(EPOCH FROM (NOW() - COALESCE(${contactsTable.lastInteractionAt}, ${contactsTable.createdAt})))
              / (90 * 24 * 60 * 60)
            ))
        )`.as("score"),
      })
      .from(contactsTable)
      .where(eq(contactsTable.userId, userId))
      .orderBy(sql`score DESC`)
      .limit(8);
    if (!rows.length) return { intent, reply: "No contacts yet.", result: { rows } };
    const lines = rows.map(
      (r, i) =>
        `${i + 1}. ${r.starred ? "⭐ " : ""}${r.name}${r.project ? ` — ${r.project}` : ""}${r.company ? ` @ ${r.company}` : ""}`,
    );
    return {
      intent,
      reply: `Your top contacts right now:\n${lines.join("\n")}`,
      result: { rows },
    };
  }

  if (intent === "TAG_LIST") {
    if (!routed.tag) {
      return { intent, reply: "Which tag should I look up?", result: {} };
    }
    const tag = routed.tag.toLowerCase();
    const rows = await db
      .select({ id: contactsTable.id, name: contactsTable.name, project: contactsTable.project, company: contactsTable.company, tags: contactsTable.tags })
      .from(contactsTable)
      .where(
        and(
          eq(contactsTable.userId, userId),
          sql`EXISTS (SELECT 1 FROM unnest(${contactsTable.tags}) t WHERE lower(t) = ${tag})`,
        ),
      )
      .limit(20);
    if (!rows.length) return { intent, reply: `No contacts tagged "${tag}".`, result: { rows } };
    const lines = rows.map(
      (r) => `• ${r.name}${r.project ? ` — ${r.project}` : ""}${r.company ? ` @ ${r.company}` : ""}`,
    );
    return {
      intent,
      reply: `Contacts tagged "${tag}" (${rows.length}):\n${lines.join("\n")}`,
      result: { rows },
    };
  }

  return {
    intent: "UNKNOWN",
    reply:
      "I'm not sure what you want. Try: notes about people, a question about your network, 'post: …' for the hub, 'remind me to follow up with …', 'show my follow-ups', 'who matters most', or 'show my <tag> contacts'.",
    result: {},
  };
}

router.post("/agent", requireAuth, async (req, res) => {
  const { message } = req.body ?? {};
  if (!message || typeof message !== "string") {
    res.status(400).json({ error: "message is required" });
    return;
  }
  const result = await runAgent(req.userId!, message);
  res.json(result);
});

export default router;
