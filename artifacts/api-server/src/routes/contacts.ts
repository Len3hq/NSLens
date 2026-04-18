import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { db, contactsTable, interactionsTable, notificationsTable } from "@workspace/db";
import { and, eq, desc, ilike, or, sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/contacts", requireAuth, async (req, res) => {
  const q = (req.query.q as string | undefined)?.trim();
  const where = q
    ? and(
        eq(contactsTable.userId, req.userId!),
        or(
          ilike(contactsTable.name, `%${q}%`),
          ilike(contactsTable.project, `%${q}%`),
          ilike(contactsTable.company, `%${q}%`),
          ilike(contactsTable.context, `%${q}%`),
          sql`array_to_string(${contactsTable.tags}, ' ') ILIKE ${`%${q}%`}`,
        ),
      )
    : eq(contactsTable.userId, req.userId!);
  const rows = await db
    .select()
    .from(contactsTable)
    .where(where)
    .orderBy(desc(contactsTable.lastInteractionAt), desc(contactsTable.createdAt));
  res.json(rows);
});

function cleanHandle(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim().replace(/^@+/, "");
  return t || null;
}

router.post("/contacts", requireAuth, async (req, res) => {
  const { name, project, company, context, tags, email, telegramUsername, xUsername, discordUsername } =
    req.body ?? {};
  if (!name || typeof name !== "string") {
    res.status(400).json({ error: "name is required" });
    return;
  }
  const [created] = await db
    .insert(contactsTable)
    .values({
      userId: req.userId!,
      name: name.trim(),
      project: project ?? null,
      company: company ?? null,
      context: context ?? null,
      email: typeof email === "string" ? email.trim() || null : null,
      telegramUsername: cleanHandle(telegramUsername),
      xUsername: cleanHandle(xUsername),
      discordUsername: cleanHandle(discordUsername),
      tags: Array.isArray(tags) ? tags : [],
    })
    .returning();
  res.status(201).json(created);
});

router.get("/contacts/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const [contact] = await db
    .select()
    .from(contactsTable)
    .where(and(eq(contactsTable.id, id), eq(contactsTable.userId, req.userId!)))
    .limit(1);
  if (!contact) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const interactions = await db
    .select()
    .from(interactionsTable)
    .where(eq(interactionsTable.contactId, id))
    .orderBy(desc(interactionsTable.occurredAt));
  res.json({ ...contact, interactions });
});

router.patch("/contacts/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const { name, project, company, context, tags, email, telegramUsername, xUsername, discordUsername } =
    req.body ?? {};
  const update: Record<string, unknown> = {};
  if (name !== undefined) update.name = name;
  if (project !== undefined) update.project = project;
  if (company !== undefined) update.company = company;
  if (context !== undefined) update.context = context;
  if (email !== undefined) update.email = typeof email === "string" ? email.trim() || null : null;
  if (telegramUsername !== undefined) update.telegramUsername = cleanHandle(telegramUsername);
  if (xUsername !== undefined) update.xUsername = cleanHandle(xUsername);
  if (discordUsername !== undefined) update.discordUsername = cleanHandle(discordUsername);
  if (tags !== undefined) update.tags = Array.isArray(tags) ? tags : [];
  const [updated] = await db
    .update(contactsTable)
    .set(update)
    .where(and(eq(contactsTable.id, id), eq(contactsTable.userId, req.userId!)))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(updated);
});

router.delete("/contacts/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  // Verify ownership before cascading
  const [owner] = await db
    .select({ id: contactsTable.id })
    .from(contactsTable)
    .where(and(eq(contactsTable.id, id), eq(contactsTable.userId, req.userId!)))
    .limit(1);
  if (!owner) {
    res.status(404).end();
    return;
  }
  await db.delete(interactionsTable).where(eq(interactionsTable.contactId, id));
  await db
    .delete(notificationsTable)
    .where(and(eq(notificationsTable.userId, req.userId!), eq(notificationsTable.contactId, id)));
  await db
    .delete(contactsTable)
    .where(and(eq(contactsTable.id, id), eq(contactsTable.userId, req.userId!)));
  res.status(204).end();
});

export default router;
