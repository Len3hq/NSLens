import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { db, notificationsTable } from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/notifications", requireAuth, async (req, res) => {
  const rows = await db
    .select()
    .from(notificationsTable)
    .where(eq(notificationsTable.userId, req.userId!))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(100);
  res.json(rows);
});

router.patch("/notifications/:id/read", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const [updated] = await db
    .update(notificationsTable)
    .set({ readAt: new Date() })
    .where(and(eq(notificationsTable.id, id), eq(notificationsTable.userId, req.userId!)))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(updated);
});

export default router;
