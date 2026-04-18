import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { openai, CHAT_MODEL } from "../lib/openai";
import { extractFromText, persistEntities } from "./ingest";
import { answerWithMemory } from "./chat";
import { createHubPost } from "./hub";

const router: IRouter = Router();

const ROUTER_PROMPT = `You are an intent router for a personal CRM agent. Classify the user's message into one of:
- INGEST: they're describing people they met / interacted with / want to remember (notes, transcripts, lists of names, "I just met X", etc.)
- QUERY: they're asking a question about their network / contacts / past interactions
- POST: they explicitly want to publish/share a public update or ask for help to their hub feed (e.g. "post to hub", "share this", "broadcast", "ask my network")
- UNKNOWN: anything else

Reply with strict JSON: { "intent": "INGEST" | "QUERY" | "POST" | "UNKNOWN", "reason": "..." }`;

export type AgentIntent = "INGEST" | "QUERY" | "POST" | "UNKNOWN";

async function classifyIntent(message: string): Promise<AgentIntent> {
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

export async function runAgent(
  userId: string,
  message: string,
): Promise<{ intent: AgentIntent; reply: string; result: Record<string, unknown> }> {
  const intent = await classifyIntent(message);
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
    // Strip a leading "post:" prefix if present.
    const cleaned = message.replace(/^\s*post\s*:\s*/i, "").trim();
    const created = await createHubPost(userId, cleaned, []);
    return {
      intent,
      reply: `Posted to the Founders Hub. Your network will be notified if relevant.`,
      result: created,
    };
  }
  return {
    intent: "UNKNOWN",
    reply:
      "I'm not sure what you want me to do. Try giving me notes about people you met, asking a question about your network, or saying 'post to hub: ...'.",
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
