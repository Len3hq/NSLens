import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { db, followUpsTable, contactsTable } from "@workspace/db";
import { and, asc, desc, eq, isNull, lte, isNotNull } from "drizzle-orm";

const router: IRouter = Router();

// ---- list (default: open follow-ups, ordered by due date) ----
router.get("/followups", requireAuth, async (req, res) => {
  const includeDone = req.query.includeDone === "1" || req.query.includeDone === "true";
  const where = includeDone
    ? eq(followUpsTable.userId, req.userId!)
    : and(eq(followUpsTable.userId, req.userId!), isNull(followUpsTable.completedAt));
  const rows = await db
    .select({
      id: followUpsTable.id,
      contactId: followUpsTable.contactId,
      dueAt: followUpsTable.dueAt,
      note: followUpsTable.note,
      source: followUpsTable.source,
      completedAt: followUpsTable.completedAt,
      createdAt: followUpsTable.createdAt,
      contactName: contactsTable.name,
      contactProject: contactsTable.project,
      contactCompany: contactsTable.company,
    })
    .from(followUpsTable)
    .leftJoin(contactsTable, eq(contactsTable.id, followUpsTable.contactId))
    .where(where)
    .orderBy(asc(followUpsTable.dueAt));
  res.json(rows);
});

// ---- create ----
router.post("/followups", requireAuth, async (req, res) => {
  const { contactId, dueAt, note, source } = req.body ?? {};
  const cid = Number(contactId);
  if (!Number.isFinite(cid)) {
    res.status(400).json({ error: "contactId is required" });
    return;
  }
  const due = dueAt ? new Date(dueAt) : null;
  if (!due || Number.isNaN(due.getTime())) {
    res.status(400).json({ error: "dueAt is required (ISO date)" });
    return;
  }
  // Verify the contact belongs to the user.
  const [c] = await db
    .select({ id: contactsTable.id })
    .from(contactsTable)
    .where(and(eq(contactsTable.id, cid), eq(contactsTable.userId, req.userId!)))
    .limit(1);
  if (!c) {
    res.status(404).json({ error: "contact not found" });
    return;
  }
  const [created] = await db
    .insert(followUpsTable)
    .values({
      userId: req.userId!,
      contactId: cid,
      dueAt: due,
      note: typeof note === "string" ? note : null,
      source: source === "agent" || source === "ai" ? "agent" : "manual",
    })
    .returning();
  res.status(201).json(created);
});

// ---- mark complete ----
router.post("/followups/:id/complete", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const [updated] = await db
    .update(followUpsTable)
    .set({ completedAt: new Date() })
    .where(and(eq(followUpsTable.id, id), eq(followUpsTable.userId, req.userId!)))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(updated);
});

// ---- delete ----
router.delete("/followups/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  await db
    .delete(followUpsTable)
    .where(and(eq(followUpsTable.id, id), eq(followUpsTable.userId, req.userId!)));
  res.status(204).end();
});

// ---- per-contact list ----
router.get("/contacts/:id/followups", requireAuth, async (req, res) => {
  const cid = Number(req.params.id);
  const [c] = await db
    .select({ id: contactsTable.id })
    .from(contactsTable)
    .where(and(eq(contactsTable.id, cid), eq(contactsTable.userId, req.userId!)))
    .limit(1);
  if (!c) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const rows = await db
    .select()
    .from(followUpsTable)
    .where(and(eq(followUpsTable.contactId, cid), eq(followUpsTable.userId, req.userId!)))
    .orderBy(desc(followUpsTable.dueAt));
  res.json(rows);
});

export default router;

// ---- helpers used by other routes ----
export async function listDueFollowUps(userId: string, withinDays = 0): Promise<
  Array<{
    id: number;
    contactId: number;
    dueAt: Date;
    note: string | null;
    contactName: string | null;
  }>
> {
  const cutoff = new Date(Date.now() + withinDays * 24 * 60 * 60 * 1000);
  return db
    .select({
      id: followUpsTable.id,
      contactId: followUpsTable.contactId,
      dueAt: followUpsTable.dueAt,
      note: followUpsTable.note,
      contactName: contactsTable.name,
    })
    .from(followUpsTable)
    .leftJoin(contactsTable, eq(contactsTable.id, followUpsTable.contactId))
    .where(
      and(
        eq(followUpsTable.userId, userId),
        isNull(followUpsTable.completedAt),
        lte(followUpsTable.dueAt, cutoff),
      ),
    )
    .orderBy(asc(followUpsTable.dueAt));
}

export async function listAllFutureFollowUps(userId: string) {
  return db
    .select({
      id: followUpsTable.id,
      contactId: followUpsTable.contactId,
      dueAt: followUpsTable.dueAt,
      note: followUpsTable.note,
      completedAt: followUpsTable.completedAt,
      contactName: contactsTable.name,
    })
    .from(followUpsTable)
    .leftJoin(contactsTable, eq(contactsTable.id, followUpsTable.contactId))
    .where(and(eq(followUpsTable.userId, userId), isNotNull(followUpsTable.dueAt)))
    .orderBy(asc(followUpsTable.dueAt));
}
