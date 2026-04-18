import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { db, contactsTable, interactionsTable } from "@workspace/db";
import { and, eq, ilike, or, sql, desc } from "drizzle-orm";
import { openai, CHAT_MODEL } from "../lib/openai";

const router: IRouter = Router();

type Source = {
  kind: "contact" | "interaction";
  contactId: number;
  contactName: string;
  snippet: string;
};

export async function searchMemory(userId: string, query: string) {
  // Tokenize query into significant words (simple stopword filter)
  const stop = new Set([
    "the","a","an","is","are","was","were","i","me","my","you","your","who","what",
    "where","when","why","how","do","does","did","know","met","about","with","and",
    "or","of","to","in","on","at","for","that","this","tell","find","looking","help",
  ]);
  const tokens = query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2 && !stop.has(t));
  const terms = tokens.length ? tokens : [query.trim()].filter(Boolean);

  // Match contacts where any field or tag contains any term
  const contactConds = terms.flatMap((t) => [
    ilike(contactsTable.name, `%${t}%`),
    ilike(contactsTable.project, `%${t}%`),
    ilike(contactsTable.company, `%${t}%`),
    ilike(contactsTable.context, `%${t}%`),
    sql`array_to_string(${contactsTable.tags}, ' ') ILIKE ${`%${t}%`}`,
  ]);
  const matchedContacts = contactConds.length
    ? await db
        .select()
        .from(contactsTable)
        .where(and(eq(contactsTable.userId, userId), or(...contactConds)))
        .limit(8)
    : [];

  const interactionConds = terms.map((t) => ilike(interactionsTable.content, `%${t}%`));
  const matchedInteractions = interactionConds.length
    ? await db
        .select({
          id: interactionsTable.id,
          contactId: interactionsTable.contactId,
          content: interactionsTable.content,
          occurredAt: interactionsTable.occurredAt,
          contactName: contactsTable.name,
        })
        .from(interactionsTable)
        .innerJoin(contactsTable, eq(contactsTable.id, interactionsTable.contactId))
        .where(and(eq(interactionsTable.userId, userId), or(...interactionConds)))
        .orderBy(desc(interactionsTable.occurredAt))
        .limit(10)
    : [];

  const sources: Source[] = [];
  for (const c of matchedContacts) {
    sources.push({
      kind: "contact",
      contactId: c.id,
      contactName: c.name,
      snippet: [c.project, c.company, c.context, (c.tags ?? []).join(", ")]
        .filter(Boolean)
        .join(" • "),
    });
  }
  for (const i of matchedInteractions) {
    sources.push({
      kind: "interaction",
      contactId: i.contactId,
      contactName: i.contactName,
      snippet: i.content.slice(0, 240),
    });
  }
  return sources;
}

export async function answerWithMemory(userId: string, message: string) {
  const sources = await searchMemory(userId, message);

  // Baseline: always include a roster of the user's contacts so generic
  // questions like "who's in my network?" work even when keyword search
  // returns nothing.
  const allContacts = await db
    .select()
    .from(contactsTable)
    .where(eq(contactsTable.userId, userId))
    .orderBy(desc(contactsTable.lastInteractionAt))
    .limit(50);
  const totalContacts = allContacts.length;
  const rosterLines = allContacts.map(
    (c) =>
      `- ${c.name}${c.project ? ` — ${c.project}` : ""}${c.company ? ` @ ${c.company}` : ""}${c.context ? ` (${c.context})` : ""}${(c.tags ?? []).length ? ` [${(c.tags ?? []).join(", ")}]` : ""}`,
  );
  const roster = rosterLines.length
    ? rosterLines.join("\n")
    : "(the user has no saved contacts yet)";

  const matches = sources.length
    ? sources
        .map((s, idx) => `[${idx + 1}] (${s.kind}) ${s.contactName} — ${s.snippet}`)
        .join("\n")
    : "(no specific keyword matches)";

  const systemPrompt = `You are Network Brain, a personal CRM assistant. Answer the user's question grounded in the memory below. Always cite people by name. The CONTACT ROSTER is the authoritative list of everyone the user knows; use it for any "who do I know / list my network / who works on X" question. Use SPECIFIC MATCHES for additional context from past notes. Only say memory is empty if the roster itself is empty. Be concise.

CONTACT ROSTER (${totalContacts} total):
${roster}

SPECIFIC MATCHES:
${matches}`;
  const completion = await openai.chat.completions.create({
    model: CHAT_MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: message },
    ],
  });
  const answer = completion.choices[0]?.message?.content ?? "I couldn't generate a response.";
  return { answer, sources };
}

router.post("/chat", requireAuth, async (req, res) => {
  const { message } = req.body ?? {};
  if (!message || typeof message !== "string") {
    res.status(400).json({ error: "message is required" });
    return;
  }
  const result = await answerWithMemory(req.userId!, message);
  res.json(result);
});

export default router;
