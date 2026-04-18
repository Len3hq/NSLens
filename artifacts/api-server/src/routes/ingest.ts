import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { db, contactsTable, interactionsTable, type Contact } from "@workspace/db";
import { and, eq, ilike } from "drizzle-orm";
import { openai, CHAT_MODEL } from "../lib/openai";
import { embedAndSetContact, embedAndSetInteraction } from "../lib/embeddings";

const router: IRouter = Router();

type ExtractedEntity = {
  name: string;
  project?: string | null;
  company?: string | null;
  context?: string | null;
  date?: string | null;
};

const EXTRACTION_PROMPT = `You are an entity extractor for a personal CRM called "Network Brain".
Given free-form text from the user (notes, transcripts, screenshots), identify each PERSON they met or interacted with.
For each person, extract:
- name (required, full name as written)
- project (any project, idea, or initiative associated with them)
- company (organization, school, or affiliation)
- context (where/how they were met or any defining detail)
- date (ISO 8601 date if any time/date is mentioned, else null)

Return strict JSON: { "people": [ { "name": "...", "project": "...", "company": "...", "context": "...", "date": "..." } ] }
If no people found, return { "people": [] }. Do not include any other text.`;

async function extractFromText(text: string): Promise<ExtractedEntity[]> {
  const completion = await openai.chat.completions.create({
    model: CHAT_MODEL,
    messages: [
      { role: "system", content: EXTRACTION_PROMPT },
      { role: "user", content: text },
    ],
    response_format: { type: "json_object" },
  });
  const raw = completion.choices[0]?.message?.content ?? "{}";
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.people) ? parsed.people : [];
  } catch {
    return [];
  }
}

async function extractFromImage(imageDataUrl: string): Promise<ExtractedEntity[]> {
  const completion = await openai.chat.completions.create({
    model: CHAT_MODEL,
    messages: [
      { role: "system", content: EXTRACTION_PROMPT },
      {
        role: "user",
        content: [
          { type: "text", text: "Extract people from this image (it may be a screenshot of a chat, business card, conference badge, or similar)." },
          { type: "image_url", image_url: { url: imageDataUrl } },
        ],
      },
    ],
    response_format: { type: "json_object" },
  });
  const raw = completion.choices[0]?.message?.content ?? "{}";
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.people) ? parsed.people : [];
  } catch {
    return [];
  }
}

async function persistEntities(
  userId: string,
  entities: ExtractedEntity[],
  rawText: string,
  source: string,
): Promise<{ created: Contact[]; updated: Contact[] }> {
  const created: Contact[] = [];
  const updated: Contact[] = [];
  for (const e of entities) {
    if (!e.name) continue;
    const [existing] = await db
      .select()
      .from(contactsTable)
      .where(and(eq(contactsTable.userId, userId), ilike(contactsTable.name, e.name)))
      .limit(1);
    const occurredAt = e.date ? new Date(e.date) : new Date();
    const validDate = isNaN(occurredAt.getTime()) ? new Date() : occurredAt;
    if (existing) {
      const [u] = await db
        .update(contactsTable)
        .set({
          project: existing.project ?? e.project ?? null,
          company: existing.company ?? e.company ?? null,
          context: existing.context ?? e.context ?? null,
          lastInteractionAt: validDate,
        })
        .where(and(eq(contactsTable.id, existing.id), eq(contactsTable.userId, userId)))
        .returning();
      updated.push(u);
      const [interaction] = await db
        .insert(interactionsTable)
        .values({
          userId,
          contactId: existing.id,
          content: rawText.slice(0, 4000),
          source,
          occurredAt: validDate,
        })
        .returning();
      // Re-embed the contact (any field may have changed) and embed the new interaction.
      embedAndSetContact(u.id).catch((err) =>
        console.error("embed contact failed", { contactId: u.id, err }),
      );
      embedAndSetInteraction(interaction.id).catch((err) =>
        console.error("embed interaction failed", { interactionId: interaction.id, err }),
      );
    } else {
      const [c] = await db
        .insert(contactsTable)
        .values({
          userId,
          name: e.name,
          project: e.project ?? null,
          company: e.company ?? null,
          context: e.context ?? null,
          tags: [],
          lastInteractionAt: validDate,
        })
        .returning();
      created.push(c);
      const [interaction] = await db
        .insert(interactionsTable)
        .values({
          userId,
          contactId: c.id,
          content: rawText.slice(0, 4000),
          source,
          occurredAt: validDate,
        })
        .returning();
      embedAndSetContact(c.id).catch((err) =>
        console.error("embed contact failed", { contactId: c.id, err }),
      );
      embedAndSetInteraction(interaction.id).catch((err) =>
        console.error("embed interaction failed", { interactionId: interaction.id, err }),
      );
    }
  }
  return { created, updated };
}

router.post("/ingest/text", requireAuth, async (req, res) => {
  const { text } = req.body ?? {};
  if (!text || typeof text !== "string") {
    res.status(400).json({ error: "text is required" });
    return;
  }
  const entities = await extractFromText(text);
  const { created, updated } = await persistEntities(req.userId!, entities, text, "text");
  res.json({ created, updated, rawExtraction: entities });
});

router.post("/ingest/image", requireAuth, async (req, res) => {
  const { image } = req.body ?? {};
  if (!image || typeof image !== "string") {
    res.status(400).json({ error: "image (data URL) is required" });
    return;
  }
  const entities = await extractFromImage(image);
  const { created, updated } = await persistEntities(
    req.userId!,
    entities,
    "[image upload]",
    "image",
  );
  res.json({ created, updated, rawExtraction: entities });
});

export { extractFromText, persistEntities };
export default router;
