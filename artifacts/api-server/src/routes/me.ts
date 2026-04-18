import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/me", requireAuth, async (req, res) => {
  const rows = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
  const u = rows[0];
  res.json({ id: req.userId, email: u?.email ?? null, name: u?.name ?? null });
});

export default router;
