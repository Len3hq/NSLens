import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { openai, CHAT_MODEL } from "../lib/openai";
import { extractFromText, persistEntities } from "./ingest";
import { answerWithMemory } from "./chat";
import { db, postsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { fanOutPost } from "./hub";

const router: IRouter = Router();

const ROUTER_PROMPT = `You are an intent router for a personal CRM agent. Classify the user's message into one of:
- INGEST: they're describing people they met / interacted with / want to remember (notes, transcripts, lists of names, "I just met X", etc.)
- QUERY: they're asking a question about their network / contacts / past interactions
- POST: they explicitly want to publish/share a public update or ask for help to their hub feed (e.g. "post to hub", "share this", "broadcast", "ask my network")
- UNKNOWN: anything else

Reply with strict JSON: { "intent": "INGEST" | "QUERY" | "POST" | "UNKNOWN", "reason": "..." }`;

async function classifyIntent(message: string): Promise<"INGEST" | "QUERY" | "POST" | "UNKNOWN"> {
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
    const intent = parsed.intent;
    if (intent === "INGEST" || intent === "QUERY" || intent === "POST" || intent === "UNKNOWN") {
      return intent;
    }
    return "UNKNOWN";
  } catch {
    return "UNKNOWN";
  }
}

router.post("/agent", requireAuth, async (req, res) => {
  const { message } = req.body ?? {};
  if (!message || typeof message !== "string") {
    res.status(400).json({ error: "message is required" });
    return;
  }
  const intent = await classifyIntent(message);
  if (intent === "INGEST") {
    const entities = await extractFromText(message);
    const { created, updated } = await persistEntities(req.userId!, entities, message, "agent");
    const reply = entities.length
      ? `Saved ${created.length} new contact${created.length === 1 ? "" : "s"}${updated.length ? ` and updated ${updated.length}` : ""}: ${[...created, ...updated].map((c) => c.name).join(", ")}.`
      : `I couldn't find anyone to save in that message. Try mentioning specific names.`;
    res.json({ intent, reply, result: { created, updated, rawExtraction: entities } });
    return;
  }
  if (intent === "QUERY") {
    const result = await answerWithMemory(req.userId!, message);
    res.json({ intent, reply: result.answer, result: { sources: result.sources } });
    return;
  }
  if (intent === "POST") {
    const [post] = await db
      .insert(postsTable)
      .values({ authorId: req.userId!, content: message.trim() })
      .returning();
    const [author] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, req.userId!))
      .limit(1);
    fanOutPost({
      id: post.id,
      authorId: post.authorId,
      content: post.content,
      authorName: author?.name ?? author?.email ?? "Someone",
    }).catch((err) => req.log?.error({ err }, "agent fan-out failed"));
    res.json({
      intent,
      reply: `Posted to the Founders Hub. Your network will be notified if relevant.`,
      result: {
        id: post.id,
        authorId: post.authorId,
        authorName: author?.name ?? author?.email ?? "You",
        content: post.content,
        createdAt: post.createdAt,
      },
    });
    return;
  }
  res.json({
    intent: "UNKNOWN",
    reply: "I'm not sure what you want me to do. Try giving me notes about people you met, asking a question about your network, or saying 'post to hub: ...'.",
    result: {},
  });
});

export default router;
