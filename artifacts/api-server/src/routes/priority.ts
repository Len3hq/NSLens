import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { db, contactsTable, interactionsTable } from "@workspace/db";
import { and, eq, sql, desc } from "drizzle-orm";

const router: IRouter = Router();

// "Who matters" — a lightweight signal that combines:
//  - manual `starred` (huge boost)
//  - recency of last interaction (decays over 90 days)
//  - total interaction count (capped, log-ish)
//
// Computed in SQL so the list scales as the user grows.
router.get("/contacts/priority", requireAuth, async (req, res) => {
  const limit = Math.min(Number(req.query.limit ?? 20) || 20, 100);
  const rows = await db
    .select({
      id: contactsTable.id,
      name: contactsTable.name,
      project: contactsTable.project,
      company: contactsTable.company,
      tags: contactsTable.tags,
      starred: contactsTable.starred,
      lastInteractionAt: contactsTable.lastInteractionAt,
      interactionCount: sql<number>`(
        SELECT COUNT(*)::int FROM ${interactionsTable}
        WHERE ${interactionsTable.contactId} = ${contactsTable.id}
      )`.as("interaction_count"),
      score: sql<number>`(
        (CASE WHEN ${contactsTable.starred} THEN 3.0 ELSE 0 END)
        + LEAST(2.0, LN(1 + (
            SELECT COUNT(*)::int FROM ${interactionsTable}
            WHERE ${interactionsTable.contactId} = ${contactsTable.id}
          )))
        + GREATEST(0, 1.0 - (
            EXTRACT(EPOCH FROM (NOW() - COALESCE(${contactsTable.lastInteractionAt}, ${contactsTable.createdAt})))
            / (90 * 24 * 60 * 60)
          ))
      )`.as("score"),
    })
    .from(contactsTable)
    .where(eq(contactsTable.userId, req.userId!))
    .orderBy(desc(sql`score`))
    .limit(limit);
  res.json(rows);
});

router.post("/contacts/:id/star", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const starred = !!(req.body ?? {}).starred;
  const [updated] = await db
    .update(contactsTable)
    .set({ starred })
    .where(and(eq(contactsTable.id, id), eq(contactsTable.userId, req.userId!)))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(updated);
});

export default router;
