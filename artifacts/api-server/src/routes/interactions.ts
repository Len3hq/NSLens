import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { db, contactsTable, interactionsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";

const router: IRouter = Router();

router.post("/contacts/:id/interactions", requireAuth, async (req, res) => {
  const contactId = Number(req.params.id);
  const { content, source } = req.body ?? {};
  if (!content || typeof content !== "string") {
    res.status(400).json({ error: "content is required" });
    return;
  }
  const [contact] = await db
    .select()
    .from(contactsTable)
    .where(and(eq(contactsTable.id, contactId), eq(contactsTable.userId, req.userId!)))
    .limit(1);
  if (!contact) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const now = new Date();
  const [interaction] = await db
    .insert(interactionsTable)
    .values({
      userId: req.userId!,
      contactId,
      content,
      source: source ?? "note",
      occurredAt: now,
    })
    .returning();
  await db
    .update(contactsTable)
    .set({ lastInteractionAt: now })
    .where(and(eq(contactsTable.id, contactId), eq(contactsTable.userId, req.userId!)));
  res.status(201).json(interaction);
});

export default router;
